/**
 * Prepares .next/standalone for electron-builder packaging:
 *  1. Dereferences pnpm symlinks (Windows can't copy symlinks without Developer Mode)
 *  2. Copies .next/static → .next/standalone/.next/static  (Next.js serves assets from here)
 *  3. Copies public/     → .next/standalone/public          (Next.js serves public files from here)
 *  4. Copies versioned .prisma/client/ → standalone/node_modules/.prisma/client/
 *     (Prisma's hoisted @prisma/client/default.js does require('.prisma/client/default');
 *      the generated client lives only in the versioned pnpm entry, not the hoisted root)
 */
const fs = require("node:fs");
const path = require("node:path");

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function derefSymlinks(dir) {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      const target = fs.realpathSync(fullPath);
      fs.rmSync(fullPath, { recursive: true, force: true });
      copyRecursive(target, fullPath);
      count++;
    } else if (entry.isDirectory()) {
      count += derefSymlinks(fullPath);
    }
  }
  return count;
}

const rootDir = path.join(__dirname, "..");
const nextDir = path.join(rootDir, ".next");
const standaloneDir = path.join(nextDir, "standalone");

if (!fs.existsSync(nextDir)) {
  console.error("ERROR: .next not found. Run `pnpm build` first.");
  process.exit(1);
}

if (!fs.existsSync(standaloneDir)) {
  console.error("ERROR: .next/standalone not found. Make sure next.config has output:'standalone'.");
  process.exit(1);
}

// 1. Deref pnpm symlinks
console.log("Dereferencing symlinks in .next...");
const count = derefSymlinks(nextDir);
console.log(`  resolved ${count} symlink(s).`);

// 2. Copy .next/static → .next/standalone/.next/static
const staticSrc = path.join(nextDir, "static");
const staticDest = path.join(standaloneDir, ".next", "static");
if (fs.existsSync(staticSrc)) {
  console.log("Copying .next/static → .next/standalone/.next/static ...");
  copyRecursive(staticSrc, staticDest);
  console.log("  done.");
} else {
  console.warn("WARN: .next/static not found — skipping.");
}

// 3. Copy public/ → .next/standalone/public/
const publicSrc = path.join(rootDir, "public");
const publicDest = path.join(standaloneDir, "public");
if (fs.existsSync(publicSrc)) {
  console.log("Copying public/ → .next/standalone/public/ ...");
  copyRecursive(publicSrc, publicDest);
  console.log("  done.");
} else {
  console.log("INFO: No public/ directory found — skipping.");
}

// 4. Copy versioned .prisma/client/ → standalone/node_modules/.prisma/client/
// Prisma generates its client inside the versioned pnpm package entry, not the hoisted root.
// The hoisted @prisma/client/default.js calls require('.prisma/client/default') which Node
// resolves by walking up from node_modules/@prisma/client/ — it finds node_modules/.prisma/.
// Without this copy, that require fails in the packaged Electron app.
const pnpmDir = path.join(standaloneDir, "node_modules", ".pnpm");
const prismaDestDir = path.join(standaloneDir, "node_modules", ".prisma", "client");
if (fs.existsSync(pnpmDir)) {
  const pnpmEntries = fs.readdirSync(pnpmDir);
  const prismaEntry = pnpmEntries.find((e) => e.startsWith("@prisma+client@"));
  if (prismaEntry) {
    const prismaSrc = path.join(pnpmDir, prismaEntry, "node_modules", ".prisma", "client");
    if (fs.existsSync(prismaSrc)) {
      console.log(`Copying versioned .prisma/client/ → standalone/node_modules/.prisma/client/ ...`);
      console.log(`  source: ${prismaSrc}`);
      copyRecursive(prismaSrc, prismaDestDir);
      console.log("  done.");
    } else {
      console.warn(`WARN: .prisma/client not found at ${prismaSrc} — Prisma may fail at runtime.`);
    }
  } else {
    console.warn("WARN: No @prisma+client@ entry found in .pnpm — Prisma may fail at runtime.");
  }
} else {
  console.warn("WARN: .pnpm directory not found in standalone/node_modules — skipping .prisma copy.");
}

console.log("Pre-package preparation complete.");
