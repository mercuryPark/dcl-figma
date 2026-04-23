# 05. Risks — 위험 & 완화 + Pre-mortem

## 1. 위험 & 완화 (구체 파라미터 포함)

| 위험 | 완화 | 구체 파라미터 |
|------|------|---------------|
| 대용량 파일 UI 프리즈 | 순회 중 yield | 매 **50 노드**마다 `await setTimeout(0)` |
| postMessage 구조복제 폭탄 | stringify + chunk 전송 | **500KB 청크**, seq 기반 재조립 |
| `getLocalPaintStyles()` sync API 에러 | Async 버전만 사용 | `getLocalPaintStylesAsync` 등 4종 |
| SVG export 병목/메모리 | pLimit + cap | 동시 **10개**, 총 **100개** cap, naming `icon/*` 또는 ≤ 64px |
| JSON 크기 폭증 | prune + slim | prune 규칙([03-spec.md §2](./03-spec.md)), slim 변환 ([03-spec.md §3](./03-spec.md)) |
| 순환참조 | id만 저장 | `instance.mainComponentId` (문자열) |
| Variables 미사용 파일 | optional + try/catch | `tokens.variables` 옵셔널, 예외 시 `[]` |
| Claude 컨텍스트 초과 | slim JSON 별도 산출 | slim **< 500KB** 목표 |
| Figma API 스키마 변경 | 버전 핀 | `@figma/plugin-typings` 버전 `package.json`에 명시 |
| 부동소수 오차로 diff 노이즈 | 반올림 규칙 | 좌표/크기 **소수점 2자리** |

---

## 2. Pre-mortem — 실패 시나리오

> "플러그인이 실패했다. 왜?"를 미리 시뮬레이션해서 감지/완화 경로를 준비한다.

### 시나리오 1 — 잠깐살래 파일이 실제로 10,000+ 노드 (예상보다 5배)

- **증상:** 순회 중 UI "Not responding", 메모리 1GB+ 점유
- **완화:**
  - 페이지별 분할 덤프 옵션 사전 구현
  - `currentPageOnly` 모드로 한 페이지씩 덤프 → 수동 병합 가이드 제공
  - 단계적 롤아웃: 1개 페이지 → 3개 → 전체
- **감지:** Phase 2 수용 기준 ("Not responding 0회") 실패 시 즉시 중단

### 시나리오 2 — Variables API 가 null 또는 throw

- **증상:** `tokens.variables` 가 비어있거나 플러그인 크래시
- **완화:**
  - 모든 Variables 호출 try/catch
  - catch에서 `console.warn` + `[]` 폴백
  - `meta.stats.variablesError: string` 필드로 실패 이유 기록
- **감지:** Phase 3 수용 기준 "크래시 없이 완료"

### 시나리오 3 — `exportAsync` 가 특정 벡터 노드에서 실패

- **증상:** SVG export 중 "memory access out of bounds" 또는 타임아웃
- **완화:**
  - 각 `exportAsync` 를 try/catch
  - 실패한 노드는 `svgExportFailed: true` 플래그로 기록하고 계속
  - `meta.stats.svgFailed: number` 집계
- **감지:** SVG export ON + 100+ 아이콘 테스트 파일

### 시나리오 4 — slim JSON 이 500KB 초과

- **증상:** `textSummary` / `sectionTree` 가 과도하게 큼
- **완화:**
  - slim 생성 시 크기 측정 → 초과 시:
    - `textSummary` 샘플 개수 축소
    - `sectionTree` depth 축소 (3 → 2)
  - 경고 메시지 + 자동 재생성
- **감지:** Phase 5 수용 기준 크기 체크

### 시나리오 5 — Figma Desktop 이 manifest 거부 (documentAccess 미지원 버전)

- **증상:** 플러그인 로드 시 "Manifest parse error"
- **완화:**
  - `documentAccess` 필드를 옵션으로 처리
  - 최초 시도 실패 시 해당 필드 제거한 manifest 제공
  - README에 Figma Desktop 최소 버전 (2024.10+) 명시
- **감지:** Phase 1 수용 기준 "iframe 열림"

---

## 3. 감지→완화 매트릭스

| Phase | 감지 신호 | 관련 시나리오 |
|-------|-----------|---------------|
| 1 | manifest 로드 실패 | 5 |
| 2 | "Not responding" 경고, 노드 수 예상 초과 | 1 |
| 3 | Variables API 예외 | 2 |
| 5 | SVG 실패 카운트 > 0, slim > 500KB | 3, 4 |
