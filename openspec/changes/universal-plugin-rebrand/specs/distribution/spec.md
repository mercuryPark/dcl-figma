## ADDED Requirements

### Requirement: MIT 라이선스 및 저작권 고지

레포지토리 루트에 표준 MIT LICENSE 파일을 배치하고, README 와 `manifest.json` 의 메타 필드에 동일 라이선스를 명시해야 한다 (SHALL).

#### Scenario: LICENSE 파일 존재

- **WHEN** 레포지토리 루트 디렉토리를 확인
- **THEN** `LICENSE` 파일이 존재하고 첫 줄이 `MIT License` 로 시작
- **AND** 저작권 연도와 저작권자("figma-design-dumper contributors")가 포함되어 있다

#### Scenario: README 에 라이선스 배지

- **WHEN** README.md 의 헤더 영역을 렌더링
- **THEN** "License: MIT" 배지 또는 명시 문구가 노출
- **AND** 링크는 레포 내 `/LICENSE` 경로를 가리킨다

### Requirement: GitHub 공개 레포 레이아웃

공개 GitHub 레포지토리는 README(한/영), `CONTRIBUTING.md`, `SECURITY.md`, `.github/ISSUE_TEMPLATE/{bug,feature,question}.yml`, `.github/pull_request_template.md` 를 모두 갖추어야 한다 (SHALL).

#### Scenario: README 이중 언어

- **WHEN** 레포 루트를 확인
- **THEN** `README.md`(영문 정본)과 `README.ko.md`(한국어 번역)이 공존
- **AND** 두 파일 상단에 서로를 가리키는 링크가 존재한다

#### Scenario: 이슈 템플릿 3종

- **WHEN** GitHub 신규 이슈 생성 화면에 진입
- **THEN** "Bug report", "Feature request", "Question" 3개 템플릿이 선택 가능
- **AND** 각 템플릿은 YAML form 형식으로 재현 단계, 기대 동작, Figma 파일 링크 필드를 포함한다

#### Scenario: PR 템플릿

- **WHEN** 사용자가 새 PR 을 생성
- **THEN** 템플릿 본문이 자동 채워지고 "Summary / Screenshots / Checklist(typecheck, build, manifest validated)" 섹션이 포함된다

### Requirement: GitHub Actions CI 검증 파이프라인

`.github/workflows/ci.yml` 은 Node LTS 환경에서 `npm ci` → `tsc --noEmit` → `node build.mjs` → manifest JSON schema 검증 → 번들 크기 상한 체크를 순차 실행해야 하며, 번들 크기 상한은 500KB 로 강제한다 (MUST).

#### Scenario: PR 성공 조건

- **WHEN** PR 에 대해 CI 가 실행되어 `dist/code.js` 크기가 420KB 인 경우
- **THEN** 모든 스텝이 성공하고 "CI / build" 체크가 녹색
- **AND** manifest 스키마 위반이 없으면 머지 가능 상태가 된다

#### Scenario: 번들 크기 초과로 실패

- **WHEN** 번들러 결과 `dist/code.js` 크기가 512KB (500KB 초과)
- **THEN** "Bundle size" 스텝이 exit code 1 로 실패하고 "size 512KB exceeds limit 500KB" 메시지가 출력된다

#### Scenario: manifest 유효성 실패

- **WHEN** `manifest.json` 의 `id` 값이 문자열이 아니거나 `networkAccess.allowedDomains` 가 `["none"]` 이외의 값을 가진 채 커밋
- **THEN** "Validate manifest" 스텝이 실패하고 위반 경로를 포함한 에러 메시지를 출력한다

### Requirement: semver + keep-a-changelog + gh release 아티팩트

버전 태그는 `vMAJOR.MINOR.PATCH` 형식을 따르고, 각 릴리즈마다 `CHANGELOG.md` 에 keep-a-changelog 형식 항목이 존재하며, `gh release create vX.Y.Z` 명령으로 `dist/*.zip` 자산이 첨부되어야 한다 (MUST).

#### Scenario: CHANGELOG 엔트리 생성

- **WHEN** v1.0.0 태그를 푸시하기 직전 상태
- **THEN** `CHANGELOG.md` 상단에 `## [1.0.0] - YYYY-MM-DD` 헤더와 `### Added/Changed/Fixed` 중 최소 1개 섹션이 기록되어 있다

#### Scenario: GitHub Release 자산 업로드

- **WHEN** 릴리즈 담당자가 `gh release create v1.0.0 dist/figma-design-dumper-v1.0.0.zip` 실행
- **THEN** GitHub Releases 페이지의 v1.0.0 엔트리에 zip 자산이 첨부되고 CHANGELOG 해당 섹션이 릴리즈 노트 본문으로 복사된다

