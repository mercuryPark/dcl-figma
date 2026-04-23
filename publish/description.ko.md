# Design Context for LLMs

**무료·제로 텔레메트리 Figma → LLM JSON 내보내기.**

Figma 디자인을 Claude Code, Cursor, GitHub Copilot, Aider 같은 LLM 세션에 바로 넣으세요. 한 번의 클릭으로 화면·디자인 토큰·컴포넌트를 담은 깔끔하고 용량 제한이 걸린 도구 중립 JSON 스냅샷을 얻습니다 — 무료, 데이터 한 바이트도 기기 밖으로 보내지 않고.

---

## 뭘 하는 플러그인인가

- **산출물 2개, 원클릭.**
  - `Slim` (< 500 KB): 화면 요약·토큰·컴포넌트 인덱스. 어떤 LLM 컨텍스트 윈도우에도 여유롭게 들어갑니다.
  - `Full` (≤ 10 MB): 손실 없는 노드 트리. diff 와 상세 레퍼런스용.
- **Self-documenting JSON.** 모든 파일 선두에 `$schema`, `schemaVersion`, 한 줄 `_howToUse` 가 있어 LLM 이 파일 하나만 받아도 용도를 즉시 이해합니다.
- **스마트 자동 축소.** Slim 이 500 KB 를 넘으면 `textSummary` 밀도 축소 → `sectionTree` 깊이 축소 → `tokens` 제외 순으로 단계별 축소가 자동 적용되고, 각 단계가 `meta.degraded` 에 투명하게 기록됩니다.
- **영어 + 한국어.** 런타임 locale 토글 내장.
- **결정론적 파일명.** `figma.{fileSlug}.{pageSlug}.slim.json` / `.full.json` — 한글 로마자화, 타임스탬프 없음, diff 친화적.
- **Opt-in SVG export.** 아이콘(`icon/*` 네이밍 또는 ≤ 64 × 64) 한정, 개수·동시성 하드리밋 포함.

## 사용법

1. Figma 파일을 엽니다.
2. **Plugins → Design Context for LLMs** 실행.
3. **Dump** 버튼 클릭.
4. 세 가지 중 선택:
   - **Download Slim** — LLM 대화창에 드래그.
   - **Download Full** — 상세 레퍼런스용 보존.
   - **Copy Slim to Clipboard** — 코딩 에이전트 세션에 바로 붙여넣기.

그 다음 LLM 에 붙여넣고:

> *Figma 덤프(`figma.*.slim.json`) 를 첨부했어. `ScreenName` 화면을 만들 때 구조는 `screens[]` 참고하고, 디자인 토큰은 `tokens.colors` / `tokens.variables` 를, 재사용 패턴은 `components[]` 를 참고해.*

Claude Code, Cursor, GitHub Copilot, Aider, 도구 중립 프롬프트 복붙 가능한 스니펫은 [README](https://github.com/mercuryPark/design-context-for-llms/blob/main/README.ko.md#%ED%86%B5%ED%95%A9-%EC%8A%A4%EB%8B%88%ED%8E%AB) 참고.

## 프라이버시

- **네트워크 접근 없음.** `manifest.json` 에 `networkAccess.allowedDomains: ["none"]` 선언 — 런타임에서 Figma 가 외부 호출을 차단합니다.
- **텔레메트리 없음.** 애널리틱스·비콘·오류 리포트 모두 0 개.
- **로컬 한정.** 디자인 데이터 흐름: Figma 샌드박스 → 플러그인 UI iframe → `<a download>` / 클립보드. 그 외 경로 없음. MIT 라이선스 소스를 [github.com/mercuryPark/design-context-for-llms](https://github.com/mercuryPark/design-context-for-llms) 에서 직접 감사하세요.

## 링크

- **GitHub**: [mercuryPark/design-context-for-llms](https://github.com/mercuryPark/design-context-for-llms)
- **샘플 Figma 파일**: *(샘플 파일 Community publish 후 링크 추가 예정)*
- **문서**: [SCHEMA.md](https://github.com/mercuryPark/design-context-for-llms/blob/main/docs/SCHEMA.md)
- **이슈 제보**: [GitHub Issues](https://github.com/mercuryPark/design-context-for-llms/issues)

MIT 라이선스. Figma 유료 플랜 불필요.
