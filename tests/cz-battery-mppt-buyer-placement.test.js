import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pages = [
  { path: "kalkulacky/kapacita-baterie/index.html", marker: "data-battery-buyers", warning: "Nejde o automatické potvrzení kompatibility celé elektroinstalace" },
  { path: "kalkulacky/mppt-regulator/index.html", marker: "data-mppt-buyers", warning: "není potvrzení úplné kompatibility" },
];

test("verified battery and MPPT recommendations appear before alternative journey buttons", async () => {
  for (const { path, marker, warning } of pages) {
    const html = await readFile(new URL("../" + path, import.meta.url), "utf8");
    const resultIndex = html.indexOf("data-calculator-result");
    const buyerIndex = html.indexOf(marker);
    const actionIndex = html.indexOf('class="calculator-actions"', resultIndex);
    assert.ok(resultIndex >= 0, path);
    assert.ok(buyerIndex > resultIndex && buyerIndex < actionIndex, path);
    assert.match(html, new RegExp(warning), path);
    assert.ok(html.includes('data-live-offers="0" hidden'), path);
  }
});
