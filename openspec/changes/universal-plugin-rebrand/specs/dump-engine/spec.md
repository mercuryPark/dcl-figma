## ADDED Requirements

### Requirement: Figma Plugin API 기반 수집과 샌드박스 격리
Plugin은 오로지 Figma Plugin API(샌드박스 `code.ts`)만을 통해 파일 데이터를 수집해야 하며(SHALL), `manifest.json`에 `networkAccess.allowedDomains: ["none"]`과 `documentAccess: "dynamic-page"`를 선언해야 한다(MUST). 외부 네트워크 호출과 동기 Document API 사용은 금지된다(MUST NOT).

#### Scenario: manifest가 네트워크 접근을 차단한다
- **WHEN** plugin이 Figma Desktop에 로드되어 manifest가 파싱된다
- **THEN** `networkAccess.allowedDomains` 값이 `["none"]`이다
- **AND** 샌드박스 런타임에서 `fetch`·`XMLHttpRequest`를 호출하면 Figma가 차단한다

#### Scenario: dynamic-page 모드로 페이지를 로드한다
- **WHEN** 전체 페이지 덤프가 선택되고 샌드박스가 각 `PageNode`를 순회한다
- **THEN** 각 페이지는 `figma.loadAllPagesAsync()` 또는 `page.loadAsync()`로 명시 로드된 뒤에만 접근된다
- **AND** 동기 `figma.root.children` 접근으로 자식 노드를 재귀 순회하지 않는다

#### Scenario: 동기 스타일 API 사용을 거부한다
- **WHEN** 토큰 수집 단계에서 스타일을 조회한다
- **THEN** `getLocalPaintStylesAsync`, `getLocalTextStylesAsync`, `getLocalEffectStylesAsync`, `getLocalGridStylesAsync` Async 4종만 호출된다
- **AND** 대응 sync API(`getLocalPaintStyles` 등)는 코드에 존재하지 않는다

---

### Requirement: 비동기 DFS 순회와 주기적 Yield
노드 순회는 Async DFS로 수행되어야 하며(SHALL), 순회된 노드가 50개 누적될 때마다 `await new Promise(r => setTimeout(r, 0))`로 이벤트 루프에 양보해야 한다(MUST). 이는 Figma Desktop의 "Not responding" 경고와 샌드박스 프리즈를 방지한다.

#### Scenario: 50노드마다 이벤트 루프에 양보한다
- **WHEN** 5,000개 노드를 가진 페이지를 순회한다
- **THEN** 방문 노드 카운터가 50의 배수가 될 때마다 `setTimeout(0)` await가 1회 발생한다
- **AND** 순회 도중 UI는 "Not responding" 경고 없이 진행률을 갱신한다

#### Scenario: 빈 페이지를 즉시 완료한다
- **WHEN** 자식이 0개인 페이지에 대해 순회가 시작된다
- **THEN** 순회는 setTimeout yield 없이 즉시 반환한다
- **AND** 해당 페이지의 `stats.totalNodes`는 0으로 집계된다

#### Scenario: 순회 중 취소 요청을 반영한다
- **WHEN** 순회 도중 UI에서 cancel 메시지가 전달된다
- **THEN** 다음 yield 지점에서 순회 루프가 조기 종료된다
- **AND** 부분 수집된 결과는 폐기되고 UI에는 취소됨 상태가 통지된다

---

### Requirement: 노드 타입별 추출 규칙
plugin은 Frame(GROUP/COMPONENT/INSTANCE 포함), Text, Image, Component 정의, Instance, Vector 계열 노드를 타입별 전담 추출기로 처리해야 한다(SHALL). 각 추출기는 해당 타입이 의미를 가지는 필드만 수집하고, 타입에 맞지 않는 필드는 출력 객체에 포함하지 않아야 한다(MUST NOT).

#### Scenario: 텍스트 노드에서 characters와 스타일을 수집한다
- **WHEN** `TEXT` 노드가 방문된다
- **THEN** `characters`, `style.fontFamily`, `style.fontStyle`, `style.fontSize`, `style.lineHeight`, `style.letterSpacing`, `fills`, `box` 필드가 추출된다
- **AND** `characters`에 수록된 문자열은 삭제·치환되지 않은 원문 그대로 저장된다

#### Scenario: Instance 노드는 mainComponentId와 overrides를 저장한다
- **WHEN** `INSTANCE` 노드가 방문된다
- **THEN** `mainComponentId`는 원본 Component id 문자열로 저장되고 실제 Component 객체는 재귀적으로 중첩되지 않는다
- **AND** overridden 속성은 `overrides` 객체로 수집된다

#### Scenario: Image fill을 가진 Frame은 imageHash를 보존한다
- **WHEN** Frame 노드의 `fills`에 `type: "IMAGE"` paint가 존재한다
- **THEN** 해당 paint의 `imageHash` 문자열이 그대로 보존된다
- **AND** 이미지 바이너리는 포함되지 않는다

