# Design Context for LLMs

[![Live Site](https://img.shields.io/badge/Live-dcl--figma.vercel.app-59E8B5?style=flat&labelColor=0B0B0F)](https://dcl-figma.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](/LICENSE)
[![Figma Plugin](https://img.shields.io/badge/Figma-Plugin-1E1E1E)](https://www.figma.com/community)
[![Zero Network](https://img.shields.io/badge/Network-Zero-brightgreen)](#privacy-and-security)

> **Read this in other languages:** [한국어](/README.ko.md)
> **Landing page:** https://dcl-figma.vercel.app/

A free and open-source **Figma plugin** that extracts a compact, LLM-ready JSON snapshot of your design file. Paste the output into Claude Code, Cursor, GitHub Copilot, Aider, or any LLM session — and let it reason about your actual screens, tokens, and components.

- 🟢 **Zero network, zero telemetry.** `networkAccess.allowedDomains: ["none"]` — the plugin cannot phone home.
- 📄 **Two deterministic outputs.** `Slim` (< 500KB, LLM-friendly) and `Full` (≤ 10MB, lossless).
- 🧠 **Self-documenting JSON.** Top-level `$schema`, `schemaVersion`, `_howToUse` so a single file tells its own story.
- 🌐 **English + 한국어** i18n built in.
- 🆓 **MIT licensed** — free forever, no Figma paid tier required.

## Why this exists

Figma's own MCP server requires a paid plan. Most community plugins either extract tokens only or bundle a full nested tree that blows past LLM context windows. `Design Context for LLMs` sits in the middle: it gives every LLM coding tool a clean, size-capped, tool-neutral JSON that represents your design's structure, copy, tokens, and components — at no cost and with zero data leaving your machine.

## Install

This plugin is distributed via GitHub Releases — **no Figma Community listing, no npm dependency, no build step required for end users.** You download a pre-built zip, unzip it anywhere on your machine, and point Figma at its `manifest.json`.

### From a GitHub Release zip (recommended)

1. Go to [Releases](https://github.com/mercuryPark/dcl-figma/releases) and download the latest `dcl-figma-vX.Y.Z.zip`.
2. Unzip it into any folder — for example `~/figma-plugins/dcl-figma/`. The folder will contain `manifest.json` and a `dist/` directory.
3. Open Figma Desktop, then **Plugins → Development → Import plugin from manifest…**
4. Select the `manifest.json` from the folder you just unzipped.
5. Run it anytime from **Plugins → Development → Design Context for LLMs**.

**Updating:** when a new release lands, download the new zip and overwrite the same folder. You do not need to re-import the manifest.

### From source (for contributors)

```bash
git clone https://github.com/mercuryPark/dcl-figma.git
cd dcl-figma
npm ci
npm run build
```

Then in Figma Desktop: **Plugins → Development → Import plugin from manifest…** → select this repo's `manifest.json`.

### Requirements

- Figma **Desktop** (web-only is not supported).
- Any current Figma Desktop build. The plugin relies on the `dynamic-page` document access API, which [became generally available on 2024-02-21](https://www.figma.com/plugin-docs/updates/2024/02/21/version-1-update-87/) and has been the default for new plugins since April 2024 — every currently maintained Figma Desktop release supports it.

## Usage

1. Open any Figma file.
2. Run **Plugins → Design Context for LLMs**.
3. Click **Dump**.
4. Pick one of the three actions:
   - **Download Slim** — drop into an LLM chat window.
   - **Download Full** — keep for diffs / detailed reference.
   - **Copy Slim to Clipboard** — fastest path into a coding-agent session.

Advanced options (SVG export, hidden nodes, token collection, scope) are tucked inside the `Advanced options` disclosure and persist per file via `figma.clientStorage`.

## Output

Files are named deterministically:

```
figma.{fileSlug}.{pageSlug}.slim.json
figma.{fileSlug}.{pageSlug}.full.json
```

`pageSlug` is `all` when you dump every page. All outputs start with:

```json
{
  "$schema": "https://dcl-figma.dev/schemas/1.0.json",
  "schemaVersion": "1.0",
  "_howToUse": "Figma design dump for LLM context. Load this JSON and reference screens[], tokens, and components when generating UI code.",
  "meta": { "fileKey": "...", "pageId": "...", "generatedAt": "...", "tool": "dcl-figma@1.0.0", "degraded": [] }
}
```

See [`docs/SCHEMA.md`](/docs/SCHEMA.md) for the full contract.

## Integration snippets

> Replace `{{project_root}}` with any directory on your machine — the plugin does not care where the JSON lives.

### Claude Code

```
I've saved a Figma dump at {{project_root}}/figma.my-app.home.slim.json.

Read it and when you generate UI code, reference:
- `screens[]` for layout + copy,
- `tokens.colors` / `tokens.typography` for design tokens,
- `components[]` for reusable patterns.

Do not invent component names that are not in the JSON.
```

### Cursor

```
@figma.my-app.home.slim.json

Use this Figma dump as the source of truth for screen structure, copy, and tokens. Match tokens exactly (hex and name). Ignore nodes whose `visible` is explicitly false.
```

### GitHub Copilot (Workspace / Chat)

```
/explain Use the file `figma.my-app.home.slim.json` as the design reference. When I ask for a component, map it to the matching entry in `components[]` and respect `tokens.typography` line heights.
```

### Aider

```bash
aider figma.my-app.home.slim.json src/
# then in the chat:
# Use the figma.*.slim.json as the canonical UI spec. Fields: screens, tokens, components.
```

### Generic (tool-neutral)

```
Load the JSON file design.slim.json (a Figma design dump). Its top level contains:
- meta (context about how the file was generated),
- tokens (design tokens: colors, typography, effects, variables),
- screens (per-screen summaries with `sectionTree` and `textSummary`),
- components (reusable definitions).

When generating code, mirror token names, respect the `sectionTree` hierarchy, and use `textSummary` strings verbatim.
```

## Privacy and security

- **Zero network.** `manifest.json` declares `networkAccess.allowedDomains: ["none"]`. Figma blocks `fetch` / `XMLHttpRequest` at runtime.
- **Zero telemetry.** No analytics, no error reporting, no beacons.
- **Local only.** Design data flows: Figma sandbox → plugin UI iframe → `<a download>` / clipboard. Nothing else.
- Details: [`SECURITY.md`](/SECURITY.md).

## Contributing

We welcome issues, PRs, and new locales. See [`CONTRIBUTING.md`](/CONTRIBUTING.md) for the build, test, and release workflow.

## Roadmap (v1.1+)

- Per-page split output.
- Option presets (save / share).
- Additional locales (`ja`, `zh`, `es` — contributions welcome).
- Figma Code Connect integration.

## License

[MIT](/LICENSE) © mercuryPark and contributors.
