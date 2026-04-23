## Summary

<!-- One or two sentences: what does this PR change and why? -->

## Screenshots / JSON diffs

<!-- If UI: before/after PNGs. If schema: a diff of one known sample dump. -->

## Checklist

- [ ] `npm run typecheck` passes (`tsc --noEmit` clean).
- [ ] `npm run build` exits 0 and `dist/code.js` ≤ 500KB.
- [ ] `manifest.json` `networkAccess.allowedDomains` is unchanged (`["none"]`).
- [ ] If UI strings changed: both `locales/en.json` and `locales/ko.json` updated with matching keys.
- [ ] If schema changed: `docs/SCHEMA.md` + version-diff log updated.
- [ ] `CHANGELOG.md` updated under `## [Unreleased]` with the right section (`Added` / `Changed` / `Fixed` / `Security`).
- [ ] Linked the OpenSpec change (if applicable): `Refs openspec/changes/<slug>`.

## Privacy invariant

- [ ] This PR does NOT introduce any outbound network call, telemetry, or third-party analytics.

## Notes for reviewers

<!-- Anything the reviewer should look at closely, or known limitations. -->
