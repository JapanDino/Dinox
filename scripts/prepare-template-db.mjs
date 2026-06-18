/**
 * Regenerates the bundled SQLite template at prisma/dev.db so a fresh install
 * always starts with a schema-correct, EMPTY database. Without this the shipped
 * template can drift behind the Prisma schema (e.g. a missing column), which
 * makes every query fail on a brand-new machine.
 *
 * Runs before packaging (see desktop:pack / desktop:package:win).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB = path.join(ROOT, "prisma", "dev.db");
const SCHEMA = path.join(ROOT, "prisma", "schema.prisma");

fs.rmSync(DB, { force: true });
fs.rmSync(`${DB}-journal`, { force: true });
fs.rmSync(`${DB}-wal`, { force: true });
fs.rmSync(`${DB}-shm`, { force: true });

const res = spawnSync(
  "npx",
  ["prisma", "migrate", "deploy", "--schema", SCHEMA],
  {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, DATABASE_URL: `file:${DB.replace(/\\/g, "/")}` },
  }
);

if (res.status !== 0) {
  console.error("✗ Failed to build template DB (prisma migrate deploy)");
  process.exit(res.status ?? 1);
}
console.log("✓ Fresh empty template DB ready at prisma/dev.db");
