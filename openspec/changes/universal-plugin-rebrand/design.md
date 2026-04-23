# Design — universal-plugin-rebrand

## Context

현재 리포지토리 상태: `src/` 디렉토리 미존재, 구현 코드 0줄. `docs/01~06.md`에 v2 스펙이 문서로만 존재하며, `docs/01-overview.md:74-88`에서 Figma Plugin API + Full/Slim 2 산출물 ADR이 확정되어 있으나 "잠깐살래 전용 1회성"이라는 전제가 박혀 있다. proposal.md는 이 정체성을 "범용 오픈소스 Figma-to-LLM Plugin"으로 전환하는 BREAKING change를 선언했다.

Figma Plugin API 제약 (`docs/02-architecture.md:48-58` 기준):
- `manifest.documentAccess: "dynamic-page"` 모드에서 `getLocalPaintStyles()` 등 동기 API는 throw → `*Async` 전용 호출 필수.
- `networkAccess.allowedDomains: ["none"]`로 외부 호출 완전 차단, 제로 텔레메트리 정책과 정합.
- UI는 iframe 샌드박스, main 코드와 postMessage 채널로만 통신. postMessage payload는 structured clone을 동기 수행하므로 수 MB 깊은 트리 전송 시 프리즈 위험 (`docs/03-spec.md:194-197`).
- 파일시스템 직접 접근 불가. 결과 반출은 iframe 내 `Blob + <a download>` 또는 `navigator.clipboard` 한정.
- fileKey는 플러그인 런타임에서 직접 조회 불가 (API 미노출). 파일명에 쓸 fileSlug는 `figma.root.name` 기반으로 생성한다.

이해관계자:
- **메인테이너:** 프로젝트 오너 1인 (`hoyeon`). 유지보수·릴리즈 단독 수행.
- **v1.0 검증 사용자:** `4quadverse-app`(잠깐살래) 개발 세션. 첫 실전 케이스 스터디로 격하.
- **타겟 최종 사용자:** Figma Desktop + LLM 코딩 도구(Claude Code / Cursor / Copilot / Aider) 병행 사용 개발자. Figma Free 플랜 사용자 비중이 높아 REST MCP 대안을 필요로 한다.
- **심사자:** Figma Community 리뷰어 (publish 승인 주체).

## Goals / Non-Goals

**Goals**
- 범용 1-클릭 "Dump" UX (파일·도구 중립, 하드코딩 경로 0).
- 제로 네트워크 / 제로 텔레메트리 (manifest·런타임·CI 3중 검증).
- 도구 중립 Slim 출력 (Claude / Cursor / Copilot / Aider 범용 활용).
- MIT 오픈소스 + GitHub 투명성 + Figma Community publish.
- i18n (English + 한국어) v1.0 번들 포함, 런타임 locale 전환.
- 결정론적 산출물 (동일 입력 → 동일 파일명·동일 바이트).

**Non-Goals (v1.0)**
- 페이지별 분할 파일 출력 (v1.1 검토).
- 옵션 프리셋 저장·공유 / 팀 공용 설정 (v1.1).
- 추가 locale — ja, zh, es 등 (v1.1+, 기여 PR 환영).
- Figma Code Connect 통합 / 컴포넌트 ↔ 코드 매핑 (v1.2+).

**영구 Non-Goals**
- 서버 / 클라우드 동기화 기능.
- 사용 통계·원격 로깅·익명 텔레메트리.
- REST API fallback (Plugin API 범위 밖은 그냥 지원하지 않음).

## Decisions

