# Figma Community Publish Runbook

End-to-end checklist for cutting a release and submitting it to the Figma Community. The preferred GitHub Release path is automated by `.github/workflows/release.yml`; use the manual path only if the workflow is unavailable.

## Pre-flight (one-time per version)

1. Confirm `openspec/changes/<slug>/tasks.md` is fully `[x]`-checked, or has an explicit note for deferred items.
2. Confirm `package.json#version`, `src/schema.ts`, `docs/SCHEMA.md`, `CHANGELOG.md`, `README.md`, `README.ko.md`, and `site/*` all reference the intended release/schema versions.
3. Run the local gate:

```bash
npm ci
npm run verify:all
```

4. Confirm release invariants:
   - `manifest.json` declares `networkAccess.allowedDomains: ["none"]`.
   - `dist/code.js` and `dist/ui.html` are present after build.
   - `dist/code.js` is below the 500 KB bundle ceiling.
   - No release zip has been committed.
5. Figma Desktop version: **no explicit pin required**. The plugin uses the `dynamic-page` document access API, which [went GA on 2024-02-21](https://www.figma.com/plugin-docs/updates/2024/02/21/version-1-update-87/) and has been mandatory for new plugins since April 2024.
6. Visual assets exist under `publish/` before a Community submission:
   - `icon-128.png` — 128 × 128, PNG, ≤ 8 MB.
   - `cover-1920x960.png` — 1920 × 960, PNG, ≤ 8 MB.
   - `screenshot-1.png` / `screenshot-2.png` — English UI shots.
   - `screenshot-3.png` — Korean UI shot.
   - `description.en.md` — sections: "What it does", "How to use", "Privacy".
   - `description.ko.md` — same sections in Korean.

## Automated GitHub Release (preferred)

1. Commit the release prep changes.
2. Create and push a semver tag in the form `vX.Y.Z` or `vX.Y.Z-prerelease`.
3. GitHub Actions runs `.github/workflows/release.yml` on the tag push:
   - validates tag format,
   - installs with `npm ci`,
   - runs `npm run verify:all`,
   - creates `dcl-figma-vX.Y.Z.zip` containing only `manifest.json`, `dist/code.js`, and `dist/ui.html`,
   - writes `dcl-figma-vX.Y.Z.zip.sha256`,
   - extracts release notes from the matching `CHANGELOG.md` section,
   - creates the GitHub Release and uploads both artifacts.
4. Open the created GitHub Release and confirm:
   - the zip and `.sha256` are attached,
   - the zip does not contain `dist/test/` or source files,
   - release notes match the intended changelog section.

## Manual GitHub Release Fallback

Use this only if the automated workflow is unavailable. Keep the artifact allowlist identical to CI.

```bash
npm ci
npm run verify:all

VERSION=vX.Y.Z
rm -f dcl-figma-${VERSION}.zip dcl-figma-${VERSION}.zip.sha256
zip -r dcl-figma-${VERSION}.zip manifest.json dist/code.js dist/ui.html
shasum -a 256 dcl-figma-${VERSION}.zip > dcl-figma-${VERSION}.zip.sha256

gh release create "${VERSION}" \
  "dcl-figma-${VERSION}.zip" \
  "dcl-figma-${VERSION}.zip.sha256" \
  --title "${VERSION}" \
  --notes-file CHANGELOG-release-notes.md
```

## Figma Community Submission

1. Open the plugin in Figma Desktop (`Plugins → Development → Design Context for LLMs`).
2. Right-click the plugin's dev entry → **Publish new release**.
3. Upload assets from `publish/` in this order:
   - Icon 128×128.
   - Cover 1920×960.
   - Screenshots 1 → 3.
4. Paste `publish/description.en.md` into the **English** description field.
5. Paste `publish/description.ko.md` into the **Korean** description field.
6. Categories: `Developer tools`, `Prototyping`.
7. Tagline: "Free, zero-telemetry Figma → LLM JSON export".
8. Tipping: **disabled** (per project policy).
9. Link to the GitHub Release under "Support" / external link.
10. Submit for review.

## Post-submission

- Watch for review feedback (typically 1-3 business days).
- On approval, update `README.md` and `README.ko.md` to add the Figma Community badge/link.
- Open a GitHub Discussions post or an `[announcement]` issue linking to the new release.
- Recreate an empty `[Unreleased]` section in `CHANGELOG.md` for the next cycle.

## Unpublish / Rollback (emergency)

If a critical bug ships:

1. In Figma Community, unlist the plugin (community page → "…" → Unpublish).
2. GitHub: do not delete the tag. Cut `vX.Y.(Z+1)` with the fix.
3. Announce in the GitHub Discussion thread referenced above.

## Semver Policy Cheat Sheet

| Bump | When |
|---|---|
| MAJOR (`X.0.0`) | Breaking schema change (field removed, type changed), manifest permission change. |
| MINOR (`X.Y.0`) | New feature, new locale, additive schema field. |
| PATCH (`X.Y.Z`) | Bug fix, copy tweak, dependency bump. |
