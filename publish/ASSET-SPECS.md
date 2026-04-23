# Figma Community Asset Specifications — Tone A: Minimal Tech

Production guide for the 5 images the Figma Community listing needs. **Tone A** was chosen: high contrast, monospace, code-first visual language. Developer-forward.

## Global style tokens

Use these across every asset for consistency.

| Token | Value |
|---|---|
| Primary background | `#0B0B0F` (near-black, warm) |
| Secondary background | `#14141A` |
| Foreground primary | `#F5F5F4` |
| Foreground muted | `#9A9A99` |
| Accent | `#59E8B5` (terminal green) |
| Accent secondary | `#FF6A3D` (warm amber for highlights) |
| Border | `#26262C` |
| Font (headings & brand) | **JetBrains Mono** (or IBM Plex Mono) — weights 400, 700 |
| Font (body, optional) | **Inter** — weights 400, 500 |
| Corner radius | 12 px for cards, 4 px for small chips |
| Grid | 8 px baseline |

**Look-and-feel references:** GitHub dark theme · VS Code dark · Vercel docs · Linear landing page · modern CLI marketing (Raycast, Warp). Think "JSON on a black terminal".

---

## 1 · `icon-128.png` · 128 × 128 PNG

The 1 logo everyone sees. Keep it recognizable at 32 × 32 (Figma plugin list scaled down).

**Layout:**
- Canvas: 128 × 128, background `#0B0B0F`, rounded corners 24 px (iOS-style squircle optional).
- Center element: a **stylized `{ }`** (curly braces) in accent green `#59E8B5`, stroke weight ~6 px, height ~72 px.
- Inside the braces: a single horizontal line (3 px) in accent amber `#FF6A3D` — implying "data passing through".
- Optional: tiny "AI" or bullet dot at top-right corner in muted fg.

**Don't:**
- Don't add text. At 32×32 it becomes illegible.
- Don't use gradients. Flat accent colors only.

**Export:** PNG, sRGB, no transparency (Figma renders it on dark/light cards).

---

## 2 · `cover-1920x960.png` · 1920 × 960 PNG

The primary card on the Figma Community page. First impression.

**Layout (left 60% / right 40% split):**

### Left block (1152 × 960, padding 96 px)
- **Headline** (top-left, JetBrains Mono Bold 72 px, fg primary):
  `Design Context` on line 1
  `for LLMs` on line 2
- **Tagline** (below headline, JetBrains Mono 24 px, fg muted):
  `Figma → JSON. Ready for your LLM.`
- **Accent strip** (below tagline, 4 px tall, 120 px wide, accent green).
- **Feature chips** (bottom-left, 3 rows):
  - `$ zero network` (green chip border)
  - `$ zero telemetry` (green chip border)
  - `$ MIT licensed` (muted chip border)
  Use small dot bullets, monospace 16 px, 8 px vertical gap.

### Right block (768 × 960, bg `#14141A` with 1 px border-left `#26262C`)
- Render a **JSON code snippet** on a "terminal card":
  ```json
  {
    "$schema": ".../schemas/1.0.json",
    "schemaVersion": "1.0",
    "_howToUse": "Figma design dump for LLM context...",
    "meta": {
      "fileName": "my-design",
      "tool": "design-context-for-llms@1.0.0",
      "stats": { "totalNodes": 8335 }
    },
    "screens": [ ... ],
    "tokens": { "colors": [...] }
  }
  ```
  - Syntax highlight: keys = accent green, strings = amber, brackets = fg muted, numbers = fg primary.
  - Code card: 16 px corner radius, 1 px border `#26262C`, 48 px padding inside.
  - Above the code card: a minimal title bar `figma.my-design.home.slim.json` (fg muted, 14 px), with 3 macOS-style dot buttons (red/yellow/green) on the left at 10 px radius.

### Global
- Bottom-right corner (16 px padding): `mercuryPark · MIT` in JetBrains Mono 12 px, fg muted, right-aligned.
- No background gradients. Solid `#0B0B0F` only.
- Safe area: keep key text at least 64 px from every edge (Figma may crop).