### Decision 1: Plugin API 채택
**선택:** Figma Plugin API 기반 in-editor 플러그인 단일 형태로만 제공.
**근거:** Variables mode-resolved 값, nested instance override 상세, `exportAsync(SVG)`은 REST `/v1/files/:key` 응답에 포함되지 않거나 Free 플랜에서 제한된다 (`docs/01-overview.md:14-22`). Plugin API는 샌드박스 내부에서 이 데이터를 rate-limit 없이 제공한다.
**대안:**
- **A. REST API + backoff:** `GET /v1/files/:key` 1콜로 트리 획득. 빌드 불필요하지만 Free 플랜 5 req/min 제한 + Variables/override 누락 → 재현 품질 저하.
- **B. 기존 커뮤니티 플러그인 의존:** 설치만으로 끝나지만 대부분 토큰 전용이고 화면 트리 덤프 불가, 출력 스키마 제어 불가 → 목표 미충족.
- **C. `create-figma-plugin` 스캐폴드:** 추상화 과잉, 외부 런타임 의존 증가, MIT OSS로 공개할 때 lock-in 우려.
**트레이드오프:** Figma Desktop 설치 필수 (웹 only 사용자 배제), 플러그인 빌드 환경 유지 필요. 그러나 타겟 사용자군(디자이너 인접 개발자)은 이미 Desktop을 보유한다고 가정.

### Decision 2: Slim + Full 두 산출물 + Slim 3단계 자동 축소 폴백
**선택:** 동일 덤프에서 Full(`design.full.json`, ≤10MB 목표)과 Slim(`design.slim.json`, <500KB 목표)을 동시 산출. Slim이 500KB를 초과하면 3단계 자동 축소: (1) `textSummary` 20→10, (2) `sectionTree` depth 3→2, (3) `tokens` 제외. 각 단계 적용 후 size 재측정, 미만이면 stop. 최종적으로 어느 단계까지 적용됐는지 `meta.degraded` 배열에 기록 (예: `["textSummary:10", "sectionTreeDepth:2"]`).
**근거:** LLM 컨텍스트 윈도우는 도구별로 128K~1M 범위이고, Slim <500KB는 모든 주요 도구에서 안전. Full은 정확 재현 참조용으로 별도 보존 (`docs/03-spec.md:143-177`).
**대안:**
- **A. Full만 제공:** 대용량 파일에서 컨텍스트 초과 → LLM 사용 불가.
- **B. Slim만 제공:** 세부 스타일·override 정보 손실 → 디버깅·정확 재현 경로 차단.
- **C. 단일 "mid" 포맷:** 어느 사용자에도 최적 아님. 두 극단을 모두 주고 사용자가 선택하게 하는 게 실용적.
- **D. Slim 초과 시 에러 throw:** UX 파괴. 자동 축소 + 투명한 `meta.degraded` 기록이 최선.
**트레이드오프:** Slim 스키마가 버전별로 살짝 달라질 수 있어(축소 단계 반영) `schemaVersion` + `meta.degraded` 두 필드로 소비자가 분기해야 한다.

### Decision 3: postMessage 500KB 청크 전송
**선택:** 샌드박스(`code.ts`)에서 `JSON.stringify(dump)` → 500KB 단위 슬라이스 → `{type:'chunk', kind:'full'|'slim', seq, data}` 순차 전송 → 완료 시 `{type:'done', totalSeq}`. UI(`ui.ts`)는 seq 배열에 채운 뒤 `join('')` → Blob.
**근거:** `docs/03-spec.md:191-223`에 이미 설계됨. postMessage structured clone은 동기 순회이고 수 MB 트리에서 Figma Desktop 프리즈/크래시 재현 보고 있음. 문자열 청크는 구조복제 깊이 O(1).
**대안:**
- **A. 객체 통째 전송:** 대용량에서 UI 프리즈.
- **B. Transferable (ArrayBuffer) 활용:** Figma UI postMessage는 transferable 미지원 (main ↔ iframe이 worker가 아님).
- **C. 여러 번 dump API 호출:** 사용자 재시도 부담 + 상태 분산.
**트레이드오프:** UI 쪽 메모리에 전체 문자열을 축적하므로 브라우저 iframe 메모리 한계(~1GB Chromium)가 상한. Full 10MB 목표 기준 충분히 여유.

