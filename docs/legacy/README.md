# Legacy Planning Archive — 잠깐살래 v1 / v2

> 잠깐살래(`4quadverse-app`) 전용 1회성 도구 시절의 계획·스펙·핸드오프 문서 히스토리 보존.
>
> 여기 문서들은 프로젝트 정체성을 **범용 오픈소스 Figma-to-LLM Plugin** — *Design Context for LLMs* — 으로 전환하기 이전의 레퍼런스입니다. 현재 플러그인의 계약·스펙은 레포 루트의 `README.md` 와 `openspec/` 을 참고하세요.

## Contents

- `01-overview.md` — v1/v2 개요 및 Plugin API/REST 비교 ADR.
- `02-architecture.md` — v2 아키텍처 초안 (manifest, 샌드박스, postMessage).
- `03-spec.md` — v2 기술 스펙 (노드 추출, Slim/Full, 500KB 청크 등).
- `04-implementation.md` — v2 구현 계획 및 마일스톤.
- `05-risks.md` — v2 리스크 레지스터.
- `06-handoff.md` — 잠깐살래 전용 핸드오프 절차 (절대경로 하드코딩 포함).
- `CHANGELOG.md` — v1/v2 기획 단계 변경 로그.
- `README-v1-v2.md` — 구 `docs/README.md`.

## 왜 보존하는가

- 초기 설계 결정의 근거·대안 비교가 담겨 있어 추후 아키텍처 재검토에 유용합니다.
- Slim/Full 2 산출물 ADR, `dynamic-page` 결정, 500KB 청크 프로토콜 등 v1.0 스펙이 그대로 계승한 결정의 원출처입니다.

## 참고: 제거된 가정

- `4quadverse-app` 전용 절대 경로 (`/Users/.../4quadverse-app/docs/figma/dump/`).
- 메인 앱 `CLAUDE.md` 강제 편집 단계.
- `design.slim.json` / `design.full.json` 고정 파일명.
- 단일 프로젝트 핸드오프 전제.

이 가정들은 범용 레포에서는 유효하지 않으며, 현재 규약은 `README.md` 와 `openspec/changes/universal-plugin-rebrand/` 에 정의되어 있습니다.
