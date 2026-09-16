// Minimal preload used by scripts/test-invoice-pdf.ts to shim the
// "server-only" module (a Next.js virtual) so tsx can import server
// code from a plain Node script.
import { createRequire } from "node:module";
import { Module } from "node:module";

const require = createRequire(import.meta.url);
const stubPath = require.resolve("./stub-server-only.cjs");

// @ts-ignore Node's internal API
const origResolve = Module._resolveFilename;
// @ts-ignore Node's internal API
Module._resolveFilename = function (request, parent, ...rest) {
  if (request === "server-only") return stubPath;
  return origResolve.call(this, request, parent, ...rest);
};
