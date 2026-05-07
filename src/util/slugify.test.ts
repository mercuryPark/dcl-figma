import test from "node:test";
import assert from "node:assert/strict";
import { slugify } from "./slugify";

test("slugify lowercases ASCII and collapses separators", () => {
  assert.equal(slugify("Home / Product Detail  V2"), "home-product-detail-v2");
});

test("slugify strips diacritics from latin text", () => {
  assert.equal(slugify("Crème Brûlée"), "creme-brulee");
});

test("slugify romanizes Hangul syllables before normalization", () => {
  assert.equal(slugify("로그인 화면"), "rogeuin-hwamyeon");
});

test("slugify combines ASCII and Hangul runs deterministically", () => {
  assert.equal(slugify("Checkout 결제 01"), "checkout-gyeolje-01");
});

test("slugify falls back for non-ASCII text with no romanization", () => {
  const first = slugify("你好");
  const second = slugify("你好");
  assert.match(first, /^x-[a-z2-7]+$/);
  assert.equal(first, second);
});
