#!/usr/bin/env node
// Build: esbuild bundles src/code.ts -> dist/code.js (IIFE, Figma sandbox)
//        and src/ui.ts -> in-memory IIFE string that we inline into ui.html.
// Runtime dependencies: 0. Dev deps only.

import { build } from "esbuild";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const DIST = join(ROOT, "dist");
const SRC = join(ROOT, "src");
const LOCALES_DIR = join(ROOT, "locales");
const UI_HTML_TEMPLATE = join(ROOT, "src", "ui.html");

async function loadPackageVersion() {
  const raw = await readFile(join(ROOT, "package.json"), "utf8");
  const pkg = JSON.parse(raw);
  if (!pkg || typeof pkg.version !== "string" || !pkg.version) {
    throw new Error("[build] package.json#version must be a non-empty string.");
  }
  return pkg.version;
}

async function loadLocales() {
  const files = await readdir(LOCALES_DIR).catch(() => []);
  const bundle = {};
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const code = f.replace(/\.json$/, "");
    const raw = await readFile(join(LOCALES_DIR, f), "utf8");
    bundle[code] = JSON.parse(raw);
  }
  return bundle;
}

async function bundleCode(version) {
  await build({
    entryPoints: [join(SRC, "code.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2017"],
    outfile: join(DIST, "code.js"),
    sourcemap: false,
    minify: false,
    legalComments: "none",
    define: {
      "__PACKAGE_VERSION__": JSON.stringify(version)
    },
    logLevel: "info"
  });
}

async function bundleUi(locales, version) {
  const result = await build({
    entryPoints: [join(SRC, "ui", "main.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2017"],
    write: false,
    sourcemap: false,
    minify: false,
    legalComments: "none",
    define: {
      "__PACKAGE_VERSION__": JSON.stringify(version),
      "__LOCALES__": JSON.stringify(locales)
    },
    logLevel: "info"
  });
  const js = result.outputFiles.map(f => f.text).join("\n");
  const template = await readFile(UI_HTML_TEMPLATE, "utf8");
  const html = template.replace("<!-- UI_SCRIPT -->", `<script>${js}</script>`);
  await writeFile(join(DIST, "ui.html"), html, "utf8");
}

async function main() {
  if (!existsSync(DIST)) await mkdir(DIST, { recursive: true });
  if (!existsSync(SRC)) {
    console.error(`[build] src/ does not exist at ${SRC}. Run from the repo root.`);
    process.exit(1);
  }
  const version = await loadPackageVersion();
  const locales = await loadLocales();
  await bundleCode(version);
  await bundleUi(locales, version);
  console.log(`[build] ok. dist/code.js + dist/ui.html written.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
