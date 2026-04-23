# Figma Community Publish Runbook

End-to-end checklist for cutting a v1.x release and submitting it to the Figma Community. This is a single-maintainer workflow — run it top-to-bottom.

## Pre-flight (one-time per version)

1. Confirm `openspec/changes/<slug>/tasks.md` is fully `[x]`-checked (or has an explicit note for deferred items).
2. Figma Desktop version: **no explicit pin required**. The plugin uses the `dynamic-page` document access API, which [went GA on 2024-02-21](https://www.figma.com/plugin-docs/updates/2024/02/21/version-1-update-87/) and has been mandatory for new plugins since April 2024. The README already states "current Figma Desktop". If Figma publishes a future breaking change, revisit this.
3. Visual assets exist under `publish/`:
   - `icon-128.png` — 128 × 128, PNG, ≤ 8 MB.
   - `cover-1920x960.png` — 1920 × 960, PNG, ≤ 8 MB.
   - `screenshot-1.png` / `screenshot-2.png` — English UI shots.
   - `screenshot-3.png` — Korean UI shot.
   - `description.en.md` — sections: "What it does", "How to use", "Privacy".
   - `description.ko.md` — same sections in Korean.
4. Sample demo Figma file is published on the author's Figma account (~50 nodes, buttons + cards + dashboard sample). Paste the link into `publish/description.*.md`.

## Build & verify

```bash
npm ci
npm run verify:all      # typecheck + build + manifest + locales + bundle size
```

Artifacts land in `dist/`. Confirm:
- `dist/code.js` ≤ 500 KB.
- `dist/ui.html` exists and inlines the UI bundle.
- `manifest.json` still declares `networkAccess.allowedDomains: ["none"]`.

## Tag & GitHub release

```bash
# 1. Bump versions
npm version X.Y.Z --no-git-tag-version
# Edit manifest.json if its version is pinned separately.

# 2. Update CHANGELOG — move everything under [Unreleased] into [X.Y.Z] - YYYY-MM-DD
$EDITOR CHANGELOG.md

# 3. Commit & tag
git add package.json package-lock.json manifest.json CHANGELOG.md
git commit -m "release: vX.Y.Z"
git tag vX.Y.Z
git push origin main vX.Y.Z

# 4. Build the release zip
(cd dist && zip -r ../design-context-for-llms-vX.Y.Z.zip .)

# 5. Publish the GitHub Release with the zip attached
gh release create vX.Y.Z design-context-for-llms-vX.Y.Z.zip \
  --title "vX.Y.Z" \
  --notes-file CHANGELOG-release-notes.md
```

CI's `release.yml` workflow validates the tag format (`vMAJOR.MINOR.PATCH[-prerelease]`) and will fail the release if the tag is malformed.

## Figma Community submission

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
9. Link to the GitHub release under "Support" / external link.
10. Submit for review.

## Post-submission

- Watch for review feedback (typically 1-3 business days).
- On approval, update `README.md` and `README.ko.md` to add the Figma Community badge/link.
- Open a GitHub Discussions post (or an `[announcement]` issue) linking to the new release.
- Move `[Unreleased]` section back to empty in `CHANGELOG.md`.

## Unpublish / rollback (emergency)

If a critical bug ships:
1. In Figma Community, unlist the plugin (community page → "…" → Unpublish).
2. GitHub: DO NOT delete the tag. Instead, cut `vX.Y.(Z+1)` with the fix.
3. Announce in the GitHub Discussion thread referenced above.

## semver policy cheat sheet

| Bump | When |
|---|---|
| MAJOR (`X.0.0`) | Breaking schema change (field removed, type changed), manifest permission change. |
| MINOR (`X.Y.0`) | New feature, new locale, additive schema field. |
| PATCH (`X.Y.Z`) | Bug fix, copy tweak, dep bump. |
