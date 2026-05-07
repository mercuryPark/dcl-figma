## ADDED Requirements

### Requirement: Auto-layout 부수 필드 추출 (counterAxisSpacing, layoutWrap)
plugin은 FrameLikeNode에서 `counterAxisSpacing`(WRAP 레이아웃의 교차축 간격)과 `layoutWrap`(`NO_WRAP` | `WRAP`)을 추출해야 한다(SHALL). 각 필드는 기본값(0 또는 `"NO_WRAP"`)일 때 출력에서 생략된다(MUST).

#### Scenario: WRAP 레이아웃의 교차축 간격을 보존한다
- **WHEN** Frame이 `layoutMode="HORIZONTAL"`, `layoutWrap="WRAP"`, `itemSpacing=12`, `counterAxisSpacing=8`이다
- **THEN** 출력 객체에 `layoutWrap: "WRAP"`, `itemSpacing: 12`, `counterAxisSpacing: 8`이 모두 기록된다

#### Scenario: 기본값은 노이즈로 제거된다
- **WHEN** Frame이 `layoutWrap="NO_WRAP"`이고 `counterAxisSpacing=0`이다
- **THEN** 출력 객체에 `layoutWrap`, `counterAxisSpacing` 키가 존재하지 않는다

---

### Requirement: 자식 노드의 부모 대비 제약과 절대 배치 보존
plugin은 모든 SceneNode에서 `constraints`(부모 리사이즈 시 동작 규칙: horizontal/vertical 각각 `MIN` | `MAX` | `CENTER` | `STRETCH` | `SCALE`)와 `layoutPositioning`(`AUTO` | `ABSOLUTE`)을 추출해야 한다(SHALL). 둘 다 기본값일 때는 출력에서 생략된다(MUST): `constraints={MIN, MIN}`, `layoutPositioning="AUTO"`.

#### Scenario: 가운데 정렬 제약은 보존된다
- **WHEN** 노드의 `constraints`가 `{horizontal: "CENTER", vertical: "STRETCH"}`이다
- **THEN** 출력의 `constraints`가 `{horizontal: "CENTER", vertical: "STRETCH"}`로 기록된다

#### Scenario: ABSOLUTE 자식은 명시되어 보존된다
- **WHEN** 자식 노드가 부모의 auto-layout 흐름을 벗어나 `layoutPositioning="ABSOLUTE"`로 설정되어 있다
- **THEN** 출력에 `layoutPositioning: "ABSOLUTE"`가 기록된다
- **AND** 부모 frame의 auto-layout 필드는 영향을 받지 않는다

#### Scenario: 기본값은 노이즈로 제거된다
- **WHEN** 노드의 `constraints`가 `{MIN, MIN}`이고 `layoutPositioning`이 `"AUTO"`이다
- **THEN** 출력에 `constraints`, `layoutPositioning` 키가 존재하지 않는다

---

### Requirement: 개별 코너 반경 보존
plugin은 FrameLikeNode와 VectorNode에서 `cornerRadius`가 균일한 number이면 그대로 보존하고, `figma.mixed`이거나 4개 코너가 다르게 설정된 경우 `cornerRadii: { tl, tr, br, bl }` 객체로 보존해야 한다(SHALL). 4개 코너가 모두 0인 경우 두 필드 모두 출력에서 생략된다(MUST).

#### Scenario: 균일 cornerRadius는 단일 number로 출력된다
- **WHEN** 노드의 `cornerRadius=8`이다
- **THEN** 출력에 `cornerRadius: 8`이 기록되고 `cornerRadii`는 존재하지 않는다

#### Scenario: 코너가 다르면 cornerRadii로 펼친다
- **WHEN** 노드의 `cornerRadius=figma.mixed`, `topLeftRadius=8`, `topRightRadius=8`, `bottomRightRadius=0`, `bottomLeftRadius=0`이다
- **THEN** 출력에 `cornerRadii: { tl: 8, tr: 8, br: 0, bl: 0 }`이 기록된다
- **AND** `cornerRadius` 키는 존재하지 않는다

