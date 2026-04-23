## 1. 레거시 문서 이동 및 OSS 레포 준비

- [x] 1.1 `docs/01~06.md` 및 기존 `docs/CHANGELOG.md`를 `docs/legacy/`로 `git mv` 이동
- [x] 1.2 `docs/legacy/README.md`에 "잠깐살래 v1/v2 계획 히스토리 보존" 헤더 추가
- [x] 1.3 루트 `LICENSE` 파일 생성 (MIT, 저작권자·연도 기입)
- [x] 1.4 루트 `README.md`(영문) 생성 — 플러그인 소개·설치·사용법·5종 통합 스니펫(Claude Code/Cursor/Copilot/Aider/Generic)
- [x] 1.5 루트 `README.ko.md`(한국어 번역본) 생성
- [x] 1.6 `CONTRIBUTING.md` 작성 — 빌드·테스트·PR 규칙
- [x] 1.7 `SECURITY.md` 작성 — 제로 네트워크·제로 텔레메트리 보증 명시
- [x] 1.8 `.github/ISSUE_TEMPLATE/{bug,feature,question}.md` 3종 템플릿 추가 (YAML form)
- [x] 1.9 `.github/PULL_REQUEST_TEMPLATE.md` 추가
- [x] 1.10 `.gitignore` 작성 (`node_modules/`, `dist/`, `.DS_Store` 등)

## 2. 빌드 시스템 및 타입 기반

- [x] 2.1 `package.json` 초기화 — name, version `0.1.0`, license `MIT`, repository URL
- [x] 2.2 dev 의존성 핀 고정: `esbuild`, `typescript`, `@figma/plugin-typings`, `@types/node`
- [x] 2.3 `tsconfig.json` 작성 — strict, target ES2020, lib DOM+ES2020, `noEmit`용 설정
- [x] 2.4 `manifest.json` 작성 — id, name, main `dist/code.js`, ui `dist/ui.html`, `documentAccess: "dynamic-page"`, `networkAccess.allowedDomains: ["none"]`, editorType `figma`
- [x] 2.5 `build.mjs` 구현 — esbuild로 `src/code.ts`→`dist/code.js` IIFE, `src/ui.ts`→번들 문자열, `ui.html` 템플릿에 인라인 주입
- [x] 2.6 `npm run build` 스크립트로 종료코드 0 확인 — 30.8KB, `npm run verify:all` 전부 통과

## 3. 공통 유틸 (util)

- [x] 3.1 `src/util/pLimit.ts` 구현 — 동시성 N 제한 세마포어 (15줄 수준)
- [x] 3.2 `src/util/prune.ts` 구현 — 기본값 생략, 좌표/크기 소수점 2자리 반올림, null/빈 컬렉션 제거
- [x] 3.3 `src/util/slugify.ts` 구현 — kebab-case ASCII 정규화, 비ASCII는 `x-` + base32 폴백
- [x] 3.4 `src/util/size.ts` 구현 — 문자열 바이트 길이 측정(TextEncoder)

## 4. i18n 런타임

- [x] 4.1 `locales/en.json` 작성 — v1.0 UI 문자열 전부 키-값
- [x] 4.2 `locales/ko.json` 작성 — en과 key set 동일
- [x] 4.3 `src/i18n.ts` 구현 — `t(key, vars?)`, `setLocale(code)`, 감지 순서(clientStorage → navigator.language → en)
- [x] 4.4 CI 검증 스크립트: `ko.json` key set === `en.json` key set 일치 확인 (scripts/verify-locales.mjs)

## 5. Core 추출 엔진 (dump-engine capability)

- [x] 5.1 `src/extract/traverse.ts` — 비동기 DFS, 50노드마다 `setTimeout(0)` yield, children Figma 순서 유지
- [x] 5.2 `src/extract/frame.ts` — Frame/Group/Section 노드 추출
- [x] 5.3 `src/extract/text.ts` — Text 노드 characters + 스타일 추출
- [x] 5.4 `src/extract/image.ts` — Image fill hash 추출
- [x] 5.5 `src/extract/component.ts` — Component/ComponentSet 추출
- [x] 5.6 `src/extract/instance.ts` — Instance + `mainComponentId` + override 추출 (순환참조 방지)
- [x] 5.7 `src/extract/vector.ts` — Vector 노드 기본 정보 추출
- [x] 5.8 `src/extract/index.ts` — 타입 디스패처 + 진행 상태 emit

## 6. 디자인 토큰 수집