**Export:** PNG, sRGB, < 8 MB.

---

## 3 · `screenshot-1.png` · Plugin UI (English, primary)

**Goal:** show what the plugin looks like in action, English locale.

**Suggested size:** 1600 × 1000 (Figma accepts variable aspect; this is card-safe).

**Composition:**
- Background: `#0B0B0F`, subtle 8 px dotted grid at 6% opacity for texture.
- Center: the plugin window mockup, 440 × 540 (native plugin size), placed at center, slightly angled if you want "floating card" effect (~2° rotation optional).
- Around it: 3 floating **label callouts** pointing to:
  1. The `Dump` button → caption: `One click. Full dump.`
  2. The Scope radio → caption: `Selection · Current page · All pages`
  3. The 3-tier output row → caption: `Slim · Full · Clipboard`
- Callouts: JetBrains Mono 14 px, accent green, 1 px line from caption to target.
- Top-left of canvas: small title `Design Context for LLMs` (JetBrains Mono Bold 32 px, fg primary).
- Bottom-right: `v1.0.0` chip in muted border.

**Take the screenshot:**
1. Run the plugin in Figma Desktop at English locale.
2. Apply Scope = Current page; expand Advanced options so options are visible.
3. Use macOS ⌘⇧4 window capture, or the full plugin iframe region.
4. Keep OS chrome (no traffic lights visible) — crop tightly.

---

## 4 · `screenshot-2.png` · Output / LLM flow (English)

**Goal:** show the "output" side. What does a developer get and do with it?

**Composition (split layout):**
- **Left half:** screenshot of the plugin **after Dump completes** — showing the 3 result buttons with file sizes in parentheses (e.g., `Download Slim (64.0 KB)`).
- **Right half:** a Claude Code / Cursor terminal-style card showing a dev pasting the JSON and asking:
  ```
  > Build the login screen using screens[] for structure
    and tokens.variables for colors.
  [Claude] Generated: src/screens/LoginScreen.tsx ✔
  ```
- Connecting **arrow** from left to right in accent amber, labeled `paste`.
- Top title: `Plugin → Claude Code in 10 seconds` (JetBrains Mono Bold 32 px).

**Asset for the right card:** you can mock this in Figma — don't need a real Claude Code screenshot.

---

## 5 · `screenshot-3.png` · Plugin UI (Korean)

**Goal:** prove localization. Same composition philosophy as screenshot-1 but in Korean.

**Composition:**
- Same 1600 × 1000 layout.
- Plugin captured with `KO` locale selected.
- Callouts in Korean:
  1. `Dump 버튼` → `한 번의 클릭. 전체 덤프.`
  2. Scope → `선택 · 현재 페이지 · 모든 페이지`
  3. 3-tier output → `Slim · Full · 클립보드`
- Top title: `한국어도 기본 지원` (JetBrains Mono Bold 32 px).
- Optional: add a small `locale: ko` pill in the top-right.

---

## Production order (recommended)

1. Build a reusable Figma frame with the global style tokens (background, fonts, accents, border).
2. Make the `icon-128.png` first — quickest, unblocks everything else.
3. `cover-1920x960.png` second — anchor visual.
4. `screenshot-1.png` → `screenshot-3.png` using the same frame setup.
5. Export all 5 as PNG from Figma (2x if needed, then resize to exact target).

## File integrity checklist

- [ ] All PNGs < 8 MB each.
- [ ] sRGB color space.
- [ ] Exact pixel dimensions: `icon-128.png = 128×128`, `cover-1920x960.png = 1920×960`.
- [ ] Screenshots are crisp (no JPEG artifacts, no blurry scaling).
- [ ] No personal Figma file contents visible other than the sample file you're going to publish.

## Where to put them

```
publish/
├── icon-128.png
├── cover-1920x960.png
├── screenshot-1.png
├── screenshot-2.png
├── screenshot-3.png
├── description.en.md  (already generated)
└── description.ko.md  (already generated)
```

Keep `publish/` committed to git (it's not in `.gitignore`) so releases always have the assets.
