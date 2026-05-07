## ADDED Requirements

### Requirement: Dump 버튼 라이프사이클 잠금
UI는 Dump 버튼 클릭 즉시 `disabled=true`로 잠가야 하며(SHALL), 다음 종료 신호 중 하나가 도달할 때까지 잠금을 유지해야 한다(MUST):
- `phase: "done"` (덤프 정상 완료)
- `phase: "idle"` (취소 또는 reset)
- `error` 메시지 (치명적 실패)
- 결과 청크가 모두 도착해 `enableResults()`가 호출될 때

이미 잠긴 상태에서의 추가 클릭은 무시된다(MUST). 이는 더블클릭으로 두 덤프가 동시에 실행되어 transport 청크가 섞이는 회귀를 차단한다.

#### Scenario: 클릭 즉시 잠긴다
- **WHEN** 사용자가 Dump 버튼을 클릭한다
- **THEN** 버튼의 `disabled` 속성이 즉시 `true`가 된다
- **AND** 같은 클릭에서 `pluginMessage`로 `{ type: "dump", ... }`가 전송된다

#### Scenario: 더블클릭은 두 번째 클릭이 무시된다
- **WHEN** 사용자가 Dump 버튼을 빠르게 두 번 클릭한다
- **THEN** sandbox에는 dump 메시지가 한 번만 전송된다
- **AND** UI의 receive 버퍼에는 단일 dump의 청크만 누적된다

#### Scenario: phase=done에 unlock된다
- **WHEN** sandbox가 `{ type: "phase", phase: "done" }` 메시지를 보낸다
- **THEN** UI의 Dump 버튼 `disabled`가 `false`가 된다

#### Scenario: phase=idle에 unlock된다 (취소 종료 경로)
- **WHEN** sandbox가 cancel 종료 시 `{ type: "phase", phase: "idle" }` 메시지를 보낸다
- **THEN** UI의 Dump 버튼 `disabled`가 `false`가 된다

#### Scenario: error에도 unlock된다
- **WHEN** sandbox가 `{ type: "error", code: "..." }` 메시지를 보낸다
- **THEN** UI는 에러 배너를 표시한다
- **AND** Dump 버튼 `disabled`가 `false`가 된다

## MODIFIED Requirements

### Requirement: 진행/에러/경고 상태 UI

실행 중에는 phase 기반 진행 바와 현재 Phase 라벨을 실시간 표시해야 하며(SHALL), 비치명적 문제는 노란 경고 배지와 `meta.stats`의 카운터로, 치명적 실패는 붉은 에러 메시지와 재시도 버튼으로 명확히 구분되어야 한다 (SHALL).

진행 바는 sandbox로부터 노드 총수(total)를 받지 않는 환경에서도 항상 전진해야 하며(MUST), 이를 위해 다음 매핑을 사용한다:

- `idle` → 0%
- `loadingPages` → 5%
- `traversing` → 25% 베이스라인 + processed 노드 수에 비례한 점근 곡선 (`25 + (60 - 25) × processed / (processed + 500)`), 최대 60%에 점근
- `collectingStyles` → 65%
- `collectingVariables` → 72%
- `exportingSvg` → 80%
- `buildingSlim` → 90%
- `sending` → 95%
- `done` → 100%

phase 라벨은 `traversing` 단계에서 처리된 노드 수를 보조 표기한다(MUST): `"Traversing nodes... (1234)"`.

#### Scenario: 정상 진행 표시
- **WHEN** 덤프가 variables 수집 phase에 진입
- **THEN** 진행 바가 72%로 갱신되고 phase 라벨이 "Collecting variables..."로 표시된다

#### Scenario: traversing 동안 막대가 항상 전진한다
- **WHEN** sandbox가 처리된 노드 수가 누적되는 progress 메시지를 보낸다
- **THEN** 진행 바 % 값이 단조 비감소(monotonically non-decreasing)로 갱신된다
- **AND** 60%를 초과하지 않으며 phase가 다음 단계로 넘어가야 60%를 넘는다

#### Scenario: traversing phase 라벨이 처리 노드 수를 보조 표기한다
- **WHEN** progress 메시지가 `processed=1234`를 보낸다
- **THEN** phase 라벨이 `"Traversing nodes... (1234)"`로 표시된다 (locale에 따라 번역)

#### Scenario: 비치명적 경고
- **WHEN** Variables API가 해당 파일에서 사용되지 않거나 일부 SVG export가 실패한 상태로 덤프가 완료
- **THEN** 결과 영역에 노란 배지 "2 warnings"가 표시되고 클릭 시 상세 목록 패널이 펼쳐짐
- **AND** 3-tier 출력 버튼들은 정상적으로 활성화되어 사용자가 산출물을 받을 수 있다

#### Scenario: 치명적 실패
- **WHEN** 덤프 도중 샌드박스 메모리 초과 등으로 예외가 발생해 JSON 생성에 실패
- **THEN** UI는 진행 바를 멈추고 붉은 에러 메시지 박스와 "Retry" 버튼을 노출
- **AND** Download/Copy 버튼은 비활성 상태를 유지한다
- **AND** Dump 버튼은 다시 활성 상태로 돌아가 사용자가 재시도할 수 있다

#### Scenario: 취소된 덤프는 idle 상태로 돌아간다
- **WHEN** 진행 중인 덤프가 cancel 메시지로 취소된다
- **THEN** sandbox가 `phase: "idle"` 메시지를 emit한다
- **AND** UI는 phase 라벨을 "Ready" (또는 locale별 idle 문자열)로 갱신하고 Dump 버튼 잠금을 해제한다