- [x] 6.1 `src/tokens/styles.ts` — `getLocalPaintStylesAsync/TextStylesAsync/EffectStylesAsync` 집계
- [x] 6.2 `src/tokens/variables.ts` — `getLocalVariablesAsync`, `{ name, id, valuesByMode: [{modeName, modeId, value}] }` 구조로 변환
- [x] 6.3 Variables 미사용 파일 폴백 — `meta.stats.variablesError` 기록, 빈 배열 반환
- [ ] 6.4 토큰 수집 단위 테스트 시나리오 준비 (실제 Figma 런타임 검증용 체크리스트) — Task 15 (Figma Desktop validation) 에서 함께 수행 예정

## 7. Slim 변환 + 3단계 자동 축소 폴백

- [x] 7.1 `src/slim/toSlim.ts` — Full → Slim 1차 변환 (textSummary 20, sectionTree depth 3, tokens 포함)
- [x] 7.2 `src/slim/degrade.ts` — 3단계 축소 루프: textSummary 20→10 → sectionTree depth 3→2 → tokens 제외, 각 단계 후 `meta.degraded` 배열 append
- [x] 7.3 `src/slim/index.ts` — size 측정 + 미만이면 stop, 최종 초과 시 `"exceededAfterFullDegrade"` 엔트리 추가
- [x] 7.4 Full 객체에서는 `meta.degraded`를 항상 빈 배열로 고정 (meta builder 에서 고정)

## 8. SVG Export

- [x] 8.1 `src/svg/filter.ts` — naming `icon/*` glob match + 크기 ≤64×64 판정
- [x] 8.2 `src/svg/export.ts` — `exportAsync({format:'SVG_STRING'})` 호출, try/catch로 개별 실패 격리 (`svgFailed` 카운트)
- [x] 8.3 `src/svg/index.ts` — `pLimit(10)` 동시성, 총 100개 하드리밋
- [x] 8.4 결과를 `VectorNode.svg` 필드에 첨부, 실패 시 `svgExportFailed: true` 플래그

## 9. 출력 스키마 (output-schema capability)

- [x] 9.1 `src/schema.ts` — Full/Slim TypeScript 타입 정의 (`DesignFull`, `DesignSlim`, `Meta`, `Variable`)
- [x] 9.2 `meta` 블록 생성기 — `src/meta.ts`: `$schema`, `schemaVersion: "1.0"`, `_howToUse`, `fileKey`(없으면 null), `pageId`, `tool`, `generatedAt`, `degraded`
- [x] 9.3 `src/filename.ts` — `figma.{fileSlug}.{pageSlug}.{slim|full}.json` 조립 (전체 페이지는 pageSlug `all`)
- [x] 9.4 `docs/SCHEMA.md` 작성 — v1.0 스키마 문서화 + 버전별 diff 로그 섹션 템플릿

## 10. postMessage 청크 전송 프로토콜

- [x] 10.1 `src/transport/chunk.ts` — `JSON.stringify(dump)` → 500KB 슬라이스 → `{type:'chunk', kind:'full'|'slim', seq, data}` 전송
- [x] 10.2 전송 완료 시 `{type:'done', totalSeq, kind}` 발송
- [x] 10.3 UI 측 `src/ui/receive.ts` — seq 배열 조립, 누락 seq 감지 시 에러
- [x] 10.4 "객체 통째 전송 금지" 린트 규칙 (CONTRIBUTING.md + PR 템플릿 체크리스트에 포함)

## 11. Plugin UI (plugin-ui capability)

- [x] 11.1 `ui.html` 템플릿 — 1-클릭 "Dump" 중심 레이아웃, 고급 옵션은 `<details>`로 접힘
- [x] 11.2 `src/ui/main.ts` — 진입 시 스마트 기본값 (현재 선택 노드 또는 현재 페이지) 감지 + 표시
- [x] 11.3 페이지 범위 라디오 (Current / All), 분할 출력 옵션 v1.1 배제
- [x] 11.4 3-tier 출력 버튼 — Download Slim / Download Full / Copy Slim to Clipboard
- [x] 11.5 SVG export opt-in 체크박스 (고급 옵션 내)
- [x] 11.6 진행 상태: progressbar(노드 진행) + Phase 라벨 (`Collecting variables...` 등)
- [x] 11.7 경고 배지 (노란색): `variablesError`, `svgFailed` 등 비치명적 상태 표시
- [x] 11.8 치명적 에러 메시지 (빨간색): 전송 실패·manifest 오류 등 배너
- [x] 11.9 locale 토글 (en/ko), 초기 감지 결과 반영
- [x] 11.10 옵션 persistence (localStorage, fileName 스코프) — `figma.clientStorage` 마이그레이션은 Task 15 검증 시 재평가
- [x] 11.11 접근성 — Tab 포커스 순서, progressbar ARIA, 색 대비 WCAG AA (CSS 변수 기반, light/dark prefers-color-scheme 반영)

## 12. GitHub Actions CI (distribution capability)

