// Tiny i18n runtime. Bundled locales are injected at build time via `__LOCALES__`.
// Detection order:
//   1. figma.clientStorage (handled by caller; `setLocale` persists when asked).
//   2. navigator.language prefix (e.g., "ko-KR" → "ko").
//   3. "en" fallback.

declare const __LOCALES__: Record<string, unknown>;

type Dict = Record<string, unknown>;

// Build-time injected bundle. `__LOCALES__` is replaced by esbuild's `define` option.
// During typechecking we treat it as an opaque record.
const BUNDLED: Record<string, Dict> = (typeof __LOCALES__ !== "undefined"
  ? (__LOCALES__ as Record<string, Dict>)
  : {});

const FALLBACK_LOCALE = "en";
let currentLocale: string = FALLBACK_LOCALE;

export function availableLocales(): string[] {
  return Object.keys(BUNDLED);
}

export function detectLocale(navigatorLang?: string, stored?: string | null): string {
  if (stored && BUNDLED[stored]) return stored;
  if (navigatorLang) {
    const prefix = navigatorLang.toLowerCase().split(/[-_]/)[0];
    if (prefix && BUNDLED[prefix]) return prefix;
  }
  return FALLBACK_LOCALE;
}

export function setLocale(code: string): void {
  currentLocale = BUNDLED[code] ? code : FALLBACK_LOCALE;
}

export function getLocale(): string {
  return currentLocale;
}

function lookup(dict: Dict, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Dict)) {
      cur = (cur as Dict)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_m, key) => {
    const v = vars[key];
    return v === undefined ? `{${key}}` : String(v);
  });
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const primary = BUNDLED[currentLocale];
  let value = primary ? lookup(primary, key) : undefined;
  if (typeof value !== "string") {
    const fallback = BUNDLED[FALLBACK_LOCALE];
    if (fallback) value = lookup(fallback, key);
  }
  if (typeof value !== "string") {
    // Dev fallback: surface the key so missing translations are visible.
    return key;
  }
  return interpolate(value, vars);
}
