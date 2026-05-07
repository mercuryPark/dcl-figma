## ADDED Requirements

### Requirement: schemaVersion 2.1 호환 추가 필드
plugin v0.3 출력의 `schemaVersion`은 `"2.1"`이며(SHALL), 2.0 대비 다음 필드들이 모두 추가 전용(additive)으로 정의된다(MUST):

VectorNode / FrameLikeNode:
- `strokeAlign?` (`"INSIDE"` | `"OUTSIDE"` | `"CENTER"`, 기본 `INSIDE`이면 생략)
- `strokeCap?`, `strokeJoin?` (Figma 기본값이면 생략)
- `strokeDashes?: number[]`
- `strokeMiterLimit?: number`
- `individualStrokes?: { top, right, bottom, left }`

Paint:
- `gradientTransform?: number[][]` (2x3 행렬, 단위 행렬이면 생략)
- IMAGE paint의 `rotation?`, `scalingFactor?`, `cropRect?: { x, y, w, h }`

TextNode.style:
- `runs?: Array<{ start, end, fontFamily?, fontStyle?, fontSize?, lineHeight?, letterSpacing?, fills?, textCase?, textDecoration? }>` (`figma.mixed` style 필드가 있을 때만)

NodeCommon:
- `renderBox?: { x, y, w, h }` (effects가 layout box를 벗어날 때만, 0.5px 이하 차이는 생략)
- `relativeTransform?: number[][]` (회전이 0이 아닌 노드만)

InstanceNode.overrides[id]:
- `nodeType?` (post-walk enrichment로 채워짐, 자식 id를 못 찾으면 생략)

VariableEntry:
- `scope?: string[]`
- `codeSyntax?: { WEB?, ANDROID?, iOS? }`

이 필드들은 모두 추가 전용이며 2.0 출력은 2.1 파서로 호환 파싱되어야 한다.

#### Scenario: schemaVersion 2.1이 envelope에 기록된다
- **WHEN** v0.3 plugin이 Slim 또는 Full을 직렬화한다
- **THEN** 최상위 `schemaVersion`이 문자열 `"2.1"`이다

#### Scenario: 2.0 출력은 2.1 파서로 그대로 읽힌다
- **WHEN** schemaVersion=`"2.0"`인 기존 파일을 2.1 파서가 읽는다
- **THEN** 새 필드들이 누락되어도 파싱 오류가 발생하지 않는다

## MODIFIED Requirements

### Requirement: Self-documenting meta 블록
모든 출력 JSON은 최상단에 자기 기술(self-documenting) 필드 4종을 포함해야 한다(SHALL): `$schema`(스키마 URL), `schemaVersion`(semver 문자열), `_howToUse`(LLM/사람이 바로 읽는 한 줄 영문 안내), `meta` 객체(덤프 컨텍스트). LLM이 파일 하나만 주어져도 용도를 이해할 수 있어야 한다.

#### Scenario: 최상단 4개 필드가 모두 존재한다
- **WHEN** Slim 또는 Full JSON을 파싱한다
- **THEN** 최상위 레벨에 `$schema`, `schemaVersion`, `_howToUse`, `meta` 키가 모두 존재한다
- **AND** 이 4개 필드는 다른 어떤 필드보다 먼저 직렬화되어 파일 선두에 나타난다

#### Scenario: schemaVersion은 semver "2.1"에서 v0.3 baseline이다
- **WHEN** v0.3 릴리즈의 plugin이 JSON을 생성한다
- **THEN** `schemaVersion`의 값은 문자열 `"2.1"`이다
- **AND** 이후 추가 필드만 있는 변경은 `"2.2"`, 호환 불가 변경은 `"3.0"`으로 올린다

#### Scenario: meta 객체는 필수 5개 필드를 가진다
- **WHEN** 출력 JSON의 `meta`를 파싱한다
- **THEN** `meta.fileKey`(string|null), `meta.pageId`(string), `meta.generatedAt`(ISO 8601 문자열), `meta.tool`(예: `"dcl-figma@0.3.0"`), `meta.degraded`(string[], 비어 있으면 생략 가능)를 포함한다
- **AND** `meta.generatedAt`는 덤프 완료 시각을 UTC ISO 8601 포맷으로 기록한다

---

### Requirement: meta.warnings 채널
Slim 자동 축소 외에도 비치명적 문제는 `meta.warnings` 객체로 노출되어야 한다(SHALL). 다음 키가 정의된다(MUST): `svgFailed`(number, SVG export 실패 수), `svgCapped`(number, 100개 cap 초과로 잘린 후보 수, 0이면 생략), `styleError`(string|null, style API 실패 메시지), `variablesError`(boolean, Variables API 실패 여부). 빈 경고는 출력 자체가 생략되거나 `{}`로 표시된다.

#### Scenario: SVG cap을 초과하면 svgCapped가 기록된다
- **WHEN** SVG export 후보가 250개이고 cap이 100이다
- **THEN** `meta.warnings.svgCapped`가 150이다
- **AND** 사용자에게는 UI 경고 배지로 노출된다

#### Scenario: style API가 실패하면 styleError 메시지가 기록된다
- **WHEN** `getLocalPaintStylesAsync`가 예외를 던진다
- **THEN** `meta.warnings.styleError`가 빈 문자열이 아닌 에러 메시지이다
- **AND** `tokens.colors`는 빈 배열로 폴백한다