### Decision 4: esbuild 단독 빌드 + 런타임 외부 의존성 0
**선택:** `build.mjs`에서 esbuild IIFE 번들로 `code.ts`, `ui.ts` 각각 빌드. `ui.ts` 번들 결과 문자열을 `ui.html` 템플릿 주석 자리에 `<script>` 인라인 주입. 런타임 deps 0개, dev deps는 `esbuild`, `typescript`, `@figma/plugin-typings`, `@types/node`만 핀 고정. 동시성 제한은 자체 `pLimit` 15줄 구현 (`src/util/pLimit.ts`).
**근거:** 플러그인은 단일 파일 배포 + Figma Community 심사 대상. 의존성이 적을수록 심사 리스크·supply chain 공격면·유지보수 비용이 줄어든다. `p-limit` npm 패키지를 쓸 만큼 복잡하지 않다.
**대안:**
- **A. webpack / rollup:** 설정 복잡, 번들 사이즈·빌드 시간 열위.
- **B. `create-figma-plugin`:** Preact/CLI 추상화 포함, 외부 의존 20+개.
- **C. `p-limit` + `i18next` npm:** 검증된 라이브러리지만 번들 수 KB 증가 + 공급망 위험.
**트레이드오프:** 자체 pLimit/i18n은 edge case(중첩 queue, plural rule)를 덜 다루므로 기능이 확장되면 재평가 필요. 현재 스코프에는 과잉.

### Decision 5: i18n 자체구현
**선택:** `locales/en.json`, `locales/ko.json`을 esbuild가 정적 import → `src/i18n.ts`에 `t(key, vars?)` 함수 + `setLocale(code)` 구현. locale 감지: (1) `figma.clientStorage.getAsync('locale')`, (2) navigator.language prefix, (3) fallback `en`. 누락 key는 dev 빌드에서 warn + 런타임 en 폴백.
**근거:** v1.0 문자열 수는 30~50개 수준. 라이브러리가 주는 가치(plural, interpolation, lazy load)는 과잉.
**대안:**
- **A. `i18next`:** 업계 표준이지만 번들 수십KB + 런타임 API 복잡.
- **B. `@formatjs/intl`:** ICU 규격, 플러그인 스코프엔 과다.
- **C. locale별 HTML 분리 빌드:** 빌드 artifact 2배, 런타임 전환 불가.
**트레이드오프:** plural/gender rule 미지원. v1.1에서 locale 추가되면 재검토. 지금은 문자열이 명사·버튼 라벨 중심이라 문제 없음.

### Decision 6: Variables `{name, id, value}` 객체 배열
**선택:** Variables 저장 구조를 `Array<{name: string, id: string, valuesByMode: Array<{modeName: string, modeId: string, value: unknown}>}>`. name과 id 둘 다 보존, mode도 이름과 id 둘 다 보존.
**근거:** LLM은 name으로 의미 추론, 도구 체인은 id로 원본 Figma 재매핑. 둘 다 필요. mode도 같은 이유로 양쪽 보존.
**대안:**
- **A. name 전용 `Record<string, unknown>`:** 중복 이름 충돌 + Figma 역매핑 불가.
- **B. id 전용 맵:** LLM 가독성 파괴.
- **C. 변수당 플랫 스키마 (mode를 top-level로):** 모드 수 × 변수 수 레코드 → 중복·크기 폭증.
**트레이드오프:** JSON 크기 증가(~20%). Slim 폴백 3단계에서 tokens 통째 제외가 가능하므로 감수 가능.

### Decision 7: 결정론적 파일명 `figma.{fileSlug}.{pageSlug}.slim.json`
**선택:** 파일명 규약 `figma.{fileSlug}.{pageSlug}.{slim|full}.json`. `fileSlug`는 `figma.root.name`을 kebab-case ASCII로 정규화, 비ASCII는 음역 대신 punycode-like fallback (`x-` prefix + base32). `pageSlug`는 전체 페이지 덤프면 `all`, 단일 페이지면 해당 페이지 이름을 동일 규칙으로.
**근거:** 여러 파일을 한 디렉토리에 누적 저장하는 사용자 패턴을 지원. 고정명(`design.slim.json`)은 덮어쓰기 충돌. 결정론성은 git diff 노이즈 최소화에 필수.
**대안:**
- **A. `design.slim.json` 고정:** v2 원안. 덮어쓰기·멀티 파일 불가.
- **B. 타임스탬프 포함 (`figma.{slug}.{iso}.slim.json`):** 같은 파일 재덤프마다 파일 증가 → 사용자 수동 정리 부담.
- **C. 해시 기반 (`figma.{fileKey}.slim.json`):** fileKey는 Plugin API에서 직접 획득 불가.
**트레이드오프:** slug 충돌 가능성(서로 다른 파일이 같은 이름). 문서에 "동일 이름 파일은 수동 확인" 명시 + `meta.fileName` 원문 보존으로 완화.

