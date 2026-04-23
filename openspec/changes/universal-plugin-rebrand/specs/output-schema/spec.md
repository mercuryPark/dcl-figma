## ADDED Requirements

### Requirement: Slim과 Full 두 JSON 계약과 사이즈 상한
plugin은 매 덤프마다 두 개의 JSON 산출물을 정의된 계약에 따라 생성해야 한다(SHALL): (a) Full dump는 노드 트리 전체와 토큰을 포함하며 목표 상한 10MB 이하, (b) Slim summary는 화면 단위 요약과 핵심 토큰만 포함하며 목표 상한 500KB 미만. 두 산출물은 동일한 최상위 메타 블록을 공유해야 한다(MUST).

#### Scenario: Full dump는 노드 트리와 토큰을 모두 포함한다
- **WHEN** 덤프가 완료되어 Full JSON이 직렬화된다
- **THEN** 최상위 키로 `$schema`, `schemaVersion`, `_howToUse`, `meta`, `tokens`, `pages`, `components`가 포함된다
- **AND** 결과 바이트 크기는 10 * 1024 * 1024 이하를 목표로 한다

#### Scenario: Slim summary는 화면 단위 요약 중심이다
- **WHEN** 덤프가 완료되어 Slim JSON이 직렬화된다
- **THEN** 최상위 키로 `$schema`, `schemaVersion`, `_howToUse`, `meta`, `tokens`, `screens`, `components`가 포함된다
- **AND** `screens[i].sectionTree`는 indent 기반 문자열 트리이며 depth 3 이하로 제한된다

#### Scenario: Full은 Slim의 상위 집합이 아니다
- **WHEN** Slim과 Full이 동일 덤프에서 생성된다
- **THEN** Slim에는 `screens`, `textSummary`, `sectionTree` 등 요약 전용 필드가 존재한다
- **AND** Full은 원본 노드 트리(`pages[].frames[].children...`)를 가지며 이 트리는 Slim에 포함되지 않는다

---

### Requirement: Self-documenting meta 블록
모든 출력 JSON은 최상단에 자기 기술(self-documenting) 필드 4종을 포함해야 한다(SHALL): `$schema`(스키마 URL), `schemaVersion`(semver 문자열), `_howToUse`(LLM/사람이 바로 읽는 한 줄 영문 안내), `meta` 객체(덤프 컨텍스트). LLM이 파일 하나만 주어져도 용도를 이해할 수 있어야 한다.

#### Scenario: 최상단 4개 필드가 모두 존재한다
- **WHEN** Slim 또는 Full JSON을 파싱한다
- **THEN** 최상위 레벨에 `$schema`, `schemaVersion`, `_howToUse`, `meta` 키가 모두 존재한다
- **AND** 이 4개 필드는 다른 어떤 필드보다 먼저 직렬화되어 파일 선두에 나타난다

#### Scenario: schemaVersion은 semver "1.0"에서 시작한다
- **WHEN** v1.0 릴리즈의 plugin이 JSON을 생성한다
- **THEN** `schemaVersion`의 값은 문자열 `"1.0"`이다
- **AND** 이후 호환 가능한 변경은 `"1.1"`, 호환 불가 변경은 `"2.0"`으로 올린다

#### Scenario: _howToUse는 LLM이 바로 이해할 영문 한 줄이다
- **WHEN** Slim JSON을 연다
- **THEN** `_howToUse`는 단일 문자열이며 예시 값 `"Figma design dump for LLM context. Load this JSON and reference screens[], tokens, and components when generating UI code."`와 같은 형태의 영문 안내이다
- **AND** 줄바꿈(`\n`)을 포함하지 않는다

#### Scenario: meta 객체는 필수 5개 필드를 가진다
- **WHEN** 출력 JSON의 `meta`를 파싱한다
- **THEN** `meta.fileKey`(string|null), `meta.pageId`(string), `meta.generatedAt`(ISO 8601 문자열), `meta.tool`(예: `"figma-design-dumper@1.0.0"`), `meta.degraded`(string[], 비어 있으면 생략 가능)를 포함한다
- **AND** `meta.generatedAt`는 덤프 완료 시각을 UTC ISO 8601 포맷으로 기록한다

---

### Requirement: Variables 저장 포맷
Variables는 `{ name, id, value }` 형태 객체 배열로 저장되어야 한다(SHALL). 단일 Variable의 각 모드 값은 독립된 원소로 펼쳐지며(modeId와 modeName을 둘 다 보존), 단일 resolved 값 하나만 노출하는 단순화는 금지된다(MUST NOT).

#### Scenario: 단일 Variable의 각 모드가 독립 원소로 저장된다
- **WHEN** 한 Variable `color/primary`가 `light`와 `dark` 두 모드를 가진다
- **THEN** `tokens.variables`에는 `{ name, id, value }` 형태의 원소가 두 개 존재한다
- **AND** 각 원소의 `value`는 해당 모드의 resolved 값이며 modeName·modeId가 함께 보존된다

#### Scenario: modeName과 modeId 둘 다 관측 가능하다
- **WHEN** Variables 원소를 직렬화한다
- **THEN** 원소에는 modeId와 modeName이 둘 다 포함되어 LLM이 mode 레이블과 내부 id를 동시에 참조할 수 있다
- **AND** 두 값 중 하나만 누락된 원소는 생성되지 않는다

#### Scenario: Variables 미사용 파일은 빈 배열을 출력한다
- **WHEN** 파일에 Variables가 정의되어 있지 않다
- **THEN** `tokens.variables`는 `[]`이다
- **AND** 키 자체를 생략하지 않고 빈 배열을 명시한다

