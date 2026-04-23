# Security Policy

## Zero network, zero telemetry

**Design Context for LLMs** is built around a single hard guarantee:

> This plugin does not transmit any data to any remote server. Ever.

Concretely:

- `manifest.json` declares `networkAccess.allowedDomains: ["none"]`. Figma enforces this at runtime — the sandbox blocks `fetch`, `XMLHttpRequest`, `WebSocket`, and any other outbound network primitive.
- There is **zero telemetry**: no analytics SDK, no anonymous metrics, no error reporters, no crash uploaders.
- Design data flows end-to-end inside your machine: Figma sandbox (`code.ts`) → plugin UI iframe (`ui.html`) → `<a download>` / `navigator.clipboard`. That's the whole surface.
- CI validates the manifest on every PR so the "zero network" invariant cannot silently regress.
- The source is MIT on GitHub and auditable line-by-line.

## Supported versions

The project is pre-1.0 during the `universal-plugin-rebrand` rollout. Once v1.0 ships, only the latest minor line is supported:

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| 0.x     | :x: (pre-release)  |

## Reporting a vulnerability

**Do not** open a public GitHub Issue for security reports. Instead:

1. Open a **Private Vulnerability Report** via the GitHub Security tab on the `mercuryPark/dcl-figma` repository, **or**
2. Email the maintainer with the subject `[security] dcl-figma: <one-line summary>`.

Include:

- Plugin version (from `manifest.json`).
- Figma Desktop version.
- Reproduction steps, including a minimal Figma file if possible.
- Impact assessment.

You should expect an initial acknowledgement within **7 days**. If the issue is confirmed, a patched release is cut and a post-mortem is added to `CHANGELOG.md` under `### Security`.

## Threat model (what we consider in-scope)

- Leaking Figma file contents outside the user's machine.
- Bypassing `networkAccess.allowedDomains`.
- Embedding trackers or beacons in bundled dev dependencies.
- UI XSS vectors that could read other Figma iframe state.
- Serialization bugs that leak plugin internals into dumped JSON.

## Out of scope

- Denial-of-service via maliciously crafted Figma files (Figma Desktop is the first line of defense; the plugin only guarantees fail-safe behavior).
- Vulnerabilities in Figma Desktop itself — please report those to Figma.
- Issues that require elevated local privilege to exploit.

## Auditing checklist

For anyone doing an independent review, start here:

1. `manifest.json` — confirm `networkAccess.allowedDomains: ["none"]`.
2. `src/` — grep for `fetch(`, `XMLHttpRequest`, `WebSocket(`, `navigator.sendBeacon`. Expected hit count: 0.
3. `package.json` dependencies — confirm runtime `dependencies: {}` is empty; dev deps are `esbuild`, `typescript`, `@figma/plugin-typings`, `@types/node`.
4. `dist/code.js` — search for any runtime URL constants. Should only contain the string constants from the repo source.

If anything deviates from the above, that's a finding — please report it.
