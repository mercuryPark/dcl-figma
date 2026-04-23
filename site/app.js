// dcl-figma landing — i18n toggle + snippet tabs + copy-to-clipboard.
// Zero dependencies. Keep it small.

(function () {
  "use strict";

  /* ---------------- i18n dictionary ------------------------------------- */
  const DICT = {
    en: {
      "nav.install": "Install",
      "nav.usage": "Usage",
      "nav.snippets": "Snippets",
      "nav.privacy": "Privacy",
      "hero.eyebrow": "v0.1.0 · pre-release · MIT licensed",
      "hero.title": "Design Context for LLMs",
      "hero.tagline": "Figma → JSON. Ready for your LLM.",
      "hero.sub": "A free and open-source Figma plugin that exports your design file as a compact, self-documenting JSON snapshot — ready to paste into Claude Code, Cursor, GitHub Copilot, Aider, or any LLM session.",
      "hero.download": "Download .zip",
      "hero.viewGithub": "View on GitHub",
      "hero.stat1": "runtime deps",
      "hero.stat2": "Slim output",
      "hero.stat3": "nodes validated",
      "why.title": "Why this exists",
      "why.free.title": "Free alternative to Figma MCP",
      "why.free.body": "Figma's own MCP server requires a paid plan. This plugin gives every LLM coding tool the same context — at no cost.",
      "why.zero.title": "Zero network, zero telemetry",
      "why.zero.body": "<code>networkAccess.allowedDomains: [\"none\"]</code>. CI enforces it. No analytics, no beacons, no phone-home.",
      "why.shrink.title": "Smart auto-shrink",
      "why.shrink.body": "If Slim exceeds 500 KB, the plugin reduces <code>textSummary</code>, then <code>sectionTree</code>, then drops tokens — each step logged in <code>meta.degraded</code>.",
      "why.neutral.title": "Tool-neutral",
      "why.neutral.body": "Works with Claude Code, Cursor, GitHub Copilot, Aider, ChatGPT — the JSON is just JSON. No vendor lock-in.",
      "install.title": "Install",
      "install.sub": "No build. No npm. No Figma paid tier.",
      "install.s1.title": "Download the release zip",
      "install.s1.body": "Grab the latest <code>dcl-figma-vX.Y.Z.zip</code> from GitHub Releases.",
      "install.s1.cta": "Open Releases →",
      "install.s2.title": "Unzip anywhere",
      "install.s2.body": "For example <code>~/figma-plugins/dcl-figma/</code>. The folder contains <code>manifest.json</code> and a <code>dist/</code> directory.",
      "install.s3.title": "Import in Figma Desktop",
      "install.s3.body": "Menu → <strong>Plugins → Development → Import plugin from manifest…</strong> → select the <code>manifest.json</code> from the folder you unzipped.",
      "install.s4.title": "Run it",
      "install.s4.body": "<strong>Plugins → Development → Design Context for LLMs</strong>. Done.",
      "usage.title": "How it flows",
      "usage.sub": "Figma file → plugin → LLM. About 30 seconds.",
      "usage.s1.title": "Click Dump",
      "usage.s1.body": "Open the plugin, pick scope, click one button.",
      "usage.s2.title": "Get JSON",
      "usage.s2.body": "Download Slim, Full, or copy straight to clipboard.",
      "usage.s3.title": "Paste into your LLM",
      "usage.s3.body": "Drag the file into Claude Code, Cursor, ChatGPT — or paste the clipboard content.",
      "snip.title": "Integration snippets",
      "snip.sub": "Paste these into your LLM session after attaching the JSON.",
      "snip.copy": "Copy",
      "priv.title": "Zero network. Zero telemetry.",
      "priv.sub": "One hard guarantee: your design data never leaves your machine.",
      "priv.1": "<code>networkAccess.allowedDomains: [\"none\"]</code> declared in manifest. Figma blocks all outbound requests at runtime.",
      "priv.2": "No analytics SDK, no error reporters, no anonymous metrics.",
      "priv.3": "Design data flow: Figma sandbox → plugin UI iframe → <code>&lt;a download&gt;</code> / clipboard. That's the entire surface.",
      "priv.4": "CI validates the zero-network invariant on every PR — it cannot silently regress.",
      "priv.5": "MIT licensed, auditable line-by-line on <a href=\"https://github.com/mercuryPark/dcl-figma\" target=\"_blank\" rel=\"noopener\">GitHub</a>.",
      "cta.title": "Ready to ship Figma context to your LLM?",
      "cta.sub": "30 seconds to install. Pre-built zip, no build step.",
      "cta.download": "Download v0.1.0 .zip",
      "cta.github": "GitHub →",
      "footer.tagline": "Figma design context, served to your LLM.",
      "footer.releases": "Releases",
      "footer.built": "Built with zero analytics."
    },
    ko: {
      "nav.install": "설치",
      "nav.usage": "사용법",
      "nav.snippets": "스니펫",
      "nav.privacy": "프라이버시",
      "hero.eyebrow": "v0.1.0 · 프리릴리즈 · MIT 라이선스",
      "hero.title": "Design Context for LLMs",
      "hero.tagline": "Figma → JSON. 당신의 LLM 이 바로 읽어요.",
      "hero.sub": "Figma 디자인을 LLM 이 바로 읽을 수 있는 JSON 스냅샷으로 내보내는 무료 오픈소스 플러그인입니다. Claude Code, Cursor, GitHub Copilot, Aider 등 어떤 LLM 세션에도 붙여 넣으세요.",
      "hero.download": ".zip 다운로드",
      "hero.viewGithub": "GitHub 에서 보기",
      "hero.stat1": "런타임 의존성",
      "hero.stat2": "Slim 산출물",
      "hero.stat3": "검증된 노드",
      "why.title": "왜 만들었나",
      "why.free.title": "Figma MCP 의 무료 대안",
      "why.free.body": "Figma 자체 MCP 서버는 유료 플랜이 필요합니다. 이 플러그인은 같은 컨텍스트를 모든 LLM 코딩 도구에 — 공짜로 제공합니다.",
      "why.zero.title": "네트워크 0, 텔레메트리 0",
      "why.zero.body": "<code>networkAccess.allowedDomains: [\"none\"]</code>. CI 가 강제합니다. 애널리틱스·비콘·원격 호출 전부 없습니다.",
      "why.shrink.title": "스마트 자동 축소",
      "why.shrink.body": "Slim 이 500 KB 를 넘으면 <code>textSummary</code> → <code>sectionTree</code> → 토큰 제외 순서로 자동 축소하고, 각 단계가 <code>meta.degraded</code> 에 기록됩니다.",
      "why.neutral.title": "도구 중립",
      "why.neutral.body": "Claude Code, Cursor, GitHub Copilot, Aider, ChatGPT — JSON 은 그냥 JSON 입니다. 벤더 락인 없음.",
      "install.title": "설치",
      "install.sub": "빌드 불필요. npm 불필요. Figma 유료 플랜 불필요.",
      "install.s1.title": "릴리즈 zip 다운로드",
      "install.s1.body": "GitHub Releases 에서 최신 <code>dcl-figma-vX.Y.Z.zip</code> 을 받으세요.",
      "install.s1.cta": "Releases 열기 →",
      "install.s2.title": "원하는 폴더에 압축 해제",
      "install.s2.body": "예: <code>~/figma-plugins/dcl-figma/</code>. 폴더 안에 <code>manifest.json</code> 과 <code>dist/</code> 가 들어있습니다.",
      "install.s3.title": "Figma Desktop 에서 import",
      "install.s3.body": "메뉴 → <strong>Plugins → Development → Import plugin from manifest…</strong> → 방금 푼 폴더의 <code>manifest.json</code> 선택.",
      "install.s4.title": "실행",
      "install.s4.body": "<strong>Plugins → Development → Design Context for LLMs</strong>. 끝.",
      "usage.title": "사용 흐름",
      "usage.sub": "Figma → 플러그인 → LLM. 30 초.",
      "usage.s1.title": "Dump 클릭",
      "usage.s1.body": "플러그인 열고 스코프 고르고 버튼 한 번.",
      "usage.s2.title": "JSON 받기",
      "usage.s2.body": "Slim 다운로드 / Full 다운로드 / 클립보드 복사 중 선택.",
      "usage.s3.title": "LLM 에 붙여넣기",
      "usage.s3.body": "Claude Code, Cursor, ChatGPT 에 파일 드래그하거나 클립보드 내용 붙여넣기.",
      "snip.title": "통합 스니펫",
      "snip.sub": "JSON 을 첨부한 뒤 LLM 세션에 이 문구를 붙여넣으세요.",
      "snip.copy": "복사",
      "priv.title": "네트워크 0. 텔레메트리 0.",
      "priv.sub": "단 하나의 약속: 디자인 데이터는 절대 기기 밖으로 나가지 않습니다.",
      "priv.1": "Manifest 에 <code>networkAccess.allowedDomains: [\"none\"]</code> 선언. Figma 가 런타임에서 모든 외부 요청을 차단.",
      "priv.2": "애널리틱스 SDK 없음, 에러 리포터 없음, 익명 메트릭 없음.",
      "priv.3": "디자인 데이터 흐름: Figma 샌드박스 → 플러그인 UI iframe → <code>&lt;a download&gt;</code> / 클립보드. 그 외 경로 없음.",
      "priv.4": "CI 가 매 PR 마다 zero-network 불변을 검증합니다 — 조용히 깨질 수 없습니다.",
      "priv.5": "MIT 라이선스. <a href=\"https://github.com/mercuryPark/dcl-figma\" target=\"_blank\" rel=\"noopener\">GitHub</a> 에서 줄 단위로 감사 가능.",
      "cta.title": "Figma 컨텍스트를 LLM 에 전달할 준비 됐나요?",
      "cta.sub": "설치 30 초. 빌드된 zip, 추가 빌드 없음.",
      "cta.download": "v0.1.0 .zip 다운로드",
      "cta.github": "GitHub →",
      "footer.tagline": "Figma 디자인 컨텍스트, 당신의 LLM 에게.",
      "footer.releases": "Releases",
      "footer.built": "애널리틱스 0 으로 빌드됨."
    }
  };

  /* ---------------- language toggle ------------------------------------- */

  function applyLanguage(lang) {
    const dict = DICT[lang] || DICT.en;
    document.documentElement.lang = lang;
    document.body.setAttribute("data-lang", lang);
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const value = dict[key];
      if (value !== undefined) el.innerHTML = value;
    });
    document.querySelectorAll("[data-lang-switch]").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-lang-switch") === lang ? "true" : "false");
    });
    try {
      localStorage.setItem("dcl-lang", lang);
    } catch (_) { /* ignore */ }
  }

  function detectLanguage() {
    try {
      const stored = localStorage.getItem("dcl-lang");
      if (stored && DICT[stored]) return stored;
    } catch (_) { /* ignore */ }
    const nav = (navigator.language || "en").toLowerCase();
    if (nav.startsWith("ko")) return "ko";
    return "en";
  }

  document.querySelectorAll("[data-lang-switch]").forEach((btn) => {
    btn.addEventListener("click", () => {
      applyLanguage(btn.getAttribute("data-lang-switch"));
    });
  });

  applyLanguage(detectLanguage());

  /* ---------------- tabs (snippets) ------------------------------------- */

  const tabButtons = document.querySelectorAll(".tabs button");
  const panels = document.querySelectorAll(".panel");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab");
      tabButtons.forEach((b) => b.setAttribute("aria-selected", b === btn ? "true" : "false"));
      panels.forEach((p) => {
        p.classList.toggle("active", p.getAttribute("data-panel") === target);
      });
    });
  });

  /* ---------------- copy-to-clipboard ----------------------------------- */

  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-copy-target");
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      const text = el.textContent || "";
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {
        // Fallback for older browsers.
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (_) { /* ignore */ }
        document.body.removeChild(ta);
      }
      const label = btn.querySelector("[data-i18n]");
      const original = label ? label.textContent : btn.textContent;
      if (label) label.textContent = document.body.getAttribute("data-lang") === "ko" ? "복사됨" : "Copied";
      else btn.textContent = "Copied";
      btn.classList.add("copied");
      setTimeout(() => {
        if (label) {
          const key = label.getAttribute("data-i18n");
          const dict = DICT[document.body.getAttribute("data-lang")] || DICT.en;
          label.textContent = dict[key] || original || "Copy";
        } else {
          btn.textContent = original || "Copy";
        }
        btn.classList.remove("copied");
      }, 1500);
    });
  });
})();
