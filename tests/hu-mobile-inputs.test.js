import test from "node:test";
import assert from "node:assert/strict";
import { renderHungarianPrivatePage } from "../src/page-hu.js";

test("Hungarian advanced numeric controls request a decimal mobile keyboard", () => {
  const html = renderHungarianPrivatePage();
  for (const name of [
    "inverterCableLength",
    "driveHoursPerDay",
    "dcDcInputCableLength",
    "shoreChargeHours",
    "roofLength",
    "roofWidth",
  ]) {
    assert.match(html, new RegExp(`name="${name}"[^>]*inputmode="decimal"`));
  }
});

test("Hungarian share feedback is announced to assistive technology", () => {
  const html = renderHungarianPrivatePage();
  assert.match(html, /id="result-share-status" role="status" aria-live="polite"/);
});
