## ADDED Requirements

### Requirement: 초기 진입 스마트 기본값

플러그인 UI는 최초 실행 시 별도 설정 없이 즉시 덤프 가능한 상태로 사용자를 맞아야 하며, 현재 선택된 노드가 있으면 해당 노드를, 없으면 현재 페이지를 기본 대상으로 자동 결정해야 한다 (SHALL).

#### Scenario: 노드 선택 상태에서 진입

- **WHEN** 사용자가 프레임 2개를 선택한 채 플러그인을 실행
- **THEN** UI는 "Selection (2 frames)" 을 기본 범위로 표시
- **AND** "Dump" 버튼은 별도 클릭 없이 바로 활성 상태가 된다

#### Scenario: 선택 없이 진입

- **WHEN** 사용자가 아무 노드도 선택하지 않고 플러그인을 실행
- **THEN** UI는 페이지 범위 라디오에서 "Current page" 를 선택한 상태로 시작
- **AND** 현재 페이지 이름을 범위 라벨로 보여준다

### Requirement: 1-클릭 Dump 버튼과 고급 옵션 접힘 패널

메인 화면은 단일 Primary 버튼 "Dump" 를 중심으로 구성되어야 하며, 모든 고급 옵션(SVG export, 숨김 노드 포함, 토큰 포함 여부 등)은 기본 접힘 상태의 Disclosure 패널 안에 숨겨져야 한다 (SHALL).

#### Scenario: 기본 화면 구성

- **WHEN** 플러그인이 처음 로드되어 렌더링 직후 상태
- **THEN** 뷰포트 최상단에 "Dump" Primary 버튼이 단 1개만 존재
- **AND** "Advanced options" Disclosure 트리거는 접힌 상태로 노출된다

#### Scenario: 고급 옵션 펼치기

- **WHEN** 사용자가 "Advanced options" Disclosure 를 클릭해 펼침
- **THEN** SVG export, 숨김 노드 포함, 디자인 토큰 포함 3개 이상의 옵션 체크박스가 드러남
- **AND** 패널을 다시 접어도 선택된 값은 유지된다

### Requirement: 3-tier 출력 액션

덤프 완료 후 UI는 "Download Slim", "Download Full", "Copy Slim to Clipboard" 3개 액션을 사용자에게 제공해야 한다 (MUST).

#### Scenario: 3개 액션 노출

- **WHEN** Dump 실행이 성공적으로 완료되어 결과가 준비된 상태
- **THEN** UI 하단 결과 영역에 3개 버튼(Download Slim / Download Full / Copy Slim to Clipboard)이 동시에 활성화
- **AND** 각 버튼에는 결과 바이트 크기가 괄호로 부기된다

#### Scenario: 클립보드 복사

- **WHEN** 사용자가 "Copy Slim to Clipboard" 버튼을 클릭
- **THEN** Slim JSON 문자열이 OS 클립보드로 복사
- **AND** 2초 간 버튼 라벨이 "Copied" 토스트로 바뀌었다가 원래 라벨로 복귀한다

### Requirement: 페이지 범위 라디오 선택

UI는 "Current page" 와 "All pages" 두 옵션을 가진 라디오 그룹을 제공해야 하며, 페이지별 분할 출력 옵션은 본 버전에서 제공하지 않는다 (SHALL).

#### Scenario: 기본 선택

- **WHEN** 최초 실행이고 저장된 기본값이 없는 상태
- **THEN** "Current page" 라디오가 기본 선택되어 있다

#### Scenario: 전체 페이지 선택

- **WHEN** 사용자가 "All pages" 라디오로 전환 후 Dump 실행
- **THEN** 산출물은 파일 내 모든 페이지를 한 개의 Slim/Full JSON 으로 합쳐 반환
- **AND** 페이지별 분리 파일은 생성되지 않는다

### Requirement: i18n 런타임과 locale 토글

UI는 English 와 한국어 두 locale 을 내장 리소스(`locales/en.json`, `locales/ko.json`)로 번들해야 하며, 초기 로드 시 `figma.editorType`/`figma.command` 대신 `navigator.language` 또는 Figma UI 언어를 감지해 기본 locale 을 결정하고, 사용자가 토글로 전환할 수 있어야 한다 (SHALL).

#### Scenario: Figma UI 언어 자동 감지

