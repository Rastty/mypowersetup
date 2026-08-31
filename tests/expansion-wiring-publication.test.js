import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { enhanceExpansionSearchContent } from "../src/expansion-search-content.js";
import { enhanceRomaniaSearchContent } from "../src/expansion-search-content-ro.js";
import { enhanceSloveniaSearchContent } from "../src/expansion-search-content-si.js";

const CASES = Object.freeze([
  Object.freeze({
    market: "pt",
    route: "/pt/guias/cabos-fusiveis-12v-autocaravana/",
    page: "../pt/guias/cabos-fusiveis-12v-autocaravana/index.html",
    growth: "data-search-growth-content=",
    schema: "data-search-growth-schema",
    calculator: "/pt/#calculator-preview",
    inverter: "/pt/guias/inversor-autocaravana-potencia/",
    mppt: "/pt/guias/como-escolher-controlador-mppt/",
    dcdc: "/pt/guias/carregador-dc-dc-autocaravana/",
    enhance: enhanceExpansionSearchContent,
  }),
  Object.freeze({
    market: "ro",
    route: "/ro/ghiduri/cabluri-sigurante-12v-autorulota/",
    page: "../ro/ghiduri/cabluri-sigurante-12v-autorulota/index.html",
    growth: "data-ro-search-growth=",
    schema: "data-ro-search-growth-schema",
    calculator: "/ro/#calculator-preview",
    inverter: "/ro/ghiduri/invertor-autorulota-putere/",
    mppt: "/ro/ghiduri/regulator-mppt-autorulota/",
    dcdc: "/ro/ghiduri/incarcator-dc-dc-autorulota/",
    enhance: enhanceRomaniaSearchContent,
  }),
  Object.freeze({
    market: "si",
    route: "/si/vodici/kabli-varovalke-12v-avtodom/",
    page: "../si/vodici/kabli-varovalke-12v-avtodom/index.html",
    growth: "data-si-search-growth=",
    schema: "data-si-search-growth-schema",
    calculator: "/si/#calculator-preview",
    inverter: "/si/vodici/inverter-avtodom-moc/",
    mppt: "/si/vodici/mppt-regulator-avtodom/",
    dcdc: "/si/vodici/dc-dc-polnilnik-avtodom/",
    enhance: enhanceSloveniaSearchContent,
  }),
]);

const fixture = "<!doctype html><html><head></head><body><aside class=\"cta\">CTA</aside></body></html>";

function assertDecisionContent(html, item) {
  assert.equal((html.match(new RegExp(item.growth, "g")) || []).length, 1);
  assert.equal((html.match(new RegExp(item.schema, "g")) || []).length, 1);
  assert.match(html, /\"@type\":\"Article\"/);
  assert.match(html, /\"@type\":\"FAQPage\"/);
  assert.match(html, /Van-Motorhome-Manual-%26-Drawing/);
  assert.match(html, /114439-Smart_BatteryProtect-pdf-en/);
  assert.match(html, /29694-MPPT_solar_charger_manual-pdf-en/);
  assert.match(html, /92,6 A/);
  assert.match(html, /35 mm²/);
  assert.match(html, /2,3%/);
  assert.match(html, /25 mm²/);
  assert.match(html, /3,2%/);
  for (const href of [item.calculator, item.inverter, item.mppt, item.dcdc]) {
    assert.ok(html.includes(`href="${href}"`), `missing internal decision link ${href}`);
  }
}

for (const item of CASES) {
  test(`${item.market.toUpperCase()} wiring source publishes calculated, evidence-backed guidance`, () => {
    const html = item.enhance(fixture, item.market, item.route);
    assert.notEqual(html, fixture);
    assertDecisionContent(html, item);
  });

  test(`${item.market.toUpperCase()} committed wiring guide is indexable, substantial and connected`, async () => {
    const html = await readFile(new URL(item.page, import.meta.url), "utf8");
    assertDecisionContent(html, item);
    assert.doesNotMatch(html, /<meta name="robots" content="noindex/);
    assert.match(html, /data-contextual-growth-links/);
    assert.ok((html.match(/<h2(?:\s|>)/g) || []).length >= 14, `${item.market} guide needs decision sections`);
    assert.ok((html.match(/<p(?:\s|>)/g) || []).length >= 16, `${item.market} guide needs explanatory copy`);
    assert.ok((html.match(/<li(?:\s|>)/g) || []).length >= 16, `${item.market} guide needs actionable checklist coverage`);
    assert.ok(html.length > 8000, `${item.market} guide lost substantial published content`);
  });
}
