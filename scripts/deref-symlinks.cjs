/**
 * Prepares .next for production runtimes:
 *  1. Dereferences pnpm symlinks so electron-builder can copy files on Windows.
 *  2. Copies .next/static into .next/standalone/.next/static.
 *  3. Copies public/ into .next/standalone/public.
 *  4. Copies the generated Prisma client into runtime node_modules trees.
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
    fs.mkdirSync(path.dirname(dest), { recursive: true });
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

console.log("Dereferencing symlinks in .next...");
const count = derefSymlinks(nextDir);
console.log(`  resolved ${count} symlink(s).`);

const staticSrc = path.join(nextDir, "static");
const staticDest = path.join(standaloneDir, ".next", "static");
if (fs.existsSync(staticSrc)) {
  console.log("Copying .next/static -> .next/standalone/.next/static ...");
  copyRecursive(staticSrc, staticDest);
  console.log("  done.");
} else {
  console.warn("WARN: .next/static not found; skipping.");
}

const publicSrc = path.join(rootDir, "public");
const publicDest = path.join(standaloneDir, "public");
if (fs.existsSync(publicSrc)) {
  console.log("Copying public/ -> .next/standalone/public/ ...");
  copyRecursive(publicSrc, publicDest);
  console.log("  done.");
} else {
  console.log("INFO: No public/ directory found; skipping.");
}

// Prisma's hoisted @prisma/client/default.js requires
// ".prisma/client/default" from a runtime node_modules tree. The generated
// client lives in the versioned pnpm entry, so copy it into both runtimes:
// `.next/node_modules` for `next start` and standalone for Electron.
const pnpmDir = path.join(standaloneDir, "node_modules", ".pnpm");
if (fs.existsSync(pnpmDir)) {
  const pnpmEntries = fs.readdirSync(pnpmDir);
  const prismaEntry = pnpmEntries.find((entry) => entry.startsWith("@prisma+client@"));
  if (prismaEntry) {
    const prismaSrc = path.join(pnpmDir, prismaEntry, "node_modules", ".prisma", "client");
    if (fs.existsSync(prismaSrc)) {
      const prismaDestDirs = [
        path.join(nextDir, "node_modules", ".prisma", "client"),
        path.join(standaloneDir, "node_modules", ".prisma", "client"),
      ];
      console.log("Copying versioned .prisma/client into runtime node_modules trees ...");
      console.log(`  source: ${prismaSrc}`);
      for (const prismaDestDir of prismaDestDirs) {
        copyRecursive(prismaSrc, prismaDestDir);
        console.log(`  copied: ${prismaDestDir}`);
      }
      console.log("  done.");
    } else {
      console.warn(`WARN: .prisma/client not found at ${prismaSrc}; Prisma may fail at runtime.`);
    }
  } else {
    console.warn("WARN: No @prisma+client@ entry found in .pnpm; Prisma may fail at runtime.");
  }
} else {
  console.warn("WARN: .pnpm directory not found in standalone/node_modules; skipping .prisma copy.");
}

console.log("Production runtime preparation complete.");
