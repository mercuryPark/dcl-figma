## ADDED Requirements

### Requirement: 진행 중 Cancel 버튼
UI는 덤프 실행 중(`phase` ∈ `{loadingPages, traversing, collectingStyles, collectingVariables, exportingSvg, buildingSlim, sending}`) 동안 Cancel 버튼을 노출해야 한다(SHALL). Cancel 클릭 시 sandbox로 `{type: "cancel"}` 메시지를 보내고 sandbox의 `phase: idle` 응답으로 UI 잠금을 해제한다(MUST). idle/done 상태에서는 Cancel 버튼이 숨겨진다.

#### Scenario: traversing 도중 Cancel 클릭이 먹힌다
- **WHEN** 50K 노드 파일에서 Dump 실행 후 사용자가 Cancel을 클릭한다
- **THEN** sandbox는 cancel 플래그를 set하고 다음 yield 지점에 조기 종료한다
- **AND** sandbox는 `phase: idle`을 emit하며 UI는 Dump 버튼 잠금을 해제한다

#### Scenario: idle 상태에서는 Cancel 버튼이 보이지 않는다
- **WHEN** plugin이 처음 로드되거나 덤프가 완료된 직후이다
- **THEN** Cancel 버튼은 DOM에 없거나 hidden 상태이다

---

### Requirement: 에러 배너의 Retry 액션
치명적 실패가 발생했을 때 UI는 에러 배너 안에 Retry 버튼을 노출해야 한다(SHALL). Retry 클릭은 직전 dump 옵션(scope/includeHidden/includeTokens/includeSvg)을 그대로 다시 보낸다(MUST). i18n 키 `actions.retry`를 사용한다.

#### Scenario: 에러 후 Retry로 같은 옵션이 재시도된다
- **WHEN** 덤프가 generic 에러로 실패해 에러 배너가 표시된 상태에서 사용자가 Retry를 클릭한다
- **THEN** UI는 직전 dump 메시지(scope/options/requestId)를 그대로 sandbox에 재전송한다
- **AND** 에러 배너는 사라지고 진행 바가 다시 0%부터 시작한다

---

### Requirement: meta.warnings 기반 경고 패널
sandbox가 `dumpReady` 메시지에 포함한 `warnings` 객체(`variablesError`, `svgFailed`, `svgCapped`, `styleError`, `degraded`)를 UI는 경고 배지와 패널로 노출해야 한다(SHALL). 빈 warnings는 패널이 보이지 않는다.

#### Scenario: SVG cap 초과 + style 실패가 함께 표시된다
- **WHEN** dump 결과 `warnings = { svgCapped: 150, styleError: "API ..." }`이다
- **THEN** UI에 노란 배지 "2 warnings"와 펼치면 두 항목 상세가 보인다
- **AND** Slim/Full 다운로드 버튼은 정상 활성화된다

---

### Requirement: clientStorage 기반 옵션 persistence + localStorage 마이그레이션
옵션(scope, includeSvg, includeHidden, includeTokens, locale)은 sandbox가 `figma.clientStorage`로 저장해야 하며(SHALL), `fileKey` 기반 키를 사용한다. v0.2의 `localStorage` 키(`dcfl:options:<fileName>`)가 존재하면 첫 v0.3 실행 시 한 번 읽어 clientStorage로 이전하고 localStorage 키를 삭제해야 한다(MUST).

#### Scenario: localStorage 옵션이 clientStorage로 마이그레이션된다
- **WHEN** v0.2 시기에 저장된 `localStorage["dcfl:options:..."]`가 존재한 채 v0.3 plugin이 시작된다
- **THEN** UI는 한 번 읽어 sandbox에 `migrateOptions` 메시지로 전달한다
- **AND** sandbox는 `figma.clientStorage`에 동일 옵션을 저장하고 ack한다
- **AND** ack 수신 후 UI는 localStorage 키를 삭제한다

