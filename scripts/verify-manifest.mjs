#!/usr/bin/env node
// Validates manifest.json shape and the zero-network invariant.
// CI gate — fails hard on any deviation.

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const manifestPath = join(ROOT, "manifest.json");

function fail(msg) {
  console.error(`[verify-manifest] ${msg}`);
  process.exit(1);
}

const raw = await readFile(manifestPath, "utf8").catch(() => {
  fail(`manifest.json not found at ${manifestPath}`);
});

let m;
try {
  m = JSON.parse(raw);
} catch (err) {
  fail(`manifest.json is not valid JSON: ${err.message}`);
}

if (typeof m.id !== "string" || !m.id) fail(`id must be a non-empty string`);
if (typeof m.name !== "string" || !m.name) fail(`name must be a non-empty string`);
if (typeof m.main !== "string") fail(`main must be a string`);
if (typeof m.ui !== "string") fail(`ui must be a string`);
if (m.documentAccess !== "dynamic-page") fail(`documentAccess must be "dynamic-page", got ${JSON.stringify(m.documentAccess)}`);
if (!m.networkAccess || !Array.isArray(m.networkAccess.allowedDomains)) {
  fail(`networkAccess.allowedDomains must be an array`);
}
const domains = m.networkAccess.allowedDomains;
if (domains.length !== 1 || domains[0] !== "none") {
  fail(`networkAccess.allowedDomains must be exactly ["none"], got ${JSON.stringify(domains)}`);
}
if (m.networkAccess.reasoning && String(m.networkAccess.reasoning).length > 0) {
  fail(`networkAccess.reasoning must be absent or empty (got ${JSON.stringify(m.networkAccess.reasoning)})`);
}

console.log(`[verify-manifest] ok. id=${m.id} name=${m.name}`);