- **WHEN** Figma UI 언어가 `ko` 로 설정된 상태에서 플러그인을 실행
- **THEN** 모든 문자열이 한국어로 렌더링
- **AND** 번들에 없는 locale 은 en 으로 폴백된다

#### Scenario: 사용자 locale 토글

- **WHEN** 사용자가 헤더의 언어 토글에서 EN → KO 로 전환
- **THEN** 현재 화면의 모든 라벨/버튼/진행 텍스트가 즉시 한국어로 다시 렌더링
- **AND** 선택한 locale 은 clientStorage 에 저장되어 다음 실행 시 자동 적용된다

### Requirement: 파일별 옵션 persistence

옵션(페이지 범위, SVG export, 숨김 노드 포함, 토큰 포함, locale)은 `figma.clientStorage` 에 `fileKey` 별로 스코프된 키로 저장되어야 하며, 동일 파일에서 재실행 시 자동 복원되어야 한다 (SHALL).

#### Scenario: 첫 덤프 후 저장

- **WHEN** 사용자가 fileKey=ABC 인 파일에서 SVG export 를 켜고 Dump 실행
- **THEN** `figma.clientStorage.setAsync('options:ABC', ...)` 호출이 일어나고 옵션 스냅샷이 기록된다

#### Scenario: 동일 파일 재실행

- **WHEN** 동일한 fileKey=ABC 파일을 다시 열어 플러그인을 재실행
- **THEN** UI 는 저장된 값을 읽어 SVG export 체크박스를 켜진 상태로 복원
- **AND** 다른 fileKey=XYZ 파일을 열면 XYZ 전용 옵션이 복원되고 ABC 옵션은 노출되지 않는다

### Requirement: 진행/에러/경고 상태 UI

실행 중에는 처리된 노드 수 기반 진행 바와 현재 Phase 라벨을 실시간 표시해야 하며, 비치명적 문제는 노란 경고 배지와 `meta.stats` 의 카운터로, 치명적 실패는 붉은 에러 메시지와 재시도 버튼으로 명확히 구분되어야 한다 (SHALL).

#### Scenario: 정상 진행 표시

- **WHEN** 덤프가 variables 수집 phase 에 진입
- **THEN** 진행 바가 현재/총 노드 수 비율로 채워짐
- **AND** Phase 라벨은 "Collecting variables..." 로 갱신된다

#### Scenario: 비치명적 경고

- **WHEN** Variables API 가 해당 파일에서 사용되지 않아 빈 결과를 반환하거나 일부 SVG export 가 실패한 상태로 덤프가 완료
- **THEN** 결과 영역에 노란 배지 "2 warnings" 가 표시되고 클릭 시 상세 목록 패널이 펼쳐짐
- **AND** 3-tier 출력 버튼들은 정상적으로 활성화되어 사용자가 산출물을 받을 수 있다

#### Scenario: 치명적 실패

- **WHEN** 덤프 도중 샌드박스 메모리 초과 등으로 예외가 발생해 JSON 생성에 실패
- **THEN** UI 는 진행 바를 멈추고 붉은 에러 메시지 박스와 "Retry" 버튼을 노출
- **AND** Download/Copy 버튼은 비활성 상태를 유지한다

### Requirement: 접근성 (키보드·ARIA·색 대비)

UI 는 키보드만으로 모든 액션에 도달 가능해야 하며, 각 버튼은 `aria-label`, 진행 바는 `aria-valuenow`/`aria-valuemax` 를 노출하고, 전경/배경 색 대비는 WCAG AA(4.5:1 이상)를 충족해야 한다 (SHALL).

#### Scenario: 키보드 포커스 순서

- **WHEN** 사용자가 Tab 키를 반복해서 누름
- **THEN** 포커스가 Language toggle → Scope radio → Advanced disclosure → Dump → (완료 후) Download Slim → Download Full → Copy Slim 순서로 이동
- **AND** Shift+Tab 은 역순으로 정확히 동일한 경로를 따른다

#### Scenario: 진행 바 ARIA

- **WHEN** 덤프 실행 중 진행 바가 렌더링된 상태에서 스크린 리더가 포커스를 받음
- **THEN** `role="progressbar"`, `aria-valuenow`, `aria-valuemax`, `aria-label` 이 모두 설정되어 현재 비율이 음성으로 전달된다
