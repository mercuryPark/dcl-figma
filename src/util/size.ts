// UTF-8 byte length of a string.
// Figma's sandbox does not expose TextEncoder, so we compute the length by walking the
// UTF-16 code units directly. Matches `new TextEncoder().encode(s).length` semantics.

export function byteLength(s: string): number {
  let len = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) {
      len += 1;
    } else if (c < 0x800) {
      len += 2;
    } else if (c >= 0xd800 && c <= 0xdbff) {
      // High surrogate — pairs with next low surrogate for a single 4-byte codepoint.
      len += 4;
      i++;
    } else {
      len += 3;
    }
  }
  return len;
}
