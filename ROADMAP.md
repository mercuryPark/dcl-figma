# Roadmap

실사용 피드백에 따라 반영할 개선 목록. **v1.0 에는 포함하지 않는다** — 현재 스코프는 "LLM 이 디자인 맥락을 이해하도록 돕는 도구" 이며, 픽셀 단위 복제는 이 도구의 목표가 아니다.

> 자세한 배경은 [`openspec/changes/universal-plugin-rebrand/proposal.md`](./openspec/changes/universal-plugin-rebrand/proposal.md) 의 "향후 확장" 섹션 참조.

## v1.1 후보 — LLM 재현 품질 개선

잠깐살래 파일(8,335 노드 / 84 컴포넌트)을 실제 덤프해본 결과를 토대로 정리. 현 Slim 의 추정 정확도는 75-85%. 아래 항목들을 적용하면 85-92% 수준으로 올라가지만, **어느 것도 100% 일치를 보장하지 않는다**.

### P0 · sectionTree 에 시각 속성 인라인 ⭐️ 우선
**현재:**
```
FRAME: 로그인 진입
  FRAME: Status Bar
  TEXT: 로그인
```
**개선 후:**
```
FRAME(vstack,p:20,gap:16,bg:#fff): 로그인 진입
  FRAME(hstack,pad:[16,12]): Status Bar
  TEXT(24px/bold/#191614): 로그인
```
- **영향**: LLM 이 각 화면의 레이아웃·컬러·타이포를 한 눈에 읽음.
- **크기**: Slim 크기 +30% 예상. 현 64KB 기준 → ~85KB (여유 충분).
- **구현**: `src/slim/toSlim.ts` 의 `renderSectionTree` 확장. Auto Layout 속성(`layoutMode`, `itemSpacing`, `padding*`) + fills[0] + TEXT 스타일 인라인.
- **리스크**: sectionTree 파싱이 복잡해짐 (LLM 가독성은 무너지지 않음).

### P1 · Variables 바인딩 역참조
- **현재**: 색이 `#ff5f46` hex 로만 저장됨. "이게 `Primary/Primary` variable" 이란 사실 소실.
- **개선**: 노드 출력에 `boundVariables: { fills: "VariableID:140:151" }` 형태로 병렬 기록.
- **영향**: LLM 이 "토큰 이름 그대로" 코드에 쓰게 유도.
- **구현**: `src/extract/common.ts` 의 `normalizePaints` 에서 Figma 노드의 `boundVariables` 필드 함께 추출.

### P2 · Slim 에 Component 스펙 스냅샷
- **현재**: `components[]` 에 id/name/description 만. "Box Button 이 어떻게 생겼는지" 는 Full 에만.
- **개선**: 각 component 에 1-depth children 요약 추가. 예: `structure: "FRAME(hstack,p:16,bg:Primary/Primary) > TEXT(white)"`.
- **영향**: LLM 이 컴포넌트 사용 시 실제 모양을 추정 가능.
- **크기**: 84 components × ~100B = ~8KB 추가.

### P3 · SVG export 기본 ON 권장
- **현재**: Advanced options → opt-in. 처음 사용자는 아이콘이 안 들어감.
- **개선**: UI 기본값을 체크 상태로. `icon/*` 네이밍 규칙 명시.
- **영향**: LLM 이 아이콘 선택을 일관되게 함.
- **리스크**: 파일에 VECTOR 가 많으면 덤프 속도 느려짐 — `pLimit(10)` 으로 완화됨.

### P4 · 이미지 썸네일 (opt-in)
- **현재**: `imageHash` 문자열만. LLM 은 "어떤 이미지" 인지 모름.
- **개선**: `exportAsync({format: "PNG", constraint: {type: "WIDTH", value: 64}})` 로 64×64 썸네일 생성 → base64 로 Full 에만 삽입.
- **리스크**: Full 크기 급증 (이미지 많은 파일). Slim 에는 절대 넣지 말 것.

---

## v1.1 후보 — 워크플로우

### Per-page 분할 출력
- 지금 all-pages 덤프는 `pageSlug="all"` 하나의 JSON. 페이지별로 분리하고 싶은 수요 예상.
- 구현: UI 체크박스 "Split by page" + zip 다운로드.

### 옵션 프리셋 저장/공유
- "로그인 화면 전용 설정" 같은 프리셋을 export/import.
- Figma `clientStorage` 에 이름 붙여 저장.

### 추가 locale
- `ja`, `zh-CN`, `es` 커뮤니티 기여 환영. `CONTRIBUTING.md` 에 절차 명시됨.

---

## v1.2+ 후보

### Figma Code Connect 통합
- Figma 가 공식 제공하는 Component → 실제 코드 매핑 시스템. LLM 이 "이 Box Button 인스턴스는 `<PrimaryButton>` 컴포넌트" 라고 정확히 매핑 가능.
- 100% 일치 목표가 있다면 이 경로가 가장 현실적.

### Multi-file 덤프
- 여러 파일을 하나의 Slim 으로 결합 (예: 앱 + 디자인 시스템 파일).

---

## 영구 Non-Goals

다음은 이 도구가 **절대 하지 않는다** (스코프 외):

- 서버 / 클라우드 동기화.
- 사용 통계 / 원격 로깅 / 익명 텔레메트리.
- REST API fallback.
- 픽셀 단위 Figma → 코드 자동 변환 (그건 Figma Dev Mode / MCP 영역).

---

## 기여

이 로드맵의 항목 중 구현하고 싶은 게 있다면 해당 번호 (예: "P0") 를 제목으로 OpenSpec change 를 작성해 PR 로 올려주세요. `openspec/changes/<slug>/proposal.md` 템플릿 사용.
