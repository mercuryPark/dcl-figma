# Figma Design Dumper — 문서 인덱스

> Figma Free 플랜 REST API rate limit을 회피하기 위해 Figma Plugin API 기반 자체 덤프 플러그인을 개발한다. 잠깐살래(`4quadverse-app`) 앱의 디자인 파일 전체를 **Full JSON + Slim JSON** 두 형태로 추출해서 메인 앱 Claude 세션이 MCP 호출 없이 참조할 수 있게 한다.

**작성일:** 2026-04-23
**리뷰 상태:** Architect + Critic consensus 반영 (v2)
**원본 단일 파일:** [`.omc/plans/figma-design-dumper.md`](../.omc/plans/figma-design-dumper.md)

---

## 목차

| 문서 | 내용 |
|------|------|
| [01-overview.md](./01-overview.md) | 배경 / 목적 / 성공 기준 / RALPLAN-DR / ADR |
| [02-architecture.md](./02-architecture.md) | 프로젝트 구조 / 기술 스택 / Plugin API 제약 |
| [03-spec.md](./03-spec.md) | 덤프 대상 / pruning 규칙 / JSON 스키마 / UI / postMessage 청크 전략 |
| [04-implementation.md](./04-implementation.md) | Phase 1~6 구현 / 각 Phase 수용 기준 / 검증 단계 |
| [05-risks.md](./05-risks.md) | 위험 & 완화 / Pre-mortem 5개 시나리오 |
| [06-handoff.md](./06-handoff.md) | 메인 앱 레포 연계 / 별도 세션 전달 템플릿 |
| [CHANGELOG.md](./CHANGELOG.md) | v1 → v2 변경 이력 |

---

## 한눈에 보는 요약

- **파일:** `MTOxFfImwieeX0Ae2IkjOQ` (잠깐살래, 최종본 페이지 `1747:2606`)
- **런타임:** Figma Plugin API, TypeScript + esbuild, 외부 npm 런타임 의존성 0
- **산출물:** `design.full.json` (레퍼런스) + `design.slim.json` (< 500KB, Claude 컨텍스트용)
- **예상 소요:** Phase 1~5 구현 약 4시간, Phase 6 실행 약 10분

## 작업 시작 순서
1. [02-architecture.md](./02-architecture.md) 로 구조 확인
2. [04-implementation.md](./04-implementation.md) Phase 1 부터 순차 진행
3. 각 Phase 완료 시 수용 기준 체크
4. Phase 6 실행 후 [06-handoff.md](./06-handoff.md) 로 메인 앱 연계
