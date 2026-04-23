# Contributing

Thanks for helping make **Design Context for LLMs** better. This project is a single-maintainer OSS plugin and we keep the workflow intentionally small.

## Ground rules

- **No network, no telemetry — ever.** `manifest.json` must keep `networkAccess.allowedDomains: ["none"]`. PRs that relax this are rejected.
- **Spec-first.** Non-trivial changes go through OpenSpec: `openspec/changes/<slug>/proposal.md` + `design.md` + `tasks.md`. See the active change in [`openspec/changes`](/openspec/changes/).
- **Zero runtime dependencies.** Dev-only deps are pinned in `package.json`. If you need a new one, justify it in the PR.

## Local setup

```bash
git clone https://github.com/mercuryPark/design-context-for-llms.git
cd design-context-for-llms
npm ci
```

Build:

```bash
npm run build    # esbuild: dist/code.js + dist/ui.html
npm run typecheck  # tsc --noEmit
```

Load in Figma Desktop: **Plugins → Development → Import plugin from manifest…** → pick `manifest.json`.

## PR checklist

Before opening a PR, verify:

- [ ] `npm run typecheck` — passes (tsc --noEmit clean).
- [ ] `npm run build` — exits 0 and `dist/code.js` ≤ 500KB.
- [ ] `manifest.json` — `networkAccess.allowedDomains` unchanged.
- [ ] If you touched UI strings, both `locales/en.json` and `locales/ko.json` updated with matching keys.
- [ ] If you touched the output schema, `docs/SCHEMA.md` and the version-diff log updated.
- [ ] Conventional-ish commit message (`feat: …`, `fix: …`, `docs: …`).

## Branch + commit style

- Branch off `main`: `feat/<short-slug>`, `fix/<short-slug>`, `docs/<short-slug>`.
- Keep commits small and logically cohesive. Squash is allowed at merge time.
- Reference the OpenSpec change slug in the commit body when applicable.

## Running CI locally

The CI matrix runs:

1. `npm ci`
2. `tsc --noEmit`
3. `node build.mjs`
4. Manifest JSON schema validation (`networkAccess.allowedDomains === ["none"]`).
5. Bundle size check (`dist/code.js` ≤ 500KB).
6. `locales/*.json` key-set parity.

You can reproduce each step from the commands above.

## Release runbook

Releases are cut manually by the maintainer.

1. Bump version in `package.json` and `manifest.json` to `X.Y.Z`.
2. Update `CHANGELOG.md` with a new `## [X.Y.Z] - YYYY-MM-DD` section (keep-a-changelog format).
3. Run `npm run build` → verify `dist/` contents.
4. `git tag vX.Y.Z && git push --tags`.
5. `gh release create vX.Y.Z dist/design-context-for-llms-vX.Y.Z.zip --notes-file CHANGELOG-release-notes.md`
   - Build the zip with: `(cd dist && zip -r ../design-context-for-llms-vX.Y.Z.zip .)`.
6. (Major only for v1.0+) Re-submit to Figma Community with updated cover/screenshots if UX changes.

### Semver policy

- **MAJOR** (`X.0.0`) — breaking change to the output JSON schema or manifest permissions.
- **MINOR** (`X.Y.0`) — new features, new locales, non-breaking schema additions.
- **PATCH** (`X.Y.Z`) — bug fixes, copy updates, dependency bumps.

## Adding a locale

1. Copy `locales/en.json` to `locales/<code>.json`.
2. Translate every value. Keys must match `en.json` exactly (CI enforces this).
3. Add the locale code to the `i18n` detection fallback list in `src/i18n.ts`.
4. Open a PR.

## Filing issues

Use the templates under `.github/ISSUE_TEMPLATE/` — they auto-prompt for reproduction steps, Figma file link, and expected output.

## Code of conduct

Be excellent to each other. Harassment, discrimination, or aggressive tone will have comments hidden and the author blocked. Maintainer discretion is final.
