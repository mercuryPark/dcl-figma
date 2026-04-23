# 01. Overview — 배경, 목적, 결정 근거

## 1. 배경 / 문제

- 잠깐살래 앱(`4quadverse-app`): React Native + Expo SDK 54 기반 부동산 단기임대 마켓플레이스
- 디자인 소스: Figma 최종본 파일
  - **fileKey:** `MTOxFfImwieeX0Ae2IkjOQ`
  - **URL:** https://www.figma.com/design/MTOxFfImwieeX0Ae2IkjOQ/잠깐살래
  - **최종본 페이지 nodeId:** `1747:2606`
  - **연결 계정:** `qkrghdus1113@naver.com`
- **Figma Free 플랜** → REST API rate limit 약 5 req/min
- 공식 Dev Mode MCP, Framelink MCP 모두 REST API 의존 → 실사용 불가

## 2. Plugin API를 택한 구체적 이유 (REST 대비 차별점)

REST API `GET /v1/files/:key` 한 번이면 트리는 온다. 그럼에도 Plugin API를 쓰는 이유:

1. **Variables mode resolution** — REST는 원시 토큰만. 플러그인은 현재 모드 적용값까지 resolve.
2. **Instance override 상세** — REST의 override 표현은 부분적, 특히 중첩 인스턴스에서 누락.
3. **exportAsync(SVG)** — REST `/images`는 Free 플랜에서 제한되고 PNG 위주.
4. **PersonalAccessToken 불필요** — 로컬 실행만으로 끝.

## 3. 목표

- Figma Plugin API 기반 **자체 덤프 플러그인** 개발
- 에디터 내부 API 사용 → **rate limit 무관**
- 전체 디자인을 두 형태 JSON으로 추출:
  - **Full dump** — 레퍼런스 (10MB 이내)
  - **Slim summary** — Claude 컨텍스트용 (< 500KB)
- 결과를 메인 앱 레포 `docs/figma/dump/`에 수동 복사

## 4. 성공 기준

- 1회 실행으로 전체 파일 덤프 완료 (수 초 ~ 1분)
- Full: 디자인 토큰 + 레이아웃 트리 + 컴포넌트/인스턴스 모두 포함
- Slim: 1M context 모델에도 여유 있게 들어가는 크기
- Figma Desktop "개발 중 플러그인 가져오기" 즉시 로드 가능

---

## 5. RALPLAN-DR Summary

### Principles (5)

1. **Local-first** — 외부 네트워크/서드파티 의존 0. 오프라인 동작.
2. **One-shot friendly** — 장기 유지보수 아닌 1회성 도구. 코드 간결 > 확장성.
3. **Context-safe output** — slim JSON < 500KB.
4. **Rate-limit 독립** — REST API 완전 회피.
5. **Deterministic** — 동일 입력에 동일 출력 (노드 순서, 부동소수 반올림 규칙 고정).

### Decision Drivers (top 3)

1. Figma Free 플랜 REST rate limit 회피
2. Variables mode-resolved / override / exportAsync 등 **REST 미지원 데이터** 확보
3. Claude 컨텍스트 안전 크기 보장

### Viable Options

| Option | Pros | Cons |
|---|---|---|
| **A. 자체 Plugin (채택)** | 데이터 한계 극복, rate limit 무관, override/SVG/Variables 정확 | 빌드 환경 구축, Figma Desktop 필수 |
| **B. REST API + backoff** | 빌드 0, 스크립트만, `GET /v1/files/:key` 1회 | Variables mode 불완전, override 누락, SVG 제한 |
| **C. 커뮤니티 플러그인** | 설치만 | 토큰만 추출, 화면 트리 없음, 스키마 제어 불가 |

### Invalidation rationale

- **B 탈락:** "REST 호출 0" + "Variables mode resolution" 동시 충족 불가. 중첩 instance override 누락으로 재현 품질 저하.
- **C 탈락:** 화면 트리 덤프 불가 → 목표(디자인 재현)와 무관.

---

## 6. ADR (Architecture Decision Record)

**Decision**
Figma Plugin API 기반 자체 덤프 플러그인 개발, **full + slim** 두 개 JSON 산출.

**Drivers**
1. Free 플랜 REST rate limit 회피
2. Variables mode / override / SVG export 등 REST 미지원 데이터 확보
3. Claude 컨텍스트 안전 크기 보장

**Alternatives considered**
- REST API + backoff — 간단하지만 데이터 품질 한계
- 커뮤니티 플러그인 — 토큰만, 트리 없음
- `create-figma-plugin` 스캐폴드 — 과한 추상화, 1회성 도구에 오버킬

**Why chosen**
데이터 완전성 + 1회성 특성상 의존성 최소 유지 + Claude 컨텍스트 대응을 동시에 만족하는 유일한 선택지.

**Consequences**
- Figma Desktop 필수 (동료 공유 시 설치 허들)
- 디자인 변경 시 재실행 필요 (자동화 아님)
- 빌드 환경(esbuild + tsc) 유지 필요

**Follow-ups (현재 범위 외)**
- GitHub Actions 빌드 자동화
- Figma Community 비공개 배포
- slim 부족 시 "mid" 포맷 추가
