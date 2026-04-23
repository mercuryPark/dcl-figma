// Deterministic slug helper for file / page names.
// Rule:
//   1. Split the input into Hangul-syllable runs and non-Hangul runs.
//      Hangul runs are romanized first; non-Hangul runs are NFKD-normalized (to drop diacritics)
//      and then lowercased ASCII-filtered. This ordering matters: NFKD decomposes Hangul syllables
//      into Jamo, which would bypass the romanizer.
//   2. Strip zero-width characters.
//   3. Any remaining non [a-z0-9] → `-`. Collapse repeated `-`. Trim leading/trailing `-`.
//   4. If the result is empty, fall back to "x-" + base32(utf-8 bytes of the raw input).

const HANGUL_CHOSEONG = ["g","kk","n","d","tt","r","m","b","pp","s","ss","","j","jj","ch","k","t","p","h"];
const HANGUL_JUNGSEONG = ["a","ae","ya","yae","eo","e","yeo","ye","o","wa","wae","oe","yo","u","wo","we","wi","yu","eu","yi","i"];
const HANGUL_JONGSEONG = ["","g","kk","gs","n","nj","nh","d","l","lg","lm","lb","ls","lt","lp","lh","m","b","bs","s","ss","ng","j","ch","k","t","p","h"];

function romanizeHangulSyllable(ch: string): string {
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "";
  const s = code - 0xac00;
  const cho = Math.floor(s / 588);
  const jung = Math.floor((s % 588) / 28);
  const jong = s % 28;
  return (HANGUL_CHOSEONG[cho] ?? "") + (HANGUL_JUNGSEONG[jung] ?? "") + (HANGUL_JONGSEONG[jong] ?? "");
}

function isHangulSyllable(code: number): boolean {
  return code >= 0xac00 && code <= 0xd7a3;
}

function base32(bytes: Uint8Array): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i]!;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}

function processNonHangul(input: string): string {
  let out = "";
  const normalized = input.normalize("NFKD");
  for (const ch of normalized) {
    const code = ch.charCodeAt(0);
    if (code >= 0x0300 && code <= 0x036f) continue; // combining marks
    if (code === 0x200b || code === 0x200c || code === 0x200d || code === 0xfeff) continue; // zero-width
    if (code < 0x80) {
      out += ch.toLowerCase();
    } else {
      out += "-";
    }
  }
  return out;
}

export function slugify(input: string): string {
  if (!input) return "";

  // Walk the string in runs of Hangul vs. non-Hangul so NFKD never touches a Hangul syllable.
  let out = "";
  let buffer = "";
  let bufferIsHangul = false;

  const flush = () => {
    if (!buffer) return;
    if (bufferIsHangul) {
      for (const c of buffer) out += romanizeHangulSyllable(c);
    } else {
      out += processNonHangul(buffer);
    }
    buffer = "";
  };

  for (const ch of input) {
    const isHangul = isHangulSyllable(ch.charCodeAt(0));
    if (isHangul !== bufferIsHangul) {
      flush();
      bufferIsHangul = isHangul;
    }
    buffer += ch;
  }
  flush();

  out = out
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!out) {
    return "x-" + base32(utf8Bytes(input));
  }
  return out;
}

// Hand-rolled UTF-8 encoder so the sandbox (no TextEncoder) can still compute a stable fallback.
function utf8Bytes(s: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff) {
      const next = s.charCodeAt(++i);
      c = 0x10000 + ((c - 0xd800) << 10) + (next - 0xdc00);
      bytes.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f)
      );
    } else {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return new Uint8Array(bytes);
}