#### Scenario: Vector 계열은 단일 'VECTOR' 계열 타입으로 정규화된다
- **WHEN** `LINE`, `RECTANGLE`, `ELLIPSE`, `POLYGON`, `STAR`, `BOOLEAN_OPERATION`, `VECTOR` 중 하나가 방문된다
- **THEN** 동일한 Vector 추출기가 사용되어 `box`, `fills`, (옵션) `svg` 필드를 출력한다

---

### Requirement: 디자인 토큰 수집 (Styles + Variables)
plugin은 PaintStyle·TextStyle·EffectStyle·GridStyle 및 Variables(Local Variables)를 Async API로 수집해야 하며(SHALL), Variables 호출은 `try/catch`로 감싸 예외 시 빈 배열로 폴백해야 한다(MUST).

#### Scenario: Paint/Text/Effect 스타일이 토큰으로 수집된다
- **WHEN** 디자인 토큰 옵션이 ON 상태로 덤프가 실행된다
- **THEN** `tokens.colors`, `tokens.typography`, `tokens.effects` 배열이 각각 PaintStyle, TextStyle, EffectStyle로부터 채워진다
- **AND** 각 항목은 style `id`와 `name`을 보존한다

#### Scenario: Variables가 있으면 모드별 값이 모두 수집된다
- **WHEN** 파일에 Variables가 정의되어 있다
- **THEN** `tokens.variables` 배열의 각 원소는 `{ id, name, collectionName, resolvedType, valuesByMode }`를 갖는다
- **AND** `valuesByMode`는 modeId를 키로 하고 해당 모드에서 resolved된 값을 값으로 갖는다

#### Scenario: Variables 미사용 파일에서 안전하게 폴백한다
- **WHEN** 파일에 Variables가 하나도 정의되어 있지 않거나 API 호출이 예외를 던진다
- **THEN** `tokens.variables`는 빈 배열 `[]`로 설정된다
- **AND** 예외가 발생한 경우 `console.warn`이 기록되고 덤프 프로세스는 중단되지 않는다

---

### Requirement: Pruning 규칙 (기본값 생략과 좌표 반올림)
출력 JSON 크기를 줄이기 위해 plugin은 Figma API 기본값과 동일한 필드를 생략해야 하며(SHALL), 모든 좌표·크기 숫자는 소수점 둘째 자리로 반올림해야 한다(MUST).

#### Scenario: 기본값을 가진 필드는 출력에서 생략된다
- **WHEN** 노드가 `visible === true`, `opacity === 1`, `rotation === 0`, `blendMode === "NORMAL"` 상태이다
- **THEN** 출력 객체에 `visible`, `opacity`, `rotation`, `blendMode` 키가 포함되지 않는다

#### Scenario: 비기본값은 보존된다
- **WHEN** 노드가 `visible: false` 이고 `opacity: 0.5` 이다
- **THEN** 출력 객체에 `visible: false` 와 `opacity: 0.5` 가 그대로 기록된다

#### Scenario: 좌표와 크기는 소수점 2자리로 반올림된다
- **WHEN** 노드의 `x = 123.4567`, `y = 10.0001`, `w = 88.886`, `h = 50.0` 이다
- **THEN** 출력의 `box`는 `{ x: 123.46, y: 10, w: 88.89, h: 50 }`이다
- **AND** 반올림 방식은 `Math.round(n * 100) / 100`이다

#### Scenario: null·undefined·빈 컬렉션 필드를 제거한다
- **WHEN** 어떤 필드의 값이 `null`, `undefined`, `[]`, `{}` 중 하나이다
- **THEN** 해당 필드는 출력 객체에서 삭제된다

---

### Requirement: Slim 변환과 3단계 자동 축소 폴백
plugin은 Full 덤프로부터 Slim 요약을 파생해야 하며(SHALL), Slim 직렬화 결과가 500KB를 초과하면 다음 순서로 단계별 자동 축소를 적용해야 한다(MUST): (1) 각 screen의 `textSummary` 상위 20개 → 10개로 축소, (2) `sectionTree` depth 3 → 2로 축소, (3) `tokens` 블록 제외. 각 시도의 결과 상태는 `meta.degraded` 문자열 배열에 단계 식별자로 기록된다.

#### Scenario: 기본 Slim 생성은 degraded 기록이 비어있다
- **WHEN** Slim 직렬화 바이트가 500KB 이하이다
- **THEN** 첫 직렬화 결과가 최종 출력으로 확정된다
- **AND** `meta.degraded`는 생략되거나 빈 배열이다

#### Scenario: 1단계 축소로 목표를 만족한다
- **WHEN** 최초 Slim이 500KB를 초과하고, `textSummary`를 20→10으로 줄인 재직렬화가 500KB 이하이다
- **THEN** 최종 Slim에는 각 screen의 `textSummary` 길이가 최대 10이다
- **AND** `meta.degraded`에 `"textSummary:20->10"` 항목이 포함된다