- [x] 12.1 `.github/workflows/ci.yml` — `npm ci` → `tsc --noEmit` → `node build.mjs`
- [x] 12.2 CI 단계: manifest.json JSON schema 검증 (networkAccess `["none"]` 고정 확인) — `scripts/verify-manifest.mjs`
- [x] 12.3 CI 단계: 번들 크기 상한 500KB 체크 (초과 시 실패) — `scripts/verify-size.mjs`
- [x] 12.4 CI 단계: `locales/*.json` key set 일치 검증 — `scripts/verify-locales.mjs`
- [ ] 12.5 PR 시 CI 필수 통과 브랜치 보호 규칙 활성화 — GitHub 저장소 생성 후 메인테이너가 settings에서 수동 활성화 (runbook에 명시)

## 13. 릴리즈 파이프라인

- [x] 13.1 `CHANGELOG.md` 루트에 keep-a-changelog 형식으로 신규 생성 (v0.1.0 initial)
- [x] 13.2 `npm version` + git tag 전략 문서화 — `CONTRIBUTING.md`, `docs/publish-runbook.md`
- [x] 13.3 `gh release create vX.Y.Z` 수동 runbook을 기록 (dist zip 첨부 절차) — `docs/publish-runbook.md` + `CONTRIBUTING.md`
- [x] 13.4 semver 정책 명시: 스키마 breaking은 major, 기능 추가 minor, 수정 patch — `CONTRIBUTING.md`, `docs/publish-runbook.md`

## 14. Figma Community Publish 준비

- [ ] 14.1 아이콘 제작 (128×128 PNG)
- [ ] 14.2 커버 이미지 제작 (1920×960 PNG)
- [ ] 14.3 스크린샷 3장 제작 (영문 2장, 한글 1장)
- [x] 14.4 Community 설명문 영문본 작성 (태그라인 + 본문 + GitHub 링크) — `publish/description.en.md`
- [x] 14.5 Community 설명문 한국어본 작성 — `publish/description.ko.md`
- [ ] 14.6 샘플 데모 Figma 파일 제작 (~50노드: 버튼/카드/대시보드 샘플)
- [ ] 14.7 샘플 Figma 파일에서 플러그인 실행 → Slim/Full 결과 GitHub 레포 `examples/`에 커밋
- [x] 14.8 publish 체크리스트 `docs/publish-runbook.md` 작성

## 15. 잠깐살래 검증 (첫 사용자 케이스 스터디)

- [ ] 15.1 Figma Desktop에 dev-plugin으로 로컬 설치
- [ ] 15.2 잠깐살래 최종본 파일(`MTOxFfImwieeX0Ae2IkjOQ`, 페이지 `1747:2606`)에서 덤프 실행
- [ ] 15.3 Slim 크기 <500KB, Full 크기 ≤10MB, schema validity 수동 확인
- [ ] 15.4 Slim이 초과 시 폴백 단계 `meta.degraded` 로그 확인
- [ ] 15.5 잠깐살래 팀이 Slim JSON을 Claude Code 세션에 붙여 실사용, 피드백 수집

## 16. v1.0 릴리즈 및 publish

- [ ] 16.1 잠깐살래 검증 결과 반영한 최종 조정 커밋
- [ ] 16.2 CHANGELOG에 v1.0.0 엔트리 작성
- [ ] 16.3 `v1.0.0` 태깅 및 `gh release create` 실행
- [ ] 16.4 Figma Community publish 제출 (에셋 + 설명문 + 샘플 파일 링크)
- [ ] 16.5 publish 승인 후 README 배지(Figma Community link) 업데이트
- [ ] 16.6 GitHub Discussions 또는 Issues 피드백 창구 공지

## 17. Open Questions 해소

- [x] 17.1 Figma Desktop 최소 버전 명시 — `dynamic-page` API 가 2024-02-21 GA 후 모든 신규 플러그인에 강제됐으므로 "current Figma Desktop" 으로 충분. README (영/한) + publish-runbook 반영, `manifest.json` 에 `minFigmaVersion` 핀은 불필요
- [x] 17.2 최종 플러그인명 확정: **Design Context for LLMs**
- [x] 17.3 GitHub 공개 위치 확정: `github.com/mercuryPark/dcl-figma` (개인 계정, MIT 저작권자 `mercuryPark`)
- [x] 17.4 Figma Community publish 정책 확정: 무료 + 공개 + Tipping 비활성
- [x] 17.5 비주얼 에셋 디자인 톤 확정 — **Tone A: Minimal Tech** (검정 `#0B0B0F` + 터미널 그린 `#59E8B5` + 앰버 `#FF6A3D` + JetBrains Mono). `publish/ASSET-SPECS.md` 에 5개 에셋 상세 스펙 작성
