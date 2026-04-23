# Design Context for LLMs

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](/LICENSE)
[![Figma Plugin](https://img.shields.io/badge/Figma-Plugin-1E1E1E)](https://www.figma.com/community)
[![네트워크 접근 없음](https://img.shields.io/badge/Network-Zero-brightgreen)](#프라이버시와-보안)

> **다른 언어로 보기:** [English](/README.md)

LLM이 바로 읽을 수 있는 JSON 스냅샷을 Figma 파일에서 추출하는 **무료 오픈소스 Figma 플러그인**입니다. 결과물을 Claude Code / Cursor / GitHub Copilot / Aider 또는 아무 LLM 세션에 붙여 넣으세요. 실제 화면·토큰·컴포넌트 구조를 근거로 LLM이 UI 코드를 생성합니다.

- 🟢 **제로 네트워크, 제로 텔레메트리.** `networkAccess.allowedDomains: ["none"]` — 플러그인이 외부로 데이터를 보낼 수 없습니다.
- 📄 **두 개의 결정론적 산출물.** `Slim`(< 500KB, LLM 친화) + `Full`(≤ 10MB, 손실 없음).
- 🧠 **Self-documenting JSON.** `$schema`, `schemaVersion`, `_howToUse` 가 파일 선두에 있어 파일 하나만 봐도 용도가 설명됩니다.
- 🌐 **영어 + 한국어** i18n 내장.
- 🆓 **MIT 라이선스** — 영구 무료, Figma 유료 플랜 불필요.

## 왜 만들었나

Figma 자체 MCP 서버는 유료 플랜을 요구합니다. 많은 커뮤니티 플러그인은 토큰만 뽑거나, 전체 트리를 그대로 뱉어 LLM 컨텍스트 윈도우를 초과합니다. `Design Context for LLMs` 는 그 중간 지점입니다. 모든 LLM 코딩 도구에 줄 수 있는, 크기 상한이 걸린, 도구 중립 JSON 을 — **무료로, 그리고 데이터 한 바이트도 기기 밖으로 보내지 않고** 제공합니다.

## 설치

> **상태:** 릴리즈 전. v1.0 Figma Community publish 는 [`openspec/changes/universal-plugin-rebrand`](/openspec/changes/universal-plugin-rebrand) 에서 추적합니다.

### Figma Community 에서 설치 (v1.0 출시 후 권장)

1. Figma Desktop 실행.
2. 커뮤니티 페이지 방문 (publish 시 링크 추가).
3. **Open in…** 으로 아무 파일에서 실행.

### 소스에서 빌드 (개발)

```bash
git clone https://github.com/mercuryPark/design-context-for-llms.git
cd design-context-for-llms
npm ci
npm run build
```

그 다음 Figma Desktop 에서 **Plugins → Development → Import plugin from manifest…** 로 `manifest.json` 선택.

### 요구 사항

- Figma **Desktop** (웹 전용 환경은 미지원).
- 현재 유지보수되는 Figma Desktop 빌드 전부 지원. 이 플러그인은 `dynamic-page` document access API 를 사용하는데, [2024-02-21 에 GA 됐고](https://www.figma.com/plugin-docs/updates/2024/02/21/version-1-update-87/) 2024-04 부터 신규 플러그인에 필수로 강제되어 현재 시점 모든 Figma Desktop 에서 동작합니다.

## 사용법

1. Figma 파일을 엽니다.
2. **Plugins → Design Context for LLMs** 실행.
3. **Dump** 버튼 클릭.
4. 세 가지 액션 중 선택:
   - **Download Slim** — LLM 대화창에 드래그 앤 드롭.
   - **Download Full** — diff / 상세 레퍼런스용 보존.
   - **Copy Slim to Clipboard** — 코딩 에이전트 세션에 붙여넣기.

고급 옵션(SVG export, 숨김 노드 포함, 토큰 포함, 범위 선택)은 **Advanced options** 접힘 패널 안에 있고, `figma.clientStorage` 를 통해 파일별로 자동 저장됩니다.

## 산출물

결정론적 파일명 규약:

```
figma.{fileSlug}.{pageSlug}.slim.json
figma.{fileSlug}.{pageSlug}.full.json
```

전체 페이지 덤프 시 `pageSlug` 는 `all` 로 고정됩니다. 모든 산출물의 선두:

```json
{
  "$schema": "https://design-context-for-llms.dev/schemas/1.0.json",
  "schemaVersion": "1.0",
  "_howToUse": "Figma design dump for LLM context. Load this JSON and reference screens[], tokens, and components when generating UI code.",
  "meta": { "fileKey": "...", "pageId": "...", "generatedAt": "...", "tool": "design-context-for-llms@1.0.0", "degraded": [] }
}
```

상세 계약은 [`docs/SCHEMA.md`](/docs/SCHEMA.md) 참고.

## 통합 스니펫

> `{{project_root}}` 는 로컬 디렉토리로 치환하세요. 플러그인은 JSON 위치를 강제하지 않습니다.

### Claude Code

```
Figma 덤프 파일을 {{project_root}}/figma.my-app.home.slim.json 에 저장했습니다.

이 파일을 읽고 UI 코드를 생성할 때 다음을 참조하세요:
- `screens[]` — 레이아웃과 문구,
- `tokens.colors` / `tokens.typography` — 디자인 토큰,
- `components[]` — 재사용 패턴.

JSON 에 없는 컴포넌트 이름은 임의로 만들지 마세요.
```

### Cursor

```
@figma.my-app.home.slim.json

이 Figma 덤프를 화면 구조·문구·토큰의 source of truth 로 사용하세요. 토큰은 hex 와 이름을 그대로 매칭하고, `visible` 이 명시적으로 false 인 노드는 무시합니다.
```

### GitHub Copilot (Workspace / Chat)

```
/explain 파일 `figma.my-app.home.slim.json` 을 디자인 참조로 사용합니다. 컴포넌트를 요청하면 `components[]` 의 대응 항목으로 매핑하고, `tokens.typography` 의 line-height 를 반드시 반영하세요.
```

### Aider

```bash
aider figma.my-app.home.slim.json src/
# 이어지는 대화에서:
# figma.*.slim.json 을 UI 스펙의 정본으로 사용하세요. 필드: screens, tokens, components.
```

### Generic (도구 중립)

```
JSON 파일 design.slim.json (Figma 디자인 덤프) 을 로드합니다. 최상위에는 다음이 포함됩니다:
- meta (파일 생성 컨텍스트),
- tokens (디자인 토큰: colors, typography, effects, variables),
- screens (화면 단위 요약, `sectionTree` 와 `textSummary`),
- components (재사용 정의).

코드를 생성할 때 토큰 이름을 그대로 반영하고, `sectionTree` 계층 구조를 존중하며, `textSummary` 문자열은 원문 그대로 사용하세요.
```

## 프라이버시와 보안

- **네트워크 접근 없음.** `manifest.json` 에 `networkAccess.allowedDomains: ["none"]` 선언. 런타임에서 Figma 가 `fetch` / `XMLHttpRequest` 를 차단합니다.
- **텔레메트리 없음.** 애널리틱스·오류 리포트·비콘 모두 0 개.
- **로컬 한정.** 디자인 데이터의 흐름: Figma 샌드박스 → 플러그인 UI iframe → `<a download>` / 클립보드. 그 외 경로 없음.
- 상세: [`SECURITY.md`](/SECURITY.md).

## 기여

이슈·PR·새로운 locale 기여를 환영합니다. 빌드·테스트·릴리즈 워크플로는 [`CONTRIBUTING.md`](/CONTRIBUTING.md) 참고.

## 로드맵 (v1.1+)

- 페이지별 분할 출력.
- 옵션 프리셋 저장/공유.
- 추가 locale (`ja`, `zh`, `es` — PR 환영).
- Figma Code Connect 통합.

## 라이선스

[MIT](/LICENSE) © mercuryPark and contributors.
