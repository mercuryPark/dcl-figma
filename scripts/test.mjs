#!/usr/bin/env node
// Test runner: discovers src/**/*.test.ts, bundles each via esbuild into dist/test/*.mjs,
// then executes `node --test`. No new runtime/test-framework dependency — uses Node's
// built-in `node:test` (available since Node 18).

import { build } from "esbuild";
import { readdir, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "dist", "test");

async function findTests(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await findTests(p));
    else if (e.isFile() && e.name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

async function main() {
  if (!existsSync(SRC)) {
    console.error(`[test] src/ not found at ${SRC}`);
    process.exit(1);
  }
  const tests = await findTests(SRC);
  if (!tests.length) {
    console.error("[test] no *.test.ts files found under src/");
    process.exit(1);
  }

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  await build({
    entryPoints: tests,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node18",
    outdir: OUT,
    outbase: SRC,
    outExtension: { ".js": ".mjs" },
    sourcemap: "inline",
    logLevel: "warning"
  });

  console.log(`[test] bundled ${tests.length} test file(s):`);
  for (const t of tests) console.log(`  - ${relative(ROOT, t)}`);

  const child = spawn(process.execPath, ["--test", OUT], { stdio: "inherit" });
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
