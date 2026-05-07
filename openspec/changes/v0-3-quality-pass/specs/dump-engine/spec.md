## ADDED Requirements

### Requirement: Stroke 디테일 7종 추출
plugin은 FrameLikeNode와 VectorNode에서 다음 stroke 메타를 추출해야 한다(SHALL): `strokeAlign` (`INSIDE` | `OUTSIDE` | `CENTER`, 기본 `INSIDE`이면 생략), `strokeCap` (기본 `NONE` 외만), `strokeJoin` (기본 `MITER` 외만), `strokeDashes`(빈 배열이면 생략), `strokeMiterLimit`(Figma 기본 `4`이면 생략), `individualStrokes` (top/right/bottom/left 비대칭 두께가 설정된 경우만, `{top, right, bottom, left}` 객체로 출력).

#### Scenario: dashed line은 strokeDashes 배열로 보존된다
- **WHEN** Vector 노드의 `strokeDashes`가 `[4, 2]`이다
- **THEN** 출력에 `strokeDashes: [4, 2]`가 기록된다

#### Scenario: 비대칭 두께 카드 border는 individualStrokes로 보존된다
- **WHEN** Frame 노드가 `strokeTopWeight=1`, 나머지 0이다 (`strokes` 자체는 set)
- **THEN** 출력에 `individualStrokes: { top: 1, right: 0, bottom: 0, left: 0 }`가 기록된다
- **AND** 단일 `strokeWeight`는 생략되거나 `1`로 유지된다

#### Scenario: OUTSIDE stroke align이 보존된다
- **WHEN** Frame 노드의 `strokeAlign`이 `"OUTSIDE"`이다
- **THEN** 출력에 `strokeAlign: "OUTSIDE"`가 기록된다

---

### Requirement: gradientTransform 보존
plugin은 GRADIENT_LINEAR/RADIAL/ANGULAR/DIAMOND paint에서 Figma의 `gradientTransform`(2x3 회전·스케일 행렬)을 보존해야 한다(SHALL). 행렬 값은 round2로 반올림되며 행렬 전체가 단위 행렬과 동일하면 출력에서 생략된다(MUST).

#### Scenario: 45도 LINEAR gradient의 행렬이 보존된다
- **WHEN** Frame fill에 LINEAR gradient가 45도 회전된 상태로 존재한다
- **THEN** 해당 paint 객체에 `gradientTransform: [[..., ..., ...], [..., ..., ...]]` 형태의 2x3 배열이 기록된다

#### Scenario: 단위 행렬은 노이즈로 제거된다
- **WHEN** gradient의 변환이 단위 행렬과 동일하다
- **THEN** 출력에 `gradientTransform` 키가 존재하지 않는다

---

### Requirement: Image fill rotation/scalingFactor/cropRect 보존
plugin은 IMAGE paint에서 `imageHash`와 `scaleMode` 외에 다음 필드를 추출해야 한다(SHALL): `rotation`(deg, 0이면 생략), `scalingFactor`(1이면 생략), `cropRect`({x,y,w,h}, 전체 영역(`{0,0,1,1}`)이면 생략).

#### Scenario: 회전된 이미지가 보존된다
- **WHEN** image paint의 `rotation`이 90이다
- **THEN** 출력 paint에 `rotation: 90`이 기록된다

#### Scenario: cropped 이미지가 보존된다
- **WHEN** image paint가 normalized `{x:0.1, y:0.2, w:0.5, h:0.3}` 영역만 표시한다
- **THEN** 출력 paint에 `cropRect: {x: 0.1, y: 0.2, w: 0.5, h: 0.3}`이 round2로 기록된다

---

### Requirement: 혼합 스타일 텍스트의 textRange runs 추출
plugin은 TextNode가 `figma.mixed`인 style 필드(`fontSize`, `fontName`, `fontWeight`, `fills`, `letterSpacing`, `lineHeight`, `textCase`, `textDecoration` 중 하나 이상)를 가질 때 `style.runs`를 추출해야 한다(SHALL). 각 run은 `{ start, end, ...style fields }` 형태이며, run 내부에서 동일한 값은 생략되어 차이만 기록된다(MUST). top-level `style.*` 필드는 단일 값 run의 경우 그대로 채워진다.

#### Scenario: 굵은 단어가 들어간 paragraph는 runs로 표현된다
- **WHEN** TextNode의 `characters="Welcome to **figma**"`이고 `**figma**` 부분이 다른 fontFamily/fills를 사용한다
- **THEN** 출력에 `style.runs: [{ start, end, fontFamily? ... }, ...]` 배열이 기록된다
- **AND** 동일 스타일 구간은 합쳐져 run 수를 최소화한다

#### Scenario: 단일 스타일 텍스트는 runs를 출력하지 않는다
- **WHEN** TextNode의 모든 style 필드가 균일한 값이다
- **THEN** 출력의 `style.runs`는 존재하지 않는다
- **AND** top-level `style.*` 필드만 채워진다

---

### Requirement: shadow/blur로 인한 renderBox 보강
plugin은 effects (DROP_SHADOW, INNER_SHADOW, LAYER_BLUR, BACKGROUND_BLUR)가 노드의 layout box(`box`)를 벗어나는 영역을 만들 때 `renderBox: { x, y, w, h }`를 출력해야 한다(SHALL). renderBox와 box가 0.5px 이내로 동일하면 생략된다(MUST). renderBox는 layout box를 대체하지 않으며, 두 필드가 모두 보존된다.

