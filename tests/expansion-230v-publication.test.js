import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { enhanceExpansionSearchContent } from "../src/expansion-search-content.js";
import { enhanceRomaniaSearchContent } from "../src/expansion-search-content-ro.js";
import { enhanceSloveniaSearchContent } from "../src/expansion-search-content-si.js";

const CASES = Object.freeze([
  Object.freeze({
    market: "pt",
    route: "/pt/guias/carregador-230v-bateria-autocaravana/",
    page: "../pt/guias/carregador-230v-bateria-autocaravana/index.html",
    growth: "data-search-growth-content=",
    schema: "data-search-growth-schema",
    calculator: "/pt/#calculator-preview",
    cables: "/pt/guias/cabos-fusiveis-12v-autocaravana/",
    enhance: enhanceExpansionSearchContent,
  }),
  Object.freeze({
    market: "ro",
    route: "/ro/ghiduri/incarcator-230v-baterie-autorulota/",
    page: "../ro/ghiduri/incarcator-230v-baterie-autorulota/index.html",
    growth: "data-ro-search-growth=",
    schema: "data-ro-search-growth-schema",
    calculator: "/ro/#calculator-preview",
    cables: "/ro/ghiduri/cabluri-sigurante-12v-autorulota/",
    enhance: enhanceRomaniaSearchContent,
  }),
  Object.freeze({
    market: "si",
    route: "/si/vodici/230v-polnilnik-baterije-avtodom/",
    page: "../si/vodici/230v-polnilnik-baterije-avtodom/index.html",
    growth: "data-si-search-growth=",
    schema: "data-si-search-growth-schema",
    calculator: "/si/#calculator-preview",
    cables: "/si/vodici/kabli-varovalke-12v-avtodom/",
    enhance: enhanceSloveniaSearchContent,
  }),
]);

const fixture = "<!doctype html><html><head></head><body><aside class=\"cta\">CTA</aside></body></html>";

function assertDecisionContent(html, item) {
  assert.equal((html.match(new RegExp(item.growth, "g")) || []).length, 1);
  assert.equal((html.match(new RegExp(item.schema, "g")) || []).length, 1);
  assert.match(html, /\"@type\":\"Article\"/);
  assert.match(html, /\"@type\":\"FAQPage\"/);
  assert.match(html, /Blue_Smart_IP65_Charger_230V_manual/);
  assert.match(html, /VE-Direct-drawing-with-IP43-Smart-Charger/);
  assert.match(html, /120 Ah/);
  assert.match(html, /20 A/);
  assert.match(html, /30 A/);
  assert.ok(html.includes(`href="${item.calculator}"`));
  assert.ok(html.includes(`href="${item.cables}"`));
}

for (const item of CASES) {
  test(`${item.market.toUpperCase()} 230 V source enhancer publishes evidence-backed decision content`, () => {
    const html = item.enhance(fixture, item.market, item.route);
    assert.notEqual(html, fixture);
    assertDecisionContent(html, item);
  });

  test(`${item.market.toUpperCase()} committed 230 V guide is indexable, substantial and conversion-ready`, async () => {
    const html = await readFile(new URL(item.page, import.meta.url), "utf8");
    assertDecisionContent(html, item);
    assert.doesNotMatch(html, /<meta name="robots" content="noindex/);
    assert.match(html, /data-contextual-growth-links/);
    assert.ok((html.match(/<h2(?:\s|>)/g) || []).length >= 10, `${item.market} guide needs at least 10 decision sections`);
    assert.ok((html.match(/<p(?:\s|>)/g) || []).length >= 13, `${item.market} guide needs explanatory copy`);
    assert.ok((html.match(/<li(?:\s|>)/g) || []).length >= 12, `${item.market} guide needs actionable checklist coverage`);
    assert.ok(html.length > 6500, `${item.market} guide lost substantial published content`);
  });
}
