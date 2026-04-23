# Design Context for LLMs

**Free, zero-telemetry Figma → LLM JSON export.**

Drop your Figma design into Claude Code, Cursor, GitHub Copilot, Aider, or any LLM session. One click gives you a clean, size-capped, tool-neutral JSON snapshot of your screens, design tokens, and components — at no cost, with nothing leaving your machine.

---

## What it does

- **Two outputs, one click.**
  - `Slim` (< 500 KB): screen summaries, tokens, component index. Ready for any LLM context window.
  - `Full` (≤ 10 MB): lossless node tree for diffs and detailed reference.
- **Self-documenting JSON.** Every file starts with `$schema`, `schemaVersion`, and a one-line `_howToUse` so an LLM instantly understands what it's reading.
- **Smart auto-shrink.** If Slim exceeds 500 KB, the plugin reduces `textSummary` density, then `sectionTree` depth, then drops `tokens` — each step recorded in `meta.degraded` for transparency.
- **English + 한국어.** Built-in i18n with live locale toggle.
- **Deterministic filenames.** `figma.{fileSlug}.{pageSlug}.slim.json` / `.full.json` — Hangul-aware, no timestamps, diff-friendly.
- **Opt-in SVG export** for icons (`icon/*` naming or ≤ 64 × 64), with hard caps to protect your machine.

## How to use

1. Open your Figma file.
2. Run **Plugins → Design Context for LLMs**.
3. Click **Dump**.
4. Pick one:
   - **Download Slim** — drag into an LLM chat.
   - **Download Full** — keep for detailed reference.
   - **Copy Slim to Clipboard** — paste straight into a coding-agent session.

Then paste into your LLM:

> *I've attached a Figma dump (`figma.*.slim.json`). Build the `ScreenName` screen using `screens[]` for structure, `tokens.colors` / `tokens.variables` for design tokens, and reference `components[]` for reusable patterns.*

Ready-to-copy snippets for Claude Code, Cursor, GitHub Copilot, Aider, and tool-neutral prompts are in the [README](https://github.com/mercuryPark/design-context-for-llms#integration-snippets).

## Privacy

- **Zero network.** `manifest.json` declares `networkAccess.allowedDomains: ["none"]` — Figma blocks outbound calls at runtime.
- **Zero telemetry.** No analytics, no beacons, no error reporters.
- **Local only.** Your design data flows: Figma sandbox → plugin UI iframe → `<a download>` / clipboard. That's the entire surface. Audit the MIT-licensed source at [github.com/mercuryPark/design-context-for-llms](https://github.com/mercuryPark/design-context-for-llms).

## Links

- **GitHub**: [mercuryPark/design-context-for-llms](https://github.com/mercuryPark/design-context-for-llms)
- **Sample Figma file**: *(link will be added after the sample file is published to Community)*
- **Documentation**: [SCHEMA.md](https://github.com/mercuryPark/design-context-for-llms/blob/main/docs/SCHEMA.md)
- **Report an issue**: [GitHub Issues](https://github.com/mercuryPark/design-context-for-llms/issues)

MIT Licensed. No Figma paid tier required.
