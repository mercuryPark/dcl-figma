# 02. Architecture — 구조 & 스택 & 제약

## 1. 프로젝트 구조

```
figma-plugin/
├── manifest.json
├── src/
│   ├── code.ts                # 플러그인 메인 (샌드박스)
│   ├── ui.html                # iframe UI 템플릿
│   ├── ui.ts                  # iframe 로직 (esbuild 인라인 주입)
│   ├── types.ts               # DesignDump / DesignSlim 타입
│   ├── extract.ts             # 노드 타입별 추출기
│   ├── tokens.ts              # 스타일/변수 추출기
│   ├── svg.ts                 # SVG export + concurrency limit
│   ├── slim.ts                # full → slim 변환기
│   └── util/
│       ├── pLimit.ts          # 자체 구현 (약 15줄)
│       └── prune.ts           # null / 기본값 제거
├── dist/
│   ├── code.js                # esbuild 번들
│   └── ui.html                # ui.ts가 인라인된 최종 HTML
├── package.json
├── tsconfig.json
├── build.mjs                  # esbuild 스크립트
├── .gitignore
└── README.md
```

## 2. 기술 스택

| 영역 | 선택 |
|------|------|
| 런타임 | Figma Plugin API (샌드박스 JS) |
| 언어 | TypeScript (strict) |
| 빌드 | esbuild IIFE 번들 (외부 npm 런타임 의존성 0) |
| UI | HTML + inline JS (ui.ts → esbuild → `<script>` 인라인) |
| 타입 | `@figma/plugin-typings` (devDep) |
| 동시성 | 자체 `pLimit` (15줄 구현), `p-limit` npm 미사용 |

## 3. 빌드 전략

- `src/code.ts` → `dist/code.js` (format: IIFE, platform: browser, target: es2017)
- `src/ui.ts` → 번들 문자열 → `src/ui.html` 템플릿의 `<!-- inject:script -->` 주석 위치에 `<script>...</script>` 로 삽입 → `dist/ui.html`
- 외부 런타임 의존성 0, devDep만 허용

## 4. Figma Plugin API 제약 (2026-04 기준)

### 필수 준수
- **fileKey 직접 접근 불가** — 사용자 수동 입력 or `manifest.id` 사용
- **네트워크 요청 차단** — `manifest.networkAccess.allowedDomains: ["none"]` 으로 명시
- **파일시스템 직접 접근 불가** — UI iframe → Blob 다운로드만 가능
- **Async API 필수** — `getLocalPaintStyles()` 등 동기 API는 `documentAccess: "dynamic-page"` 모드에서 에러. `*Async` 사용 필수
- **UI 프리즈 관리** — 명시적 timeout은 없지만 프리즈 시 사용자가 강제종료 가능 → 순회 중 yield 필수

### 권장
- `documentAccess: "dynamic-page"` 명시 — 대형 파일 lazy 페이지 로드 + 모던 async API 정합성
- `@figma/plugin-typings` 버전 `package.json`에 고정 (API 스키마 변경 대비)

## 5. 보안 & 컴플라이언스

- 내 파일만 읽음 → Figma ToS 위반 없음
- 외부 서버 전송 없음 → 완전 로컬
- 플러그인 개발자(= 나) 외 데이터 노출 경로 없음

## 6. 참고 문서

- [Figma Plugin API](https://www.figma.com/plugin-docs/)
- [Plugin Samples (GitHub)](https://github.com/figma/plugin-samples)
- [`@figma/plugin-typings` (npm)](https://www.npmjs.com/package/@figma/plugin-typings)
- [Variables API](https://www.figma.com/plugin-docs/api/figma-variables/)
- [`documentAccess` 가이드](https://www.figma.com/plugin-docs/manifest/#documentaccess)