### Decision 8: `documentAccess: "dynamic-page"` + Async 전면 + 50노드 yield
**선택:** `manifest.documentAccess: "dynamic-page"` 고정. 모든 Figma API 호출을 `*Async` 버전으로 통일. DFS traversal에서 50노드 처리마다 `await new Promise(r => setTimeout(r, 0))`로 이벤트 루프 양보.
**근거:** `dynamic-page` 모드는 대형 파일 lazy page load를 가능케 해 메모리 풋프린트를 줄인다 (`docs/02-architecture.md:55-58`). 대신 동기 API는 throw. 50노드 yield는 `docs/05-risks.md:6`에서 정한 값, Figma "Not responding" 회피 실측 기반.
**대안:**
- **A. `documentAccess` 미지정 (동기 허용):** 대형 파일 메모리 OOM.
- **B. 노드마다 yield:** 성능 저하 ~10배.
- **C. 시간 기반 yield (`performance.now() % 16ms`):** 구현 복잡, 노드 기반이 더 결정론적.
**트레이드오프:** Figma Desktop 최소 버전이 제한될 수 있음 (`dynamic-page` 지원 필요) → Open Question 1.

## Risks / Trade-offs

| 리스크 | 심각도 | 완화 | 잔여 위험 |
|---|---|---|---|
| 대용량 파일 UI 프리즈 | 높음 | 50노드마다 async yield + `dynamic-page` lazy load + progress 스트림 | 10만 노드+ 초대형 파일은 여전히 60초+ 걸릴 수 있음 |
| postMessage structured clone 폭탄 | 높음 | stringify + 500KB 청크 + seq 재조립 | 10MB+ Full 덤프는 UI 메모리 축적 ~30MB 피크 |
| SVG export 병목/메모리 | 중 | `pLimit(10)` + 총 100개 cap + ≤64×64 필터 + 각 export try/catch | 희귀 벡터에서 `exportAsync` OOM → `svgFailed` 카운트만 올리고 계속 |
| Slim 500KB 초과 (폴백 실패) | 중 | 3단계 축소 후 여전히 초과 시 `meta.degraded` 마지막 엔트리 `"exceededAfterFullDegrade"` + UI 경고 | 극초대형 파일에서는 Slim 컨텍스트 활용 불가, Full만 사용 안내 |
| Figma Plugin API 스키마 drift | 중 | `@figma/plugin-typings` 버전 핀 고정 + CI `tsc --noEmit` + 월 1회 의존성 upgrade 리뷰 | API breaking 변경 시 긴급 패치 릴리즈 필요 |
| i18n 누락 locale | 낮 | en을 canonical 선언, 누락 key는 자동 en 폴백 + dev warn + CI에서 `ko.json` key set === `en.json` key set 검증 | 신규 locale 기여 PR 품질 편차 |
| Figma Community 심사 거부 | 중 | publish 전 dev-plugin으로 잠깐살래 검증 필수 + manifest 스키마 검증 CI + 커버/아이콘/스크린샷 규격 체크리스트 | 심사 피드백에 따라 카피/권한 재조정 라운드 발생 |
| 악의적 파일로 샌드박스 OOM | 낮 | 노드 수 10만 초과 시 사용자 확인 prompt + SVG cap 100 하드리밋 + try/catch 전면 | DoS 성격 공격은 Figma Desktop이 1차 방어, 플러그인은 fail-safe만 보장 |

## Migration Plan

**문서 이동 (BREAKING):**
1. `docs/01-overview.md`, `docs/02-architecture.md`, `docs/03-spec.md`, `docs/04-implementation.md`, `docs/05-risks.md`, `docs/06-handoff.md`, `docs/CHANGELOG.md`를 `docs/legacy/`로 이동 (git mv).
2. `docs/` 루트에는 신규 영문 README (플러그인 소개·설치·사용법) + 한글 README + OpenSpec 포인터만 둔다.
3. `docs/README.md`(기존) 내용을 legacy로 이동하고 신규 README가 대체.

