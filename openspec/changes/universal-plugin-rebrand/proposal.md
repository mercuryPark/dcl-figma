## Why

기존 계획 v2는 잠깐살래(`4quadverse-app`) 단일 프로젝트의 1회성 Figma 덤프를 전제로 스펙·핸드오프·출력 규약이 고정되어 있어, Figma Desktop을 쓰는 다른 개발자가 재사용할 수 없다. Figma MCP 서버는 유료 요구를 동반하므로, 동일한 "Figma → LLM 컨텍스트" 문제를 **무료·오픈소스 Figma Plugin**으로 해결해 Claude Code·Cursor·Copilot·Aider 사용자 전체에게 범용 대안을 제공하기 위해 정체성을 범용 도구로 전환한다.

## What Changes

- **BREAKING** 프로젝트 정체성을 "잠깐살래 전용 1회성 도구"에서 "범용 오픈소스 Figma-to-LLM Plugin"으로 전환. 잠깐살래는 v1.0 검증용 첫 사용자 케이스 스터디로 격하.
- **BREAKING** 출력 파일명 규약을 `design.slim.json`/`design.full.json` 고정에서 `figma.{fileSlug}.{pageSlug}.slim.json` 결정론적 패턴으로 교체.
- **BREAKING** 핸드오프 절차에서 특정 메인 앱 레포 절대경로(`/Users/.../4quadverse-app/docs/figma/dump/`) 및 `CLAUDE.md` 강제 편집 단계 제거. 도구 중립 통합 스니펫(Claude Code / Cursor / Copilot / Aider / Generic) 라이브러리로 대체.
- Slim JSON 최상단에 self-documenting meta 블록 추가: `$schema`, `schemaVersion`, `_howToUse`, `meta.fileKey/pageId/tool/generatedAt`.
- Slim 500KB 초과 시 3단계 자동 축소 폴백(`textSummary` 20→10 → `sectionTree` depth 3→2 → `tokens` 제외), 축소 내역을 `meta.degraded` 필드에 기록.
- Variables 저장 구조를 `{ name, id, value }` 객체 배열로 확장 (modeName·modeId 둘 다 보존).
- 노드 children 정렬을 Figma 반환 순서 그대로 유지(z-order 보존, 결정론성 확보)로 명시.
- UI를 1-클릭 "Dump" 중심으로 재설계하고 English + 한국어 i18n 인프라(문자열 리소스 + 런타임 로더) 도입. v1.0 번들에 `en`·`ko` 두 locale 포함.
- 파일별 옵션 persistence를 `figma.clientStorage`로 구현(fileKey별 스코프, 두 번째 덤프부터 자동 복원).
- `networkAccess.allowedDomains: ["none"]` 유지·문서화로 "제로 텔레메트리" 보증.
- 오픈소스 인프라 신설: MIT LICENSE, GitHub 공개 레포, `README.md`(영/한), `CONTRIBUTING.md`, 이슈/PR 템플릿, GitHub Actions CI(esbuild + typecheck + manifest 유효성), `CHANGELOG.md` keep-a-changelog 형식 전환.
- Figma Community publish 경로 확립: 공개용 샘플 Figma 파일 자체 제작(~50노드), 커버 이미지(1920×960), 아이콘(128×128), 스크린샷 3장, 한/영 설명문, publish runbook.
- **BREAKING** `docs/01~06` 및 `docs/CHANGELOG.md`(v1/v2)는 `docs/legacy/` 아래로 이동해 히스토리 레퍼런스로 보존. 앞으로의 진행은 OpenSpec 체계에서 관리.

## Capabilities

### New Capabilities
- `dump-engine`: Figma Plugin API 기반 DFS traversal, 타입별 노드 추출(Frame/Text/Image/Component/Instance/Vector), 스타일·Variables·Effect 토큰 수집, pruning 규칙 적용, Slim 변환(3단계 자동 축소 포함), 500KB 청크 postMessage 전송, SVG export(opt-in, ≤64×64, cap 100).
- `plugin-ui`: 1-클릭 Dump 중심의 미니멀 UI, English/Korean i18n 런타임, `figma.clientStorage` 기반 파일별 옵션 persistence, 페이지 선택(현재/전체), 진행·에러·경고 상태 표시, 3-tier 출력(Slim 다운로드 / Full 다운로드 / Slim 클립보드 복사).
- `output-schema`: Slim/Full JSON 계약 정의, `$schema` URL, `schemaVersion` semver, `_howToUse` self-documenting 문자열, `meta.{fileKey,pageId,tool,generatedAt,degraded}` 구조, Variables `{ name, id, value }` 저장 규칙, 결정론적 파일명 `figma.{fileSlug}.{pageSlug}.slim.json`, `docs/SCHEMA.md` 버전별 diff 기록 규약.
- `distribution`: MIT 라이선스, GitHub 공개 레포 레이아웃, CONTRIBUTING/이슈/PR 템플릿, GitHub Actions CI(esbuild build + `tsc --noEmit` + manifest JSON schema 검증), 시맨틱 버저닝 + `gh release` 기반 릴리즈 플로우, Figma Community publish 에셋(아이콘·커버·스크린샷·카피)·샘플 데모 Figma 파일, 릴리즈 runbook, 제로 텔레메트리 정책 명문화.

### Modified Capabilities
<!-- openspec/specs/ 이하에 기존 spec이 없어 수정 대상 없음. 본 change가 첫 spec 세트를 생성. -->

## Impact

- **코드 (신규)**: `src/{extract,tokens,svg,slim,i18n,ui,util/{pLimit,prune}}.ts`, `ui.html`, `manifest.json`, `build.mjs`, `locales/{en,ko}.json`. 현재 코드베이스는 비어 있으므로 scaffolding부터 전부 신규 작성.
- **문서 이동 (BREAKING)**: `docs/01-overview.md`~`docs/06-handoff.md`, 기존 `docs/CHANGELOG.md`를 `docs/legacy/` 하위로 이동. `docs/` 루트에는 신규 README(한/영)와 OpenSpec을 가리키는 포인터만 남김.
- **의존성**: 런타임 외부 의존성 0 유지. 개발 의존성에 `esbuild`, `typescript`, `@figma/plugin-typings`, `@types/node` 핀 고정. i18n은 자체 구현(15줄 수준 로더).
- **외부 API·시스템**:
  - Figma Plugin API (`documentAccess: "dynamic-page"`, Async API 전용, `networkAccess.allowedDomains: ["none"]`)
  - GitHub (공개 레포, Actions, Releases)
  - Figma Community (플러그인 publish, 샘플 파일 publish)
- **보안/프라이버시**: 제로 네트워크·제로 텔레메트리 정책을 README·`SECURITY.md`에 명문화. 사용자 파일 데이터는 Figma 샌드박스 내에서만 처리되고 사용자의 로컬 다운로드/클립보드로만 나간다는 점을 감사 가능하도록 GitHub 소스 투명성으로 뒷받침.
- **기존 사용자 영향**: v1(잠깐살래 내부) 가정으로 만들어진 절차 문서를 사용 중이라면 신규 범용 UI·파일명 규약으로 전환 필요. 단 아직 구현 코드가 없어 실사용자 0명, 마이그레이션 부담은 문서·스펙 차원에 한정.
- **향후 확장(out of scope for v1.0)**: 페이지별 분할 파일 출력, 옵션 프리셋 저장/공유, 추가 locale, Figma Code Connect 통합은 v1.1+ 로드맵으로 분리.