---

### Requirement: 노드 children 결정론적 정렬
모든 컨테이너 노드의 `children` 배열은 Figma Plugin API가 반환한 순서 그대로를 유지해야 한다(SHALL). 이름·id·타입 기준 정렬 등 어떤 후처리 정렬도 적용되어서는 안 된다(MUST NOT). 이는 Figma의 z-order(뒤→앞) 시각 의미 보존과 결정론적 JSON diff를 동시에 충족한다.

#### Scenario: 동일 파일을 반복 덤프해도 children 순서가 동일하다
- **WHEN** 변경 없는 같은 Figma 파일에서 두 번 연속 덤프한다
- **THEN** 두 출력의 모든 `children` 배열 순서가 일치한다
- **AND** 두 JSON을 diff하면 `meta.generatedAt`를 제외하고 children 순서 차이가 발생하지 않는다

#### Scenario: z-order가 JSON 순서에 반영된다
- **WHEN** Frame이 `[A(bottom), B(middle), C(top)]` 순서로 스택된다
- **THEN** 출력 JSON의 `children`은 `[A, B, C]` 순서이다
- **AND** 이름이나 id 기준 정렬로 바뀌지 않는다

#### Scenario: 정렬 후처리가 코드에 존재하지 않는다
- **WHEN** Slim/Full 생성 파이프라인을 감사한다
- **THEN** `children.sort(...)` 호출이 존재하지 않는다
- **AND** 추출기는 Figma가 돌려준 순서를 그대로 push한다

---

### Requirement: 결정론적 파일명 규약
다운로드 파일명은 `figma.{fileSlug}.{pageSlug}.slim.json` / `figma.{fileSlug}.{pageSlug}.full.json` 패턴을 따라야 한다(SHALL). `fileSlug`와 `pageSlug`는 각각 Figma 파일 이름·페이지 이름을 소문자·kebab-case·ASCII로 변환한 값이며(MUST), 비 ASCII 문자는 전각/발음 구분 기호 제거 후 ASCII 근사치로 치환되고 남은 비허용 문자는 하이픈으로 대체된다.

#### Scenario: 영문 파일 이름이 kebab-case로 슬러그화된다
- **WHEN** Figma 파일명이 `"My Design System"`이고 페이지명이 `"Home Page"`이다
- **THEN** Slim 파일명은 `figma.my-design-system.home-page.slim.json`이다
- **AND** Full 파일명은 `figma.my-design-system.home-page.full.json`이다

#### Scenario: 한국어·비 ASCII 문자는 ASCII로 변환된다
- **WHEN** 페이지명이 `"홈 화면 / 메인"`이다
- **THEN** 해당 `pageSlug`는 `hom-hwamyeon-mein` 같은 ASCII-only kebab-case 근사치로 변환되거나, 변환 결과가 비어 있으면 `page-{pageId}` 폴백이 사용된다
- **AND** 파일명에는 공백·슬래시·유니코드 문자가 포함되지 않는다

#### Scenario: 전체 페이지 덤프는 pageSlug를 all로 고정한다
- **WHEN** 사용자가 "전체 페이지" 모드를 선택해 덤프한다
- **THEN** 출력 파일명의 `pageSlug` 자리는 `all`이다 (예: `figma.my-design-system.all.slim.json`)
- **AND** 이 규칙은 Slim과 Full에 동일하게 적용된다

#### Scenario: 연속 하이픈과 선행/후행 하이픈을 정리한다
- **WHEN** 원본 이름이 `"--  draft --"`처럼 공백·특수문자가 연속된다
- **THEN** 슬러그는 `draft`로 정규화된다
- **AND** 연속된 하이픈은 단일 하이픈으로 축약되고 앞뒤 하이픈은 제거된다

---

### Requirement: meta.degraded 필드로 축소 이력 기록
Slim 3단계 자동 축소가 발생한 경우 각 단계 식별자를 `meta.degraded` 문자열 배열에 순서대로 기록해야 한다(SHALL). 축소가 전혀 발생하지 않은 경우 이 필드는 생략되거나 빈 배열이어야 한다(MUST). 이 필드는 LLM·툴·사람이 현재 Slim이 어느 정도로 절삭되었는지 즉시 파악할 수 있는 감사 기록이다.

#### Scenario: 축소가 없으면 degraded 필드가 생략된다
- **WHEN** 최초 Slim 직렬화가 500KB 이하로 성공한다
- **THEN** `meta.degraded` 키가 존재하지 않거나 값이 `[]`이다

#### Scenario: 1단계만 적용된 경우 한 항목이 기록된다
- **WHEN** `textSummary` 축소만으로 500KB 이하를 달성한다
- **THEN** `meta.degraded === ["textSummary:20->10"]`이다

#### Scenario: 3단계 모두 적용된 경우 세 항목이 순서대로 기록된다
- **WHEN** 3단계(`tokens` 제외)까지 적용해 최종 Slim이 생성된다
- **THEN** `meta.degraded === ["textSummary:20->10", "sectionTree:3->2", "tokens:dropped"]`이다
- **AND** 항목 순서는 실제 적용 순서와 일치한다

#### Scenario: degraded는 Slim에만 의미가 있다
- **WHEN** Full JSON이 생성된다
- **THEN** `meta.degraded`는 Full에서도 필드로는 존재하되 값은 항상 빈 배열이거나 생략된다
- **AND** Full은 축소 대상이 아니므로 항목이 추가되지 않는다
