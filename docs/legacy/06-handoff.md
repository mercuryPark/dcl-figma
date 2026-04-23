# 06. Handoff — 메인 앱 연계 & 별도 세션 템플릿

## 1. 메인 앱 레포 디렉토리 설계

```
4quadverse-app/
├── docs/figma/
│   ├── dump/
│   │   ├── design.full.json       ← 플러그인 산출물 (10MB 허용)
│   │   ├── design.slim.json       ← Claude 컨텍스트용 (< 500KB)
│   │   └── README.md              ← 생성일 / 플러그인 버전 / stats 요약
│   ├── export/                    ← 기존 PNG export (유지)
│   ├── screens/                   ← 기존 화면 스펙 (유지)
│   └── tokens.md                  ← 기존 토큰 문서 (유지)
└── .claude/rules/
    └── figma-guard.md             ← MCP 사용 금지 룰 (갱신)
```

## 2. 메인 앱 후속 작업 (별도 세션)

플러그인 결과물을 받은 뒤 메인 앱 레포에서 할 일:

1. **파일 배치**
   - `docs/figma/dump/` 디렉토리 생성
   - `design.full.json`, `design.slim.json` 복사
2. **`dump/README.md` 작성** — 생성일, 플러그인 버전, `stats` 요약, 재생성 절차
3. **`CLAUDE.md` 갱신**
   > 디자인 참조는 `docs/figma/dump/design.slim.json` **우선**, 상세가 필요하면 `design.full.json`.
4. **`.claude/rules/figma-guard.md` 갱신**
   - MCP 완전 금지
   - dump 참조 지시

## 3. `dump/README.md` 템플릿

```markdown
# Figma Design Dump

- 생성일: 2026-04-__
- 플러그인 버전: 1.0.0 (or git hash)
- 파일: 잠깐살래 (fileKey: MTOxFfImwieeX0Ae2IkjOQ)
- Stats:
  - pages: __
  - frames: __
  - textNodes: __
  - components: __
  - totalNodes: __
  - elapsedMs: __

## 재생성 절차

1. Figma Desktop에서 잠깐살래 파일 열기
2. Quickstay Design Dumper 플러그인 실행
3. 옵션: 전체 페이지 / SVG OFF / 토큰 ON
4. Full + Slim JSON 다운로드
5. 이 디렉토리의 `design.full.json`, `design.slim.json` 덮어쓰기
6. 이 README의 생성일 / stats 갱신
```

---

## 4. 별도 Claude 세션 전달 템플릿

```
새 프로젝트에서 잠깐살래(4quadverse-app) 앱의 Figma 디자인을 덤프하는
플러그인을 개발하려 한다. `docs/` 폴더의 문서들을 순서대로 참고해서 구현해줘.

목표:
- Figma Free 플랜 REST API rate limit 회피를 위해 Plugin API 자체 덤프
- 잠깐살래 파일(fileKey: MTOxFfImwieeX0Ae2IkjOQ) 전체를
  Full JSON + Slim JSON 두 개로 추출
- 결과는 메인 앱 /Users/hoyeon/Documents/workspace/4quadverse-app/docs/figma/dump/
  에 수동 복사 (design.full.json + design.slim.json)

요구:
1. docs/04-implementation.md 의 Phase 1~6 순서대로 진행
2. 각 Phase 완료 시 수용 기준 체크리스트 보고
3. TypeScript + esbuild, 외부 npm 런타임 의존성 0
4. Figma Desktop "개발 모드 플러그인"으로 바로 로드 가능
5. docs/05-risks.md 의 Pre-mortem 시나리오를 고려해 방어 코드 작성
6. 막히는 부분 있으면 즉시 질문

시작해줘.
```

---

## 5. 메인 앱 연계 검증 체크 (yes/no)

플러그인 실행 + 파일 배치 후, 메인 앱 별도 Claude 세션에서 다음을 확인:

1. **파일 존재**
   ```bash
   ls /Users/hoyeon/Documents/workspace/4quadverse-app/docs/figma/dump/
   # design.full.json, design.slim.json, README.md 확인
   ```

2. **읽기 테스트**
   > "docs/figma/dump/design.slim.json 을 읽고 모든 페이지 이름과
   > 각 페이지의 top-level 프레임 개수/크기를 표로 정리해줘"

   응답이 slim JSON 내용과 일치하면 통과.

3. **토큰 참조 테스트**
   > "slim JSON의 tokens.colors 를 기반으로 React Native StyleSheet용
   > color palette 상수 파일을 만들어줘"

   응답이 실제 색상값을 사용하면 통과.