#### Scenario: 잘못된 버전 포맷 거부

- **WHEN** 누군가 `v1.0` 또는 `1.0.0` (v 접두사 없음) 태그를 푸시 시도
- **THEN** 릴리즈 CI 워크플로가 태그 형식 검증 스텝에서 실패하고 릴리즈 자산이 생성되지 않는다

### Requirement: Figma Community publish 에셋 세트

Figma Community 에 플러그인을 게시하기 위한 아이콘, 커버, 스크린샷, 한/영 설명문, 공개용 샘플 Figma 파일을 단일 체크리스트로 구비해야 한다 (SHALL).

#### Scenario: 비주얼 에셋 스펙

- **WHEN** 릴리즈 담당자가 `publish/` 디렉토리를 확인
- **THEN** `icon-128.png`(128×128), `cover-1920x960.png`(1920×960), `screenshot-{1,2,3}.png` 3장이 존재
- **AND** 각 이미지 파일은 8MB 미만이고 PNG 포맷이다

#### Scenario: 한/영 설명문

- **WHEN** `publish/description.en.md` 와 `publish/description.ko.md` 파일을 열어 확인
- **THEN** 두 파일 모두 "What it does / How to use / Privacy" 세 섹션을 포함
- **AND** Privacy 섹션은 제로 네트워크·제로 텔레메트리를 명시한다

#### Scenario: 샘플 Figma 파일

- **WHEN** README 의 "Try with sample file" 링크를 클릭
- **THEN** 약 50개 노드로 자체 제작된 공개 Figma Community 파일로 이동
- **AND** 해당 파일은 플러그인 저자(또는 프로젝트 계정) 소유로 게시되어 있다

### Requirement: 제로 텔레메트리·제로 네트워크 보증

`manifest.json` 의 `networkAccess.allowedDomains` 는 정확히 `["none"]` 이어야 하고, README 의 Privacy 섹션과 `SECURITY.md` 에 "이 플러그인은 어떤 원격 서버로도 데이터를 전송하지 않는다" 가 명시되어야 한다 (MUST).

#### Scenario: manifest 값 고정

- **WHEN** `manifest.json` 을 JSON 파싱
- **THEN** `networkAccess.allowedDomains` 값이 배열이고 `["none"]` 과 deep-equal
- **AND** `networkAccess.reasoning` 필드는 존재하지 않거나 빈 문자열이다

#### Scenario: 문서 명시

- **WHEN** README.md 와 README.ko.md, SECURITY.md 를 grep
- **THEN** 세 파일 모두에 "zero network" 또는 "네트워크 접근 없음" 과 "zero telemetry" 또는 "텔레메트리 없음" 문구가 각각 1회 이상 등장한다

#### Scenario: CI 가드

- **WHEN** 누군가 `networkAccess.allowedDomains` 에 `"*"` 또는 특정 도메인을 추가하는 커밋을 PR 로 올림
- **THEN** CI 의 manifest 검증 스텝이 실패하고 머지가 차단된다

### Requirement: 도구 중립 통합 스니펫 라이브러리

README 는 Claude Code, Cursor, GitHub Copilot, Aider, Generic(도구 중립 프롬프트) 5종의 통합 스니펫을 복붙 가능한 코드 블록으로 제공해야 한다 (SHALL).

#### Scenario: 5개 섹션 존재

- **WHEN** README.md 의 "Integration snippets" 장을 확인
- **THEN** `### Claude Code`, `### Cursor`, `### GitHub Copilot`, `### Aider`, `### Generic` 5개 서브섹션이 정확히 이 순서로 등장
- **AND** 각 섹션은 최소 1개 이상의 ``` fenced code block 을 포함한다

#### Scenario: 특정 앱 경로 비포함

- **WHEN** 5개 스니펫 전체를 grep
- **THEN** `4quadverse` 또는 `/Users/` 로 시작하는 절대경로가 어디에도 등장하지 않는다
- **AND** 사용자가 직접 치환할 위치는 `{{project_root}}` 같은 플레이스홀더로만 표기된다

#### Scenario: Generic 스니펫 도구 중립성

- **WHEN** Generic 섹션의 스니펫 본문을 확인
- **THEN** 본문은 특정 도구명(Claude/Cursor/Copilot/Aider)을 포함하지 않음
- **AND** `design.slim.json` 파일을 읽어 LLM 컨텍스트로 제공하는 단계가 자연어로 명시되어 있다
