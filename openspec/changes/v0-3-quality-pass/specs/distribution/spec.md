## ADDED Requirements

### Requirement: 단일 소스 버전 (build-time 주입)
plugin은 `package.json`의 `version` 필드를 단일 소스로 사용해야 하며(SHALL), build 시 `__PACKAGE_VERSION__` 상수로 sandbox/UI 번들에 주입한다(MUST). `src/meta.ts`의 `VERSION`은 dev fallback이고 build 산출물에서는 `__PACKAGE_VERSION__`이 우선한다. landing site(`site/*`)도 같은 값을 build 시 `site/version.json`으로 출력해 소비한다.

#### Scenario: package.json 버전 변경이 모든 산출물에 반영된다
- **WHEN** `package.json#version`을 `0.3.0`으로 바꾸고 `npm run build`를 수행한다
- **THEN** `dist/code.js`와 `dist/ui.html` 내부에 `0.3.0`이 출력된다
- **AND** `site/version.json`에 `{"version": "0.3.0"}`이 기록되고 `site/app.js`가 이를 읽어 hero/CTA 라벨을 갱신한다

#### Scenario: dev 환경에서 esbuild를 거치지 않고도 동작한다
- **WHEN** 개발자가 esbuild 없이 src 코드를 직접 import한다
- **THEN** `src/meta.ts`의 `VERSION` fallback이 사용되며 빈 문자열이나 `undefined`가 출력되지 않는다

---

### Requirement: Release 자동화 (CI 기반 zip + sha256 + GitHub Release)
release 워크플로(`.github/workflows/release.yml`)는 tag push (`v*`) 시 다음 단계를 자동 실행해야 한다(SHALL):
1. `npm ci`
2. `npm run verify:all` (typecheck + test + build + manifest + locales + size)
3. `manifest.json` + `dist/code.js` + `dist/ui.html`만 포함하는 zip 생성 (`dist/test/` 제외 강제)
4. SHA256 체크섬 파일 생성 (`*.sha256`)
5. zip과 체크섬을 `gh release create` 또는 `gh release upload`로 업로드
6. release notes는 CHANGELOG.md의 해당 버전 섹션을 추출

#### Scenario: tag push가 release를 만든다
- **WHEN** `v0.3.0` 태그를 push한다
- **THEN** GitHub Actions가 release.yml 워크플로를 실행하고 `dcl-figma-v0.3.0.zip` + `.sha256`이 GitHub Release에 첨부된다

#### Scenario: 빌드 실패는 release를 만들지 않는다
- **WHEN** `verify:all` 단계에서 typecheck나 test가 실패한다
- **THEN** zip이 만들어지지 않고 release도 생성되지 않는다

#### Scenario: 잘못된 tag 형식은 거부된다
- **WHEN** `0.3.0` (`v` prefix 없음) 같은 tag를 push한다
- **THEN** 워크플로가 tag format check 단계에서 실패하고 후속 단계가 실행되지 않는다

## MODIFIED Requirements

### Requirement: 결정론적 파일명 규약
다운로드 파일명은 `figma.{fileSlug}.{pageSlug}.slim.json` / `figma.{fileSlug}.{pageSlug}.full.json` 패턴을 따라야 한다(SHALL). `fileSlug`와 `pageSlug`는 각각 Figma 파일 이름·페이지 이름을 소문자·kebab-case·ASCII로 변환한 값이며(MUST), 비 ASCII 문자는 전각/발음 구분 기호 제거 후 ASCII 근사치로 치환되고 남은 비허용 문자는 하이픈으로 대체된다. release 산출물 zip 파일명은 `dcl-figma-vX.Y.Z.zip` 패턴이며 동일 디렉토리에 `dcl-figma-vX.Y.Z.zip.sha256` 체크섬이 함께 발행된다.

#### Scenario: 영문 파일 이름이 kebab-case로 슬러그화된다
- **WHEN** Figma 파일명이 `"My Design System"`이고 페이지명이 `"Home Page"`이다
- **THEN** Slim 파일명은 `figma.my-design-system.home-page.slim.json`이다

#### Scenario: 한국어·비 ASCII 문자는 ASCII로 변환된다
- **WHEN** 페이지명이 `"홈 화면 / 메인"`이다
- **THEN** 해당 `pageSlug`는 ASCII-only kebab-case 근사치로 변환되거나 폴백된다

#### Scenario: release zip은 sha256과 함께 발행된다
- **WHEN** v0.3.0 release가 자동 발행된다
- **THEN** GitHub Release에 `dcl-figma-v0.3.0.zip`과 `dcl-figma-v0.3.0.zip.sha256`이 동시에 첨부된다
- **AND** `.sha256` 파일에는 zip의 64자 hex digest가 표준 형식으로 기록된다
