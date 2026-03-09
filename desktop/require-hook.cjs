/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Require hook loaded via `--require` before the Next.js server process starts.
 *
 * Turbopack (Next.js 16) mangles external package names when it detects
 * pnpm-specific peer-dependency hashes in the resolved path, producing
 * names like `@prisma/client-a19c3baa627b22ab` instead of `@prisma/client`.
 * In the packaged Electron app the pnpm virtual directories don't exist, so
 * those mangled names fail to resolve at runtime.
 *
 * This hook intercepts Module._resolveFilename and rewrites any
 * `@prisma/client-<hex>` request back to `@prisma/client` before Node's
 * native resolution runs.
 */
const Module = require("module");

const PRISMA_CLIENT_HASH_RE = /^@prisma\/client-[0-9a-f]{8,}$/;

const _orig = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (PRISMA_CLIENT_HASH_RE.test(request)) {
    request = "@prisma/client";
  }
  return _orig.call(this, request, parent, isMain, options);
};
