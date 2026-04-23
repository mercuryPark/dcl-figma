# 04. Implementation — Phase 1~6 + 수용 기준 + 검증

## Phase 1 — 프로젝트 스캐폴딩 (약 30분)

### 작업
- [ ] `package.json` 초기화, devDep: `@figma/plugin-typings`, `esbuild`, `typescript`, `@types/node`
- [ ] `manifest.json` 작성 (필수 필드 전부):
  ```json
  {
    "name": "Quickstay Design Dumper",
    "id": "quickstay-design-dumper-20260423",
    "api": "1.0.0",
    "main": "dist/code.js",
    "ui": "dist/ui.html",
    "editorType": ["figma"],
    "documentAccess": "dynamic-page",
    "networkAccess": { "allowedDomains": ["none"] }
  }
  ```
- [ ] `tsconfig.json`: target ES2017, strict, lib: ["DOM", "ES2020"], typeRoots에 `@figma/plugin-typings`
- [ ] `build.mjs`: esbuild로 `src/code.ts` → `dist/code.js` (IIFE), `src/ui.ts` → 번들 문자열 → `src/ui.html` 템플릿의 주석 위치에 `<script>` 인라인 주입 → `dist/ui.html`
- [ ] Figma Desktop "개발 중 플러그인 가져오기"로 `manifest.json` 등록 → 빈 UI 확인

### 수용 기준
- [ ] `npm run build` 종료 코드 0
- [ ] `dist/code.js` 존재 및 문법 유효
- [ ] `dist/ui.html` 에 `<script>` 태그 인라인
- [ ] Figma Desktop Plugins → Development → 플러그인 실행 시 iframe 열림

---

## Phase 2 — 노드 순회 코어 (약 1-2시간)

### 작업
- [ ] `figma.root.children` 순회 (`currentPageOnly` 옵션 적용)
- [ ] DFS 재귀 traversal + 매 50 노드마다 `await new Promise(r => setTimeout(r, 0))` yield
- [ ] 타입별 추출기 (`src/extract.ts`):
  - `extractFrame(node)`
  - `extractText(node)`
  - `extractVector(node)`
  - `extractInstance(node)`
  - `extractGroup(node)`
- [ ] 진행 상황: `figma.ui.postMessage({ type: 'progress', processed, total, stage })` 스트림

### 수용 기준
- [ ] 잠깐살래 파일 전체 순회 시 UI "처리 중" 인디케이터 끊김 없이 업데이트
- [ ] `stats.totalNodes` 가 Figma에서 수동으로 센 노드 수와 오차 10% 이내
- [ ] Chrome DevTools (Plugin 디버거) "Not responding" 경고 0회

---

## Phase 3 — 토큰 추출 (약 30분)

### 작업
- [ ] `figma.getLocalPaintStylesAsync()` → colors
- [ ] `figma.getLocalTextStylesAsync()` → typography
- [ ] `figma.getLocalEffectStylesAsync()` → effects
- [ ] `figma.variables.getLocalVariableCollectionsAsync()` + `getLocalVariablesAsync()` → 모드별 resolved 값
- [ ] Variables 없는 파일: try/catch → `?? []` 폴백, `meta.stats.variablesError` 기록

### 수용 기준
- [ ] 잠깐살래에 정의된 PaintStyle 개수와 `tokens.colors.length` 일치
- [ ] Variables API가 throw / undefined 반환해도 플러그인 크래시 없이 완료

---

## Phase 4 — UI & 출력 (약 1시간)

### 작업
- [ ] `src/ui.html` + `src/ui.ts`: 옵션 체크박스 + 버튼 + 진행 영역
- [ ] 코어 트리거: `parent.postMessage({ pluginMessage: { type: 'dump', options } }, '*')`
- [ ] 청크 수신 → 배열 축적 → `join('')` → Blob → `<a download>` 트리거 (Full / Slim 각각)
- [ ] 클립보드 복사: `navigator.clipboard.writeText(slimString)`

### 수용 기준
- [ ] 덤프 시작 → 진행률 표시 → Full / Slim 다운로드 버튼 활성화
- [ ] 다운로드 파일이 유효 JSON (`JSON.parse` 성공)
- [ ] 클립보드 복사 시 `pbpaste` 로 동일 내용 확인 가능

---

## Phase 5 — 최적화 & Slim 변환 (약 45분)

### 작업
- [ ] 순환참조 방지 (instance → mainComponent는 id만)
- [ ] 자체 `pLimit(10)` (Promise queue 15줄) → SVG export 병렬화
- [ ] `prune()` 함수 (spec §2 규칙 적용)
- [ ] `toSlim(full)` (`src/slim.ts`) → full → slim 변환
- [ ] `meta.stats` 집계 (`elapsedMs` 포함)

### 수용 기준
- [ ] `design.full.json` < 10MB
- [ ] `design.slim.json` < 500KB
- [ ] 1000+ 노드 덤프 60초 이내 완료
- [ ] SVG ON + 아이콘 100개 이상 파일에서 메모리 에러 없음 (cap 동작)

---

## Phase 6 — 실행 & 전달 (약 10분)

### 작업
- [ ] 잠깐살래 Figma 파일 열고 플러그인 실행 (전체 페이지, SVG OFF 권장)
- [ ] Full / Slim JSON 다운로드
- [ ] `/Users/hoyeon/Documents/workspace/4quadverse-app/docs/figma/dump/` 생성
- [ ] `design.full.json`, `design.slim.json`, `README.md` (생성일/버전/stats) 배치
- [ ] 메인 앱 세션에서 slim JSON 기준으로 리팩토링 시작 ([06-handoff.md](./06-handoff.md) 템플릿 사용)

### 수용 기준
- [ ] 메인 앱 레포에 두 파일 존재
- [ ] 메인 앱 별도 세션에서 "slim JSON 읽고 모든 페이지 이름과 각 페이지의 top-level 프레임 개수/크기를 표로" 요청 시 정확한 응답

---

## 전체 수용 기준 (요약)

- [ ] `npm run build` 에러 없이 완료, `dist/code.js` + `dist/ui.html` 생성
- [ ] Figma Desktop 로드 성공
- [ ] 덤프 시작 → 60초 이내 Full + Slim JSON 두 개 다운로드
- [ ] Full JSON이 `DesignDump` 인터페이스 만족
- [ ] Slim JSON이 `DesignSlim` 인터페이스 만족, 크기 < 500KB
- [ ] `meta.stats.totalNodes > 1000` (잠깐살래 규모 기준)
- [ ] `tokens.colors.length > 0`, `tokens.typography.length > 0`
- [ ] 두 파일을 `docs/figma/dump/`에 배치 후 Claude 세션에서 페이지/프레임 표 정리 요청 성공
- [ ] `manifest.json` 에 `id`, `documentAccess`, `networkAccess.allowedDomains` 모두 존재

---

## 검증 단계 (실행 순서)

1. **빌드** — `npm run build` 에러 0
2. **로드** — Figma Desktop에서 플러그인 UI 표시
3. **스모크** — 작은 샘플 파일(< 50 노드)로 덤프 → JSON 스키마 수동 확인
4. **풀 덤프** — 잠깐살래 전체 페이지 덤프 → `stats` 값 검증
5. **메인 앱 연계 (yes/no 테스트)** — slim JSON 배치 후 메인 앱 세션에서:
   > "slim JSON을 읽고 모든 페이지 이름과 각 페이지 top-level 프레임 개수/크기를 표로 정리해줘"

   응답이 slim JSON에 기반해 정확하면 **통과**.
