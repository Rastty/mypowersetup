import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const CASES = Object.freeze([
  Object.freeze({ market: "pt", path: "../pt/guias/carregador-dc-dc-autocaravana/index.html", growth: "data-search-growth-content=", schema: "data-search-growth-schema", calculator: "/pt/#calculator-preview" }),
  Object.freeze({ market: "ro", path: "../ro/ghiduri/incarcator-dc-dc-autorulota/index.html", growth: "data-ro-search-growth=", schema: "data-ro-search-growth-schema", calculator: "/ro/#calculator-preview" }),
  Object.freeze({ market: "si", path: "../si/vodici/dc-dc-polnilnik-avtodom/index.html", growth: "data-si-search-growth=", schema: "data-si-search-growth-schema", calculator: "/si/#calculator-preview" }),
]);

for (const item of CASES) {
  test(`${item.market.toUpperCase()} committed DC-DC guide is indexable, evidence-backed and conversion-ready`, async () => {
    const html = await readFile(new URL(item.path, import.meta.url), "utf8");
    assert.equal((html.match(new RegExp(item.growth, "g")) || []).length, 1);
    assert.equal((html.match(new RegExp(item.schema, "g")) || []).length, 1);
    assert.doesNotMatch(html, /<meta name="robots" content="noindex/);
    assert.match(html, /"@type":"Article"/);
    assert.match(html, /"@type":"FAQPage"/);
    assert.match(html, /data-contextual-growth-links/);
    assert.ok(html.includes(`href="${item.calculator}"`));
    assert.match(html, /Orion_XS_12-12-70A_DC-DC_Battery_Charger/);
    assert.match(html, /Orion-Tr_Smart_DC-DC_Charger_-_Isolated/);
    assert.match(html, /900 Wh/);
    assert.match(html, /12→24 V/);

    // Guard editorial depth by rendered structure instead of language-dependent byte length.
    assert.ok((html.match(/<h2(?:\s|>)/g) || []).length >= 10, `${item.market} DC-DC guide needs at least 10 decision sections`);
    assert.ok((html.match(/<p(?:\s|>)/g) || []).length >= 14, `${item.market} DC-DC guide needs explanatory copy`);
    assert.ok((html.match(/<li(?:\s|>)/g) || []).length >= 15, `${item.market} DC-DC guide needs actionable checklist coverage`);
    assert.ok(html.length > 6500, `${item.market} DC-DC guide lost substantial published content`);
  });
}