#### Scenario: 같은 fileKey에서 옵션이 복원된다
- **WHEN** 동일 fileKey 파일을 다시 열어 plugin을 실행한다
- **THEN** sandbox가 clientStorage에서 옵션을 읽어 UI로 전달하고 UI는 체크박스/라디오를 복원한다

---

### Requirement: 모든 aria-label이 i18n 리소스로 연결됨
모든 사용자 가시 ARIA 라벨(`aria-label`, `aria-pressed`의 group label 등)은 `data-i18n` 또는 `data-i18n-aria` 속성을 통해 i18n 키로 연결되어야 한다(SHALL). 하드코딩된 영어 라벨은 어떤 locale에서도 노출되지 않는다(MUST NOT).

#### Scenario: 한국어 UI에서 스크린리더가 한국어 라벨을 읽는다
- **WHEN** locale이 `ko`로 설정된 상태에서 Tab으로 progressbar에 포커스한다
- **THEN** 스크린리더는 `aria-label`로 한국어 라벨("덤프 진행 상태" 등)을 읽는다

#### Scenario: 새 라벨 추가 시 양쪽 locale에 키가 존재한다
- **WHEN** 새 인터랙티브 요소를 추가한다
- **THEN** `locales/en.json`과 `locales/ko.json` 양쪽 모두에 같은 키가 존재한다 (verify:locales 게이트)

## MODIFIED Requirements

### Requirement: 진행/에러/경고 상태 UI

실행 중에는 phase 기반 진행 바와 현재 Phase 라벨을 실시간 표시해야 하며(SHALL), 비치명적 문제는 노란 경고 배지와 `meta.warnings` 카운터로, 치명적 실패는 붉은 에러 메시지와 Retry 버튼으로 명확히 구분되어야 한다(SHALL). Cancel 버튼은 진행 중에만 노출되어 직전 진행을 사용자가 안전하게 중단할 수 있어야 한다(SHALL).

진행 바는 sandbox로부터 노드 총수(total)를 받지 않는 환경에서도 항상 전진해야 하며(MUST), 다음 phase 매핑을 사용한다:

- `idle` → 0%
- `loadingPages` → 5%
- `traversing` → 25% 베이스라인 + processed 노드 수에 비례한 점근 곡선 (`25 + (60 - 25) × processed / (processed + 500)`)
- `collectingStyles` → 65%
- `collectingVariables` → 72%
- `exportingSvg` → 80%
- `buildingSlim` → 90%
- `sending` → 95%
- `done` → 100%

phase 라벨은 `traversing` 단계에서 처리된 노드 수를 보조 표기한다(MUST).

#### Scenario: 정상 진행 표시
- **WHEN** 덤프가 variables 수집 phase에 진입
- **THEN** 진행 바가 72%로 갱신되고 phase 라벨이 "Collecting variables..."로 표시된다
- **AND** Cancel 버튼이 표시되어 클릭 가능하다

#### Scenario: 비치명적 경고
- **WHEN** Variables API가 빈 결과 또는 일부 SVG export 실패 또는 SVG cap 초과로 덤프가 완료된다
- **THEN** 결과 영역에 노란 배지가 표시되고 클릭 시 `meta.warnings` 항목 목록이 펼쳐진다
- **AND** Slim/Full 다운로드/복사 버튼은 정상 활성화된다

#### Scenario: 치명적 실패
- **WHEN** 덤프 도중 예외가 발생해 JSON 생성에 실패한다
- **THEN** UI는 진행 바를 멈추고 붉은 에러 메시지 박스에 Retry 버튼을 노출한다
- **AND** Retry 클릭은 직전 옵션으로 dump를 재실행한다

#### Scenario: 취소된 덤프는 idle 상태로 돌아간다
- **WHEN** 진행 중인 덤프가 Cancel 버튼으로 취소된다
- **THEN** sandbox가 `phase: "idle"` 메시지를 emit한다
- **AND** UI는 Cancel 버튼을 숨기고 Dump 버튼 잠금을 해제한다
