# Changelog

## v2 (2026-04-23) — Architect + Critic consensus 반영

### 신설 섹션
- **[01-overview.md](./01-overview.md)** §5 RALPLAN-DR Summary — Principles 5 / Drivers 3 / Options 3 + invalidation rationale
- **[01-overview.md](./01-overview.md)** §6 ADR — Decision / Drivers / Alternatives / Why / Consequences / Follow-ups
- **[01-overview.md](./01-overview.md)** §2 Plugin API 채택 이유 4가지 (REST 대비 차별점)
- **[05-risks.md](./05-risks.md)** §2 Pre-mortem — 5개 실패 시나리오

### 스펙 수정
- **[03-spec.md](./03-spec.md)** §3 JSON 스키마 **인라인** 포함 (이전: "원본 계획서 그대로" 플레이스홀더)
- **[03-spec.md](./03-spec.md)** §3 **Slim JSON** 별도 산출물 추가 — Claude 1M 컨텍스트 대응
  - **Architect #4 대응**: 10MB JSON ≈ 2.5M 토큰으로 컨텍스트 질식 방지
  - **Critic MAJOR-1 대응**: 대안 분석 + slim 포맷 도입
- **[03-spec.md](./03-spec.md)** §5 **postMessage chunk 전송 전략** 신설 — stringify + 500KB 청크
  - **Architect #1 대응 (critical)**: structured clone 폭탄 방지
- **[04-implementation.md](./04-implementation.md)** Phase 1 manifest에 `id`, `documentAccess: "dynamic-page"` 추가
  - **Architect #2 대응**
- **[03-spec.md](./03-spec.md)** §1 **SVG export 기본 OFF** + naming/size/총량 cap
  - **Architect #3 대응**: 수천 벡터 노드에서 OOB 크래시 방지
- **[03-spec.md](./03-spec.md)** §2 Prune 규칙 / 기본값 생략 / 부동소수 반올림 구체화
  - **Critic MAJOR-3 대응**: 모호한 "prune" 표현 → 필드별 규칙 + `pLimit(10)` 자체 구현

### 검증 강화
- **[04-implementation.md](./04-implementation.md)** 각 Phase 수용 기준을 **테스트 가능한** 체크로 재작성
  - **Critic MAJOR-2 대응**: "Claude가 이해" → "페이지/프레임 표로 정리" 같은 yes/no 체크
- **[05-risks.md](./05-risks.md)** §1 위험 표에 **구체 파라미터** 컬럼 추가
  - **Critic MAJOR-3 대응**

### 구조 변경
- **산출물 1개 → 2개**: `design.json` → `design.full.json` + `design.slim.json`
- 프로젝트 구조 확장: 단일 `code.ts` → `src/{extract,tokens,svg,slim,util/{pLimit,prune}}.ts` 분리

---

## v1 (2026-04-23) — 원본 계획서

- 사용자 초안 (`.omc/plans/` 저장)
- Figma Plugin API 기반 단일 JSON 덤프 플러그인 스펙
- Phase 1~6 구분, 스키마 참조만 (인라인 X)
- 주요 공백:
  - postMessage 전송 전략 없음
  - Claude 컨텍스트 대응 없음
  - manifest 필수 필드 일부 누락
  - SVG export 스코프 미정의
  - Pre-mortem / ADR / 대안 분석 없음