#### Scenario: 3단계까지 축소되어도 결과를 반환한다
- **WHEN** 1단계와 2단계(`sectionTree` depth 3→2) 이후에도 500KB를 초과한다
- **THEN** 3단계에서 `tokens` 필드 전체가 제거된 Slim이 최종 출력된다
- **AND** `meta.degraded`에 `"textSummary:20->10"`, `"sectionTree:3->2"`, `"tokens:dropped"`가 순서대로 기록된다

#### Scenario: 축소 단계는 누적 적용된다
- **WHEN** n단계 축소가 수행된다
- **THEN** n단계 결과는 이전 단계들의 축소를 모두 포함한 상태에서 계산된다
- **AND** 이전 단계의 원본 데이터로 롤백하지 않는다

---

### Requirement: SVG Export (opt-in, 크기·개수 상한, 동시성 제한)
SVG export는 기본 OFF이며(SHALL), 사용자가 명시적으로 활성화할 때에만 수행된다. 대상은 (a) 노드 이름이 `icon/*` glob 패턴에 매치되거나 (b) VECTOR 계열이면서 `width ≤ 64` 그리고 `height ≤ 64`인 노드로 한정되어야 한다(MUST). 총 export 개수 상한은 100개(MUST), 동시 실행은 자체 구현 `pLimit(10)`으로 제한되어야 한다(MUST).

#### Scenario: SVG 옵션이 OFF면 export를 수행하지 않는다
- **WHEN** 사용자가 SVG include 옵션을 끈 상태로 덤프를 실행한다
- **THEN** `exportAsync` 호출이 한 번도 발생하지 않는다
- **AND** 모든 Vector 계열 노드의 출력 객체에 `svg` 키가 존재하지 않는다

#### Scenario: naming과 크기 조건 둘 다를 지원한다
- **WHEN** SVG 옵션이 ON이고, 이름이 `icon/arrow`인 128×128 노드와 이름이 `generic`인 32×32 VECTOR 노드가 존재한다
- **THEN** 두 노드 모두 export 대상 후보에 포함된다
- **AND** 이름이 `banner`이고 크기 120×120인 VECTOR 노드는 후보에서 제외된다

#### Scenario: 총 100개 cap에서 조기 종료한다
- **WHEN** export 후보가 250개이다
- **THEN** 먼저 도달한 100개까지만 export가 수행된다
- **AND** 101번째 이후 후보는 skip되고 `meta.stats.svgExported === 100`이다

#### Scenario: pLimit로 동시성을 10으로 제한한다
- **WHEN** 30개 SVG export가 파이프라인에 제출된다
- **THEN** 동시에 진행되는 `exportAsync` in-flight 수는 10을 초과하지 않는다
- **AND** 나머지 요청은 큐에 대기한다

#### Scenario: 개별 export 실패는 전체 덤프를 중단시키지 않는다
- **WHEN** 특정 노드의 `exportAsync({ format: 'SVG' })`가 예외를 던진다
- **THEN** 해당 노드는 `svgExportFailed: true` 플래그와 함께 기록된다
- **AND** `meta.stats.svgFailed` 카운터가 1 증가하고 나머지 export는 계속 진행된다

---

### Requirement: postMessage 청크 전송 프로토콜
샌드박스→UI 전송은 객체 구조복제를 피하기 위해 `JSON.stringify` 후 500KB 단위 슬라이스로 전송해야 하며(SHALL), `chunk`/`done` 두 메시지 타입과 연속 `seq` 번호를 사용해야 한다(MUST). UI 측은 `seq`를 인덱스로 하는 배열에 청크를 축적한 뒤 `done` 수신 시 `join('')`로 재조립한다.

#### Scenario: 5MB 덤프를 500KB 청크로 분할 전송한다
- **WHEN** `JSON.stringify(dump).length`가 5,000,000이다
- **THEN** `chunk` 메시지 10개가 `seq = 0..9` 순서로 전송되고 마지막으로 `{ type: 'done', kind, totalSeq: 10 }`이 전송된다
- **AND** 각 `chunk`의 `data.length`는 500 * 1024 이하이다

#### Scenario: UI가 seq 순서로 재조립한다
- **WHEN** UI가 `chunk` 메시지들을 수신한다
- **THEN** 수신된 청크는 `buffers[kind][seq] = data`로 저장된다
- **AND** `done` 수신 시 `buffers[kind].join('')`가 원본 `JSON.stringify` 결과와 바이트 단위로 동일하다

#### Scenario: kind로 Slim과 Full을 분리 전송한다
- **WHEN** Slim과 Full이 모두 생성되어 전송된다
- **THEN** 각 chunk 메시지는 `kind: 'slim'` 또는 `kind: 'full'` 중 하나를 가진다
- **AND** UI는 두 버퍼를 독립적으로 관리하며 서로의 seq를 덮어쓰지 않는다

#### Scenario: 전송 도중 객체를 통째로 postMessage하지 않는다
- **WHEN** 덤프 결과가 UI로 전송된다
- **THEN** `figma.ui.postMessage`의 payload에는 `JSON.stringify` 문자열만 포함되고 중첩 dump 객체는 포함되지 않는다
- **AND** 샌드박스는 structured clone 경로로 깊은 트리를 전송하지 않는다
