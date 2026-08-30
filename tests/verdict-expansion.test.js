import test from "node:test";
import assert from "node:assert/strict";
import { buildPlainLanguageVerdict } from "../src/verdict.js";

const result = Object.freeze({
  systemVoltage: 12,
  batteryAh: 200,
  batteryLabel: "LiFePO4",
  solarWatts: 400,
  inverterWatts: 1000,
  controllerAmps: 40,
});

for (const [locale, markers] of Object.entries({
  ro: ["sistem de 12 V", "200 Ah", "400 Wp", "1000 W", "40 A"],
  pt: ["sistema de 12 V", "200 Ah", "400 Wp", "1000 W", "40 A"],
  si: ["12 V sistem", "200 Ah", "400 Wp", "1000 W", "40 A"],
})) {
  test(`${locale} expansion calculator verdict summarizes the complete sizing result`, () => {
    const verdict = buildPlainLanguageVerdict(result, locale);
    for (const marker of markers) assert.match(verdict, new RegExp(marker));
    assert.doesNotMatch(verdict, /undefined|null/);
  });
}

test("expansion calculator source renders the localized verdict before product recommendations", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8"));
  assert.match(source, /buildPlainLanguageVerdict\(value, locale\)/);
  assert.match(source, /class="result-summary"/);
  assert.match(source, /result-summary[\s\S]*data-product-recommendations/);
});
