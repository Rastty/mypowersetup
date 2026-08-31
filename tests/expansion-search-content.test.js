import test from "node:test";
import assert from "node:assert/strict";
import { renderPortugalPrivateContentPage } from "../src/private-content-pt.js";
import { publicizeExpansionHtml } from "../src/expansion-publication.js";
import { enhanceExpansionSearchContent, PT_SEARCH_GROWTH_ROUTES } from "../src/expansion-search-content.js";

const EXPECTED = Object.freeze([
  "/pt/guias/capacidade-bateria-autocaravana/",
  "/pt/guias/quantos-watts-paineis-solares-autocaravana/",
  "/pt/guias/lifepo4-vs-agm-autocaravana/",
  "/pt/guias/como-escolher-controlador-mppt/",
  "/pt/guias/inversor-autocaravana-potencia/",
  "/pt/guias/carregador-dc-dc-autocaravana/",
]);

test("Portugal growth layer targets the five highest-intent guide routes", () => {
  assert.deepEqual([...PT_SEARCH_GROWTH_ROUTES].sort(), [...EXPECTED].sort());
});

for (const route of EXPECTED) {
  test(`${route} publishes substantial search content without breaking calculator CTA`, () => {
    const privateHtml = renderPortugalPrivateContentPage(route);
    assert.ok(privateHtml);
    const publicHtml = publicizeExpansionHtml(privateHtml, "pt", route);

    assert.doesNotMatch(publicHtml, /noindex/i);
    assert.match(publicHtml, /data-search-growth-content=/);
    assert.match(publicHtml, /data-search-faq/);
    assert.match(publicHtml, /data-search-growth-schema/);
    assert.match(publicHtml, /href="\/pt\/#calculator-preview"/);
    assert.match(publicHtml, /"@type":"Article"/);
    assert.match(publicHtml, /"@type":"FAQPage"/);
    assert.ok(publicHtml.length > privateHtml.length + 2500, `expected meaningful content expansion for ${route}`);

    const second = enhanceExpansionSearchContent(publicHtml, "pt", route);
    assert.equal(second, publicHtml, `growth content must be idempotent for ${route}`);
  });
}

test("solar guide cites the official PVGIS validation path", () => {
  const route = "/pt/guias/quantos-watts-paineis-solares-autocaravana/";
  const publicHtml = publicizeExpansionHtml(renderPortugalPrivateContentPage(route), "pt", route);
  assert.match(publicHtml, /joint-research-centre\.ec\.europa\.eu\/pvgis-online-tool_en/);
  assert.match(publicHtml, /900 Wh\/dia/);
  assert.match(publicHtml, /350 Wp/);
  assert.match(publicHtml, /500 Wp/);
  assert.match(publicHtml, /950 Wp/);
});

test("MPPT guide keeps voltage/current distinctions explicit", () => {
  const route = "/pt/guias/como-escolher-controlador-mppt/";
  const publicHtml = publicizeExpansionHtml(renderPortugalPrivateContentPage(route), "pt", route);
  assert.match(publicHtml, /Voc/);
  assert.match(publicHtml, /Isc/);
  assert.match(publicHtml, /100\/30/);
  assert.match(publicHtml, /440 W/);
  assert.match(publicHtml, /880 W/);
});

test("non-target Portugal content is unchanged by the growth layer", () => {
  const route = "/pt/guias/cabos-fusiveis-12v-autocaravana/";
  const html = renderPortugalPrivateContentPage(route);
  assert.equal(enhanceExpansionSearchContent(html, "pt", route), html);
});

test("other markets are untouched", () => {
  const html = '<html><head></head><body><aside class="cta"></aside></body></html>';
  assert.equal(enhanceExpansionSearchContent(html, "ro", "/ro/ghiduri/example/"), html);
});


test("Portugal DC-DC guide keeps smart-alternator and lithium safety evidence explicit", () => {
  const route = "/pt/guias/carregador-dc-dc-autocaravana/";
  const html = publicizeExpansionHtml(renderPortugalPrivateContentPage(route), "pt", route);
  assert.match(html, /Orion_XS_12-12-70A_DC-DC_Battery_Charger/);
  assert.match(html, /Orion-Tr_Smart_DC-DC_Charger_-_Isolated/);
  assert.match(html, /12[,.]5[^<]{0,30}15 V/);
  assert.match(html, /900 Wh/);
  assert.match(html, /12→24 V/);
});
