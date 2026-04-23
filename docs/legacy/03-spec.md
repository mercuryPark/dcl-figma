# 03. Spec — 덤프 대상, 스키마, UI, 전송 전략

## 1. 덤프 대상

1. **메타데이터** — 파일명, fileKey(수동), 추출 시각(ISO), 플러그인 버전, stats
2. **페이지** — id/name/child count. `1747:2606` 우선 처리 옵션
3. **프레임** — id/name/w/h, 절대+상대 좌표, autoLayout(direction/padding/spacing/alignment), fills/strokes/effects/cornerRadius, children 재귀 (depth limit 옵션)
4. **텍스트** — `characters`, fontName, fontSize, lineHeight, letterSpacing, fills, textAlign
5. **이미지/아이콘** — `imageHash` 기록. SVG export는 **기본 OFF**
   - ON 시: `icon/*` naming convention 또는 VECTOR 노드 중 ≤ 64×64, 총 100개 cap
6. **컴포넌트/인스턴스** — 정의(id/name/description/variantProperties), 인스턴스(mainComponentId/overrides)
7. **토큰** — PaintStyle, TextStyle, EffectStyle, Variables(모드별 resolved 값)

## 2. 제외 & Pruning 규칙

### 제외
- 숨김 노드 (옵션)
- 잠긴 노드는 포함 + `locked: true`
- 빈 Group pruning

### 공통 Prune 규칙
- 값이 다음인 경우 해당 필드 생략:
  - `null`, `undefined`, `[]`, `{}`
  - `0` (특정 필드 한정: `cornerRadius`, `itemSpacing`, `rotation`)

### 기본값 생략 (동일 시 생략)
| 필드 | 기본값 |
|------|--------|
| `visible` | `true` |
| `opacity` | `1` |
| `locked` | `false` |
| `blendMode` | `"NORMAL"` |
| `layoutMode` | `"NONE"` (autoLayout 없을 때) |

### 부동소수 반올림
- 좌표/크기는 소수점 2자리: `Math.round(x * 100) / 100`

---

## 3. 출력 JSON 스키마

### Full dump (`design.full.json`)

```ts
interface DesignDump {
  meta: {
    fileName: string;
    fileKey: string | null;
    dumpedAt: string;
    pluginVersion: string;
    stats: {
      pages: number;
      frames: number;
      textNodes: number;
      components: number;
      instances: number;
      totalNodes: number;
      svgExported: number;
      elapsedMs: number;
    };
  };
  tokens: {
    colors: Array<{ id: string; name: string; paints: Paint[] }>;
    typography: Array<{
      id: string;
      name: string;
      fontFamily: string;
      fontStyle: string;
      fontSize: number;
      lineHeight?: number;
      letterSpacing?: number;
    }>;
    effects: Array<{ id: string; name: string; effects: Effect[] }>;
    variables?: Array<{
      id: string;
      name: string;
      collectionName: string;
      resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
      valuesByMode: Record<string, unknown>;
    }>;
  };
  pages: Array<{
    id: string;
    name: string;
    frames: FrameNode[];
  }>;
  components: Array<{
    id: string;
    name: string;
    description?: string;
    variantProperties?: Record<string, unknown>;
  }>;
}

interface FrameNode {
  id: string;
  name: string;
  type: 'FRAME' | 'COMPONENT' | 'INSTANCE' | 'GROUP';
  box: { x: number; y: number; w: number; h: number };
  layout?: {
    mode: 'HORIZONTAL' | 'VERTICAL';
    padding: [number, number, number, number]; // t r b l
    itemSpacing?: number;
    primaryAxisAlign?: string;
    counterAxisAlign?: string;
  };
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
  cornerRadius?: number;
  children?: Array<FrameNode | TextNode | VectorNode>;
  mainComponentId?: string;        // INSTANCE 전용
  overrides?: Record<string, unknown>;
  locked?: boolean;
}

interface TextNode {
  id: string;
  name: string;
  type: 'TEXT';
  characters: string;
  style: {
    fontFamily: string;
    fontStyle: string;
    fontSize: number;
    lineHeight?: number;
    letterSpacing?: number;
  };
  fills?: Paint[];
  box: { x: number; y: number; w: number; h: number };
}

interface VectorNode {
  id: string;
  name: string;
  type: 'VECTOR' | 'BOOLEAN_OPERATION' | 'LINE' | 'RECTANGLE' | 'ELLIPSE' | 'POLYGON' | 'STAR';
  box: { x: number; y: number; w: number; h: number };
  fills?: Paint[];
  svg?: string;                    // exportAsync({ format: 'SVG' }) 결과, 옵션
}
```

### Slim summary (`design.slim.json`, 목표 < 500KB)

```ts
interface DesignSlim {
  meta: DesignDump['meta'];
  tokens: {
    colors: Array<{ name: string; hex: string }>;
    typography: Array<{
      name: string;
      font: string;
      size: number;
      lineHeight?: number;
    }>;
    variables?: Array<{
      name: string;
      type: string;
      values: Record<string, string | number>;
    }>;
  };
  screens: Array<{
    id: string;
    name: string;
    page: string;
    w: number;
    h: number;
    components: string[];          // 화면 내 컴포넌트 이름 unique
    textSummary: string[];         // 텍스트 샘플 상위 20개
    sectionTree: string;           // 인덴트 트리, depth 3까지
  }>;
  components: Array<{
    name: string;
    variants: string[];
    usageCount: number;
  }>;
}
```

---

## 4. UI

- **라디오:** 현재 페이지 / 전체 페이지
- **체크박스:** SVG 아이콘 포함 (기본 OFF) / 숨김 노드 포함 (기본 OFF) / 디자인 토큰 포함 (기본 ON)
- **버튼:** 덤프 시작 / Full JSON 다운로드 / Slim JSON 다운로드 / Slim 클립보드 복사
- **진행:** 처리 노드 수 / 총 노드 수 + 현재 단계 (`pages → tokens → frames → svg → slim`)

---

## 5. ★ postMessage 대용량 전송 전략 (critical)

### 문제
`figma.ui.postMessage({ type: 'done', json })` 로 5-10MB 객체를 한 번에 보내면 structured clone이 동기로 깊은 트리를 순회하며 샌드박스 프리즈/크래시 유발.

### 해결
1. 샌드박스(`code.ts`)에서 `JSON.stringify(dump)` 로 **문자열 변환**
2. 500KB 단위로 슬라이스 → `figma.ui.postMessage({ type: 'chunk', seq, data })` 순차 전송
3. 완료 시 `{ type: 'done', totalSeq }` 마커 전송
4. UI(`ui.ts`)에서 청크 축적 → `join('')` → Blob 생성
5. **객체를 통째로 넘기지 않음**

### 의사 코드
```ts
// code.ts
const full = JSON.stringify(dump);
const CHUNK = 500 * 1024;
for (let i = 0, seq = 0; i < full.length; i += CHUNK, seq++) {
  figma.ui.postMessage({ type: 'chunk', kind: 'full', seq, data: full.slice(i, i + CHUNK) });
}
figma.ui.postMessage({ type: 'done', kind: 'full', totalSeq: Math.ceil(full.length / CHUNK) });

// ui.ts
const buffers = { full: [] as string[], slim: [] as string[] };
window.onmessage = (e) => {
  const msg = e.data.pluginMessage;
  if (msg.type === 'chunk') buffers[msg.kind][msg.seq] = msg.data;
  if (msg.type === 'done') {
    const blob = new Blob([buffers[msg.kind].join('')], { type: 'application/json' });
    triggerDownload(blob, `design.${msg.kind}.json`);
  }
};
```