#### Scenario: 모두 0인 코너는 둘 다 생략된다
- **WHEN** 노드의 모든 코너 radius가 0이다
- **THEN** 출력에 `cornerRadius`, `cornerRadii` 키가 모두 존재하지 않는다

---

### Requirement: 단위 보존된 letterSpacing
plugin은 TextNode의 `letterSpacing`을 unit 정보와 함께 보존해야 한다(SHALL). `unit="PERCENT"`이면 `"<value>%"` 문자열, `unit="PIXELS"`이면 `"<value>px"` 문자열, 그 외(예: 단위 미상)에는 raw `number`로 폴백한다(MUST). TypographyToken도 동일한 규칙을 따른다.

#### Scenario: PERCENT 자간은 % 문자열로 보존된다
- **WHEN** TextNode의 `letterSpacing`이 `{value: 2, unit: "PERCENT"}`이다
- **THEN** 출력의 `style.letterSpacing`이 문자열 `"2%"`이다

#### Scenario: PIXELS 자간은 px 문자열로 보존된다
- **WHEN** TextNode의 `letterSpacing`이 `{value: 0.5, unit: "PIXELS"}`이다
- **THEN** 출력의 `style.letterSpacing`이 문자열 `"0.5px"`이다

#### Scenario: 단위 미상은 number 폴백
- **WHEN** TextNode의 `letterSpacing.unit`이 `"PERCENT"`도 `"PIXELS"`도 아니다
- **THEN** 출력의 `style.letterSpacing`이 `value`의 raw `number`이다

#### Scenario: TypographyToken도 동일하게 적용된다
- **WHEN** TextStyle 토큰의 `letterSpacing.unit`이 `"PERCENT"`이고 `value=4`이다
- **THEN** `tokens.typography[i].letterSpacing`이 문자열 `"4%"`이다

---

### Requirement: Slim sectionTree에 layout hint 인라인
plugin은 `Slim` 출력의 `screens[i].sectionTree`에서 각 frame 라인 끝에 인라인 layout hint를 부착해야 한다(SHALL). hint 형식은 대괄호로 감싼 콤마 구분 토큰들이며, 다음 토큰을 이 순서로 포함한다(MUST):
1. `hstack` | `vstack` (`layoutMode === "HORIZONTAL"` | `"VERTICAL"`일 때)
2. `wrap` (`layoutWrap === "WRAP"`일 때)
3. `justify=center` | `end` | `space-between` (`primaryAxisAlignItems`가 `MIN` 외 매핑 가능 값일 때)
4. `align=center` | `end` | `baseline` (`counterAxisAlignItems`가 `MIN` 외 매핑 가능 값일 때)
5. `gap=<n>` (`itemSpacing` 존재 시)
6. `gapY=<n>` (`counterAxisSpacing` 존재 시)
7. `p=<n>` 또는 `p=<v> <h>` 또는 `p=<t> <r> <b> <l>` (padding 대칭/비대칭 축약)

토큰이 하나도 없는 경우 hint는 출력되지 않는다(MUST). `MIN` 등 기본값 정렬은 `justify`/`align`에서 제거된다(MUST).

#### Scenario: 기본 hstack과 균일 padding은 축약된다
- **WHEN** Frame의 `layoutMode="HORIZONTAL"`, `itemSpacing=12`, padding 4면이 모두 16이다
- **THEN** sectionTree의 해당 줄 끝에 `[hstack, gap=12, p=16]`가 부착된다

#### Scenario: WRAP + 정렬 + 비대칭 padding이 모두 표현된다
- **WHEN** Frame의 `layoutMode="HORIZONTAL"`, `layoutWrap="WRAP"`, `primaryAxisAlignItems="SPACE_BETWEEN"`, `counterAxisAlignItems="CENTER"`, `itemSpacing=8`, `counterAxisSpacing=4`, padding `t=8, b=8, l=16, r=16`이다
- **THEN** sectionTree의 해당 줄에 `hstack`, `wrap`, `justify=space-between`, `align=center`, `gap=8`, `gapY=4`, `p=8 16`이 모두 포함된다

