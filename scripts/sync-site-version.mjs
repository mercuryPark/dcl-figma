#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SITE_FILES = [
  join(ROOT, "site", "index.html"),
  join(ROOT, "site", "app.js"),
  join(ROOT, "site", "og-image.svg")
];

async function readPackageVersion() {
  const raw = await readFile(join(ROOT, "package.json"), "utf8");
  const pkg = JSON.parse(raw);
  if (!pkg || typeof pkg.version !== "string" || !pkg.version) {
    throw new Error("[sync-site-version] package.json#version must be a non-empty string.");
  }
  return pkg.version;
}

function syncVersionText(input, version) {
  return input
    .replace(/\bdcl-figma@\d+\.\d+\.\d+\b/g, `dcl-figma@${version}`)
    .replace(/\bv\d+\.\d+\.\d+\b/g, `v${version}`);
}

async function main() {
  const version = await readPackageVersion();
  for (const file of SITE_FILES) {
    const before = await readFile(file, "utf8");
    const after = syncVersionText(before, version);
    if (after !== before) {
      await writeFile(file, after, "utf8");
      console.log(`[sync-site-version] updated ${file}`);
    } else {
      console.log(`[sync-site-version] unchanged ${file}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