#### Scenario: drop-shadow가 있는 카드의 renderBox가 더 크다
- **WHEN** Frame의 box가 `{x: 100, y: 100, w: 200, h: 200}`이고 DROP_SHADOW의 `offset={x: 10, y: 10}`, `radius=8`, `spread=2`이다
- **THEN** 출력의 `renderBox`는 `box`보다 모든 변에서 적어도 `radius + spread`만큼 확장된다
- **AND** `box`는 그대로 `{100, 100, 200, 200}`을 유지한다

#### Scenario: shadow가 작거나 inset이면 renderBox는 생략된다
- **WHEN** effect가 INNER_SHADOW이거나 expansion이 0.5px 이하이다
- **THEN** 출력에 `renderBox` 키가 존재하지 않는다

---

### Requirement: 회전 노드의 relativeTransform 행렬
plugin은 회전된 노드(`rotation !== 0`)에서 `relativeTransform`(2x3 행렬)을 추출해야 한다(SHALL). 행렬 값은 round2로 반올림된다.

#### Scenario: 30도 회전 카드의 행렬이 보존된다
- **WHEN** 노드의 `rotation=30`이다
- **THEN** 출력에 `relativeTransform: [[..., ..., ...], [..., ..., ...]]` 형태의 2x3 배열이 기록된다

#### Scenario: 회전 없는 노드는 행렬을 출력하지 않는다
- **WHEN** 노드의 `rotation=0`이다
- **THEN** 출력에 `relativeTransform` 키가 존재하지 않는다

---

### Requirement: Instance overrides nodeType post-walk 보강
plugin은 instance 추출이 끝난 뒤 walker의 결과(children subtree)를 한 번 순회해 `overrides[id].nodeType`을 채워야 한다(SHALL). 추가 Figma API 호출 없이 in-memory id→type map만 사용한다(MUST). 자식 트리에서 id를 찾지 못한 경우 `nodeType`은 비어 있는 상태로 둔다.

#### Scenario: 텍스트 자식 override는 nodeType TEXT가 채워진다
- **WHEN** Instance의 children에 id `abc:1`이고 type TEXT인 노드가 있고 `overrides[abc:1] = { fields: ["characters"] }`이다
- **THEN** 후처리 후 `overrides[abc:1] = { fields: ["characters"], nodeType: "TEXT" }`이다

#### Scenario: figma.getNodeByIdAsync는 호출되지 않는다
- **WHEN** post-walk enrichment가 실행된다
- **THEN** `figma.getNodeByIdAsync` 호출이 발생하지 않는다

---

### Requirement: Variables scope와 codeSyntax 보존
plugin은 Variables 수집 시 각 entry에서 `scope`(예: `["ALL_SCOPES"]` | `["FRAME"]` | …)와 `codeSyntax` (예: `{WEB: "var(--color-primary)"}`)를 보존해야 한다(SHALL). 둘 다 없는 경우 출력에서 생략된다(MUST).

#### Scenario: scope가 FRAME 한정인 변수는 그 정보가 보존된다
- **WHEN** 변수가 FRAME scope로 정의되어 있다
- **THEN** `tokens.variables[i].scope`가 `["FRAME"]`로 기록된다

#### Scenario: codeSyntax가 정의된 변수는 alias가 보존된다
- **WHEN** 변수의 codeSyntax가 `{WEB: "--brand-primary"}`이다
- **THEN** `tokens.variables[i].codeSyntax.WEB`가 `"--brand-primary"`이다

## MODIFIED Requirements

### Requirement: 디자인 토큰 수집 (Styles + Variables)
plugin은 PaintStyle·TextStyle·EffectStyle·GridStyle 및 Variables(Local Variables)를 Async API로 수집해야 하며(SHALL), Variables 호출은 `try/catch`로 감싸 예외 시 빈 배열로 폴백해야 한다(MUST). Variable entry는 `id`, `name`, `collectionName`, `resolvedType`, 모드별 `value`/`modeId`/`modeName` 외에 `scope`(string[])와 `codeSyntax`(`{WEB?, ANDROID?, iOS?}`)도 보존해야 한다(SHALL). 두 필드는 정의되지 않은 경우 출력에서 생략된다.

#### Scenario: Paint/Text/Effect 스타일이 토큰으로 수집된다
- **WHEN** 디자인 토큰 옵션이 ON 상태로 덤프가 실행된다
- **THEN** `tokens.colors`, `tokens.typography`, `tokens.effects` 배열이 각각 PaintStyle, TextStyle, EffectStyle로부터 채워진다
- **AND** 각 항목은 style `id`와 `name`을 보존한다

#### Scenario: Variables가 있으면 모드별 값과 메타가 모두 수집된다
- **WHEN** 파일에 Variables가 정의되어 있다
- **THEN** `tokens.variables` 배열의 각 원소는 `{ id, name, collectionName, resolvedType, value, modeId, modeName }`을 갖는다
- **AND** scope/codeSyntax가 정의된 경우 해당 필드가 추가로 보존된다

#### Scenario: Variables 미사용 파일에서 안전하게 폴백한다
- **WHEN** 파일에 Variables가 하나도 정의되어 있지 않거나 API 호출이 예외를 던진다
- **THEN** `tokens.variables`는 빈 배열 `[]`로 설정된다
- **AND** 예외가 발생한 경우 `console.warn`이 기록되고 덤프 프로세스는 중단되지 않는다