#### Scenario: 기본값(MIN) 정렬은 hint에서 제거된다
- **WHEN** Frame의 `primaryAxisAlignItems="MIN"`, `counterAxisAlignItems="MIN"`이고 `itemSpacing=4`이다
- **THEN** sectionTree 줄에 `justify=`, `align=` 토큰이 포함되지 않는다
- **AND** hint는 `[hstack, gap=4]`처럼 표시된다

#### Scenario: 비-frame 노드는 hint를 부착하지 않는다
- **WHEN** TEXT 노드 라인이 출력된다
- **THEN** 해당 줄에 대괄호 hint가 부착되지 않는다

## MODIFIED Requirements

### Requirement: 비동기 DFS 순회와 주기적 Yield
노드 순회는 Async DFS로 수행되어야 하며(SHALL), 순회된 노드가 50개 누적될 때마다 `await new Promise(r => setTimeout(r, 0))`로 이벤트 루프에 양보해야 한다(MUST). 이는 Figma Desktop의 "Not responding" 경고와 샌드박스 프리즈를 방지한다. 취소 요청이 도달하면 모든 조기 종료 경로에서 `phase: idle` 메시지를 UI로 명시 emit해야 하며(MUST), 이를 통해 UI는 잠금 상태 없이 종료를 인지한다.

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
- **AND** 부분 수집된 결과는 폐기된다

#### Scenario: 취소 종료는 phase=idle을 emit한다
- **WHEN** handleDump의 모든 cancel 조기 종료 경로가 실행된다
- **THEN** UI에 `{ type: "phase", phase: "idle" }` 메시지가 전송된다
- **AND** UI는 이 메시지를 받고 primary 버튼 잠금을 해제한다

---

### Requirement: 노드 타입별 추출 규칙
plugin은 Frame(GROUP/COMPONENT/INSTANCE 포함), Text, Image, Component 정의, Instance, Vector 계열 노드를 타입별 전담 추출기로 처리해야 한다(SHALL). 각 추출기는 해당 타입이 의미를 가지는 필드만 수집하고, 타입에 맞지 않는 필드는 출력 객체에 포함하지 않아야 한다(MUST NOT). Instance 추출 시 override target 노드에 대해 `figma.getNodeByIdAsync` 등 비동기 lookup을 호출해서는 안 된다(MUST NOT) — override target의 실제 필드 값과 노드 타입은 instance의 `children` subtree에서 동일 id로 복원 가능하다.

#### Scenario: 텍스트 노드에서 characters와 스타일을 수집한다
- **WHEN** `TEXT` 노드가 방문된다
- **THEN** `characters`, `style.fontFamily`, `style.fontStyle`, `style.fontSize`, `style.lineHeight`, `style.letterSpacing`, `fills`, `box` 필드가 추출된다
- **AND** `characters`에 수록된 문자열은 삭제·치환되지 않은 원문 그대로 저장된다

#### Scenario: Instance 노드는 mainComponentId와 overrides를 저장한다
- **WHEN** `INSTANCE` 노드가 방문된다
- **THEN** `mainComponentId`는 원본 Component id 문자열로 저장되고 실제 Component 객체는 재귀적으로 중첩되지 않는다
- **AND** overridden 속성은 `overrides: Record<string, { fields: string[]; nodeType?: string }>` 객체로 수집된다
- **AND** 각 override 항목에 대해 `figma.getNodeByIdAsync` 호출이 발생하지 않는다

#### Scenario: Image fill을 가진 Frame은 imageHash를 보존한다
- **WHEN** Frame 노드의 `fills`에 `type: "IMAGE"` paint가 존재한다
- **THEN** 해당 paint의 `imageHash` 문자열이 그대로 보존된다
- **AND** 이미지 바이너리는 포함되지 않는다

#### Scenario: Vector 계열은 단일 'VECTOR' 계열 타입으로 정규화된다
- **WHEN** `LINE`, `RECTANGLE`, `ELLIPSE`, `POLYGON`, `STAR`, `BOOLEAN_OPERATION`, `VECTOR` 중 하나가 방문된다
- **THEN** 동일한 Vector 추출기가 사용되어 `box`, `fills`, (옵션) `svg` 필드를 출력한다
