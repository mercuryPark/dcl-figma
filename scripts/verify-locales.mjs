#!/usr/bin/env node
// Ensures every locale file has the exact same key set as en.json (the canonical source).
// CI gate — fails on missing or extra keys.

import { readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const LOCALES = join(ROOT, "locales");

function fail(msg) {
  console.error(`[verify-locales] ${msg}`);
  process.exit(1);
}

function flatten(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flatten(v, key));
    } else {
      out.push(key);
    }
  }
  return out;
}

const files = (await readdir(LOCALES).catch(() => [])).filter(f => f.endsWith(".json"));
if (!files.includes("en.json")) fail(`en.json missing — en is the canonical locale`);

const enRaw = await readFile(join(LOCALES, "en.json"), "utf8");
const enKeys = new Set(flatten(JSON.parse(enRaw)));

let anyMismatch = false;
for (const f of files) {
  if (f === "en.json") continue;
  const code = f.replace(/\.json$/, "");
  const raw = await readFile(join(LOCALES, f), "utf8");
  const keys = new Set(flatten(JSON.parse(raw)));
  const missing = [...enKeys].filter(k => !keys.has(k));
  const extra = [...keys].filter(k => !enKeys.has(k));
  if (missing.length || extra.length) {
    anyMismatch = true;
    console.error(`[verify-locales] ${code}: mismatch`);
    if (missing.length) console.error(`  missing keys: ${missing.join(", ")}`);
    if (extra.length) console.error(`  extra keys  : ${extra.join(", ")}`);
  } else {
    console.log(`[verify-locales] ${code}: ok (${keys.size} keys)`);
  }
}

if (anyMismatch) process.exit(1);
