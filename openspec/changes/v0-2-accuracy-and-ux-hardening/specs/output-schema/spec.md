## ADDED Requirements

### Requirement: schemaVersion 2.0 호환 추가 필드
plugin v0.2 출력의 `schemaVersion`은 `"2.0"`이며(SHALL), 1.0 대비 다음 필드들이 추가로 정의된다(MUST):
- `FrameLikeNode.layoutWrap` (`"NO_WRAP"` | `"WRAP"`, 기본값 시 생략)
- `FrameLikeNode.counterAxisSpacing` (number, 0이면 생략)
- `FrameLikeNode.cornerRadii` 및 `VectorNode.cornerRadii` (`{ tl, tr, br, bl }`)
- `NodeCommon.constraints` (`{ horizontal, vertical }`, 기본 `{MIN, MIN}` 시 생략)
- `NodeCommon.layoutPositioning` (`"AUTO"` | `"ABSOLUTE"`, 기본 `"AUTO"` 시 생략)

이 필드들은 모두 추가 전용(additive)이며 1.0 출력은 2.0 파서로 호환 파싱되어야 한다.

#### Scenario: schemaVersion 2.0이 envelope에 기록된다
- **WHEN** v0.2 plugin이 Slim 또는 Full을 직렬화한다
- **THEN** 최상위 `schemaVersion`이 문자열 `"2.0"`이다

#### Scenario: 1.0 출력은 2.0 파서가 호환 read 가능하다 (best-effort)
- **WHEN** schemaVersion=`"1.0"`인 기존 파일을 2.0 파서가 읽는다
- **THEN** 새 필드들이 누락되어도 파싱 오류가 발생하지 않는다
- **AND** 새 필드는 `undefined`로 표현된다

---

### Requirement: letterSpacing 단위 표기 (BREAKING)
`TextNode.style.letterSpacing` 및 `TypographyToken.letterSpacing`의 타입은 `string | number`이다(SHALL). 단위가 알려진 경우 `"<value>%"` 또는 `"<value>px"` 형태의 문자열을 출력하고, 단위 미상에서만 raw `number`로 폴백한다(MUST). v0.1의 `number` 단일 타입과는 호환되지 않는다(BREAKING).

#### Scenario: 2.0 출력은 단위 suffix를 포함한 문자열을 사용한다
- **WHEN** 텍스트 자간이 4% 또는 0.5px이다
- **THEN** 출력의 `letterSpacing`이 각각 `"4%"` 또는 `"0.5px"`이다

#### Scenario: 단위 미상은 number 폴백
- **WHEN** Figma API가 `letterSpacing`의 unit을 인식 가능한 값으로 돌려주지 않는다
- **THEN** 출력의 `letterSpacing`이 raw `number`로 폴백된다

#### Scenario: 1.0 소비자는 호환되지 않는다
- **WHEN** 1.0 시기에 `parseFloat`로 letterSpacing을 사용하던 소비자가 2.0 출력을 처리한다
- **THEN** 단위 정보가 손실될 수 있다(`"2%"` → `2`로 잘못 해석)
- **AND** 마이그레이션은 단위 suffix 파싱 로직 추가가 필요하다

---

### Requirement: InstanceNode.overrides 객체 구조 (BREAKING)
`InstanceNode.overrides`의 타입은 `Record<string, { fields: string[]; nodeType?: string }>`이다(SHALL). 각 키는 override 대상 자식 노드의 id이며, 값 객체는 변경된 필드 이름 목록(`fields`)과 (가능한 경우) 노드 타입 라벨(`nodeType`)을 포함한다(MUST). 각 override 필드의 *실제 값*은 instance의 `children` subtree 내 동일 id 노드에서 복원 가능하다(MUST). v0.1의 `Record<string, string[]>`과는 호환되지 않는다(BREAKING).

#### Scenario: overrides는 객체 값 형태를 사용한다
- **WHEN** Instance 노드의 텍스트 자식이 main component와 다른 `characters`와 `fills`를 가진다
- **THEN** `overrides[childId]`는 `{ fields: ["characters", "fills"] }` 형태이다
- **AND** v0.1 형식의 단순 string 배열로 직렬화되지 않는다

#### Scenario: nodeType은 v0.2에서 비어 있을 수 있다
- **WHEN** v0.2 plugin이 overrides 메타데이터를 작성한다
- **THEN** 각 override 항목의 `nodeType`은 비어 있거나 누락될 수 있다
- **AND** 소비자는 children subtree에서 동일 id를 찾아 노드 타입을 복원할 수 있다

#### Scenario: 실제 override 값은 children subtree에서 복원된다
- **WHEN** 소비자가 `overrides["abc:123"].fields`에 `"characters"`가 있음을 본다
- **THEN** instance의 `children` 트리에서 id `"abc:123"`인 TEXT 노드의 `characters` 필드를 읽으면 현재 override된 텍스트 값을 얻는다

## MODIFIED Requirements

### Requirement: Self-documenting meta 블록
모든 출력 JSON은 최상단에 자기 기술(self-documenting) 필드 4종을 포함해야 한다(SHALL): `$schema`(스키마 URL), `schemaVersion`(semver 문자열), `_howToUse`(LLM/사람이 바로 읽는 한 줄 영문 안내), `meta` 객체(덤프 컨텍스트). LLM이 파일 하나만 주어져도 용도를 이해할 수 있어야 한다.

#### Scenario: 최상단 4개 필드가 모두 존재한다
- **WHEN** Slim 또는 Full JSON을 파싱한다
- **THEN** 최상위 레벨에 `$schema`, `schemaVersion`, `_howToUse`, `meta` 키가 모두 존재한다
- **AND** 이 4개 필드는 다른 어떤 필드보다 먼저 직렬화되어 파일 선두에 나타난다

#### Scenario: schemaVersion은 semver "2.0"에서 v0.2 baseline이다
- **WHEN** v0.2 릴리즈의 plugin이 JSON을 생성한다
- **THEN** `schemaVersion`의 값은 문자열 `"2.0"`이다
- **AND** v0.1과의 차이는 추가된 layout/text/instance 필드와 두 BREAKING 타입 변경이다
- **AND** 이후 추가 필드만 있는 변경은 `"2.1"`, 호환 불가 변경은 `"3.0"`으로 올린다

#### Scenario: _howToUse는 LLM이 바로 이해할 영문 한 줄이다
- **WHEN** Slim JSON을 연다
- **THEN** `_howToUse`는 단일 문자열이며 예시 값 `"Figma design dump for LLM context. Load this JSON and reference screens[], tokens, and components when generating UI code."`와 같은 형태의 영문 안내이다
- **AND** 줄바꿈(`\n`)을 포함하지 않는다

#### Scenario: meta 객체는 필수 5개 필드를 가진다
- **WHEN** 출력 JSON의 `meta`를 파싱한다
- **THEN** `meta.fileKey`(string|null), `meta.pageId`(string), `meta.generatedAt`(ISO 8601 문자열), `meta.tool`(예: `"dcl-figma@0.2.0"`), `meta.degraded`(string[], 비어 있으면 생략 가능)를 포함한다
- **AND** `meta.generatedAt`는 덤프 완료 시각을 UTC ISO 8601 포맷으로 기록한다