**v2 가정 제거:**
- `docs/06-handoff.md:5-17`의 `4quadverse-app/docs/figma/dump/` 경로 하드코딩 → legacy 이동으로 자연 제거. 범용 README에 "임의의 디렉토리에 저장" + 도구별 (Claude Code/Cursor/Copilot/Aider/Generic) 통합 스니펫 섹션.
- `manifest.name: "Quickstay Design Dumper"` (`docs/04-implementation.md:12-13`) → `Figma Design Dumper` 또는 유사 범용명. 최종안은 Open Question 2.
- `docs/04-implementation.md:104-105` 메인 앱 절대경로 수동 복사 단계 → README의 "다운로드 후 원하는 위치에 저장" 안내로 교체.

**변경 관리:**
- 이 change부터 모든 변경은 `openspec/changes/{change-name}/` 하위 proposal.md + design.md + tasks.md 구조로 관리. archived는 `openspec/archive/`.

**배포 플로우:**
1. `npm run build` → `dist/code.js`, `dist/ui.html` 생성.
2. Figma Desktop "Plugins → Development → Import plugin from manifest" 로컬 로드.
3. 잠깐살래 Figma 파일로 실전 덤프 → Slim/Full 크기·schema·degraded 검증 (첫 검증 사용자 케이스).
4. GitHub Actions CI 전체 green → `v1.0.0` 태깅 → `gh release create` → release asset에 `dist/` zip.
5. Figma Community publish: 아이콘 128×128, 커버 1920×960, 스크린샷 3장(en 2 / ko 1), 한·영 설명문, 샘플 데모 Figma 파일(자체 제작 ~50노드) publish + 링크.
6. 사용자 피드백 수집 창구: GitHub Issues (우선) + Community 댓글 (보조).

**롤백:**
현재 구현 코드가 0줄이고 문서만 legacy로 이동하므로 기술 롤백 필요 없음. 문서 롤백은 git history (`git revert`)로 복구. publish 후 치명 버그 시 Community에서 플러그인 unpublish 가능(Figma 제공 기능), GitHub은 태그 유지 + hotfix 패치 릴리즈.

## Resolved Decisions (Round 3 인터뷰)

1. **Figma Desktop 최소 버전 정책** (확정): `dynamic-page` API가 공식 지원되는 최소 Figma Desktop 버전을 README에 명시. 정확한 버전 번호는 publish 직전 Figma 공식 changelog 재확인으로 확정(현 시점 추정 2024.10+). Legacy 동기 API 폴백은 v1.0에 포함하지 않음.
2. **최종 플러그인명** (확정): **`Design Context for LLMs`**. manifest.json의 `name`, Figma Community 리스팅, README 제목, CHANGELOG 헤더 전부 이 이름 사용. 로컬 레포 디렉토리·OpenSpec change slug는 식별자 연속성을 위해 기존 `figma-design-dumper` 유지. GitHub 레포 slug 기본값 `design-context-for-llms`.
3. **GitHub 공개 위치** (확정): **`github.com/mercuryPark/design-context-for-llms`** (개인 계정). MIT 저작권자 표기 `mercuryPark`. 초기 세팅 즉시 가능, 기여자 유입 시 Organization 이전 경로 열어둠.
4. **Figma Community publish 정책** (확정): **무료 + 공개 + Tipping 비활성**. 순수 OSS 포지셔닝과 "MCP 비용 부담 없이" 미션 일치.

## Remaining Open Questions

1. **Figma Desktop 정확 버전 번호**: publish runbook Step 1에서 Figma changelog 조회해 README에 박는다. 조사만 남은 항목.
2. **아이콘·커버·스크린샷 최종 디자인**: `Design Context for LLMs` 네이밍에 맞춘 비주얼 에셋(128×128 아이콘, 1920×960 커버, 스크린샷 3장)은 Task Group 14에서 실제 제작. 디자인 톤(미니멀/테크/플레이풀)은 제작 단계에서 별도 판단.
