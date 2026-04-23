#!/usr/bin/env node
// Enforces the 500KB bundle ceiling for dist/code.js.

import { stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TARGET = join(ROOT, "dist", "code.js");
const LIMIT_BYTES = 500 * 1024;

function fail(msg) {
  console.error(`[verify-size] ${msg}`);
  process.exit(1);
}

const s = await stat(TARGET).catch(() => {
  fail(`dist/code.js not found at ${TARGET} — did you run \`npm run build\`?`);
});

const kb = (s.size / 1024).toFixed(1);
const limitKb = (LIMIT_BYTES / 1024).toFixed(0);
if (s.size > LIMIT_BYTES) {
  fail(`size ${kb}KB exceeds limit ${limitKb}KB`);
}
console.log(`[verify-size] ok. ${kb}KB / ${limitKb}KB`);
