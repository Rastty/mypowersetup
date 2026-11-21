import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const routes = [
  ["index.html", "src/app.js", "Zobrazit doporučenou sestavu"],
  ["sk/index.html", "src/app-sk.js", "Zobraziť odporúčanú zostavu"],
  ["pl/index.html", "src/app-pl.js", "Pokaż polecany zestaw"],
];

test("caravan purchase continuation is visible before the long calculation grid in all 3 markets", async () => {
  for (const [page] of routes) {
    const html = await readFile(new URL("../" + page, import.meta.url), "utf8");
    const featured = html.indexOf('id="featured-recommendations"');
    const next = html.indexOf('id="result-next"');
    const checklist = html.indexOf('id="caravan-buyer-checklist"');
    const grid = html.indexOf('id="result-grid"');
    assert.ok(featured > 0 && featured < next && next < checklist && checklist < grid, page);
    assert.equal(html.match(/id="result-next"/g)?.length, 1, page);
  }
});

test("CZ SK PL purchase action jumps directly to current confirmed-stock shopping plan", async () => {
  for (const [page, app, label] of routes) {
    const script = await readFile(new URL("../" + app, import.meta.url), "utf8");
    assert.ok(script.includes(label), app);
    assert.ok(script.includes("const readyToBuy = buyerPlan?.readyCount || 0;"), app);
    assert.ok(script.includes('resultProductsLink.href = "#caravan-buyer-checklist";'), app);
    assert.ok(script.includes('"partial_buyable_plan"'), app);
    assert.ok(script.includes('"requirements_only"'), app);
    assert.ok(script.includes('resultProductsLink.hidden = total === 0;'), app);
    assert.ok(script.includes('resultProductsLink.hidden = total === 0;'), app);
  }
});
