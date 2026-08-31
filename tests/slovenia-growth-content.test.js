import test from "node:test";
import assert from "node:assert/strict";
import { sloveniaGrowthContent, enhanceSloveniaSearchContent } from "../src/expansion-search-content-si.js";
import { contextualGrowthLinks } from "../src/contextual-growth-links.js";
import { renderSloveniaPrivateContentPage } from "../src/private-content-si.js";
import { publicizeExpansionHtml } from "../src/expansion-publication.js";

const ROUTES = Object.freeze([
  "/si/vodici/kapaciteta-baterije-avtodom/",
  "/si/vodici/koliko-soncnih-panelov-avtodom/",
  "/si/vodici/lifepo4-ali-agm-avtodom/",
  "/si/vodici/mppt-regulator-avtodom/",
  "/si/vodici/inverter-avtodom-moc/",
  "/si/vodici/dc-dc-polnilnik-avtodom/",
]);

for (const route of ROUTES) {
  test(`${route} gets Slovenian high-intent content, schema and contextual links`, () => {
    const item = sloveniaGrowthContent(route);
    assert.ok(item);
    assert.equal(item.faq.length, 3);
    assert.ok(item.description.length > 80);

    const privateHtml = renderSloveniaPrivateContentPage(route);
    assert.ok(privateHtml);
    const html = publicizeExpansionHtml(privateHtml, "si", route);

    assert.equal((html.match(/data-si-search-growth=/g) || []).length, 1);
    assert.equal((html.match(/data-si-search-growth-schema/g) || []).length, 1);
    assert.match(html, /"@type":"Article"/);
    assert.match(html, /"@type":"FAQPage"/);
    assert.match(html, /"inLanguage":"sl-SI"/);
    assert.match(html, /data-contextual-growth-links/);
    assert.match(html, /Nadaljuj z dimenzioniranjem sistema/);
    assert.ok(html.indexOf("data-si-search-growth=") < html.indexOf('<aside class="cta">'));
    assert.ok(html.indexOf("data-contextual-growth-links") < html.indexOf('<aside class="cta">'));

    const links = contextualGrowthLinks("si", route);
    assert.equal(links.length, 3);
    for (const [, href] of links) {
      assert.ok(href.startsWith("/si/vodici/"));
      assert.notEqual(href, route);
      assert.ok(html.includes(`href="${href}"`));
    }
  });
}

test("Slovenia search content injection is idempotent", () => {
  const route = ROUTES[0];
  const base = renderSloveniaPrivateContentPage(route);
  const once = enhanceSloveniaSearchContent(base, "si", route);
  const twice = enhanceSloveniaSearchContent(once, "si", route);
  assert.equal(twice, once);
});

test("Slovenia growth layer leaves other markets and untargeted routes unchanged", () => {
  const html = '<html><head></head><body><aside class="cta"></aside></body></html>';
  assert.equal(enhanceSloveniaSearchContent(html, "pt", "/pt/guias/capacidade-bateria-autocaravana/"), html);
  assert.equal(enhanceSloveniaSearchContent(html, "si", "/si/vodici/poraba-kompresorski-hladilnik-avtodom/"), html);
});


test("Slovenia DC-DC guide keeps smart-alternator and lithium safety evidence explicit", () => {
  const route = "/si/vodici/dc-dc-polnilnik-avtodom/";
  const html = publicizeExpansionHtml(renderSloveniaPrivateContentPage(route), "si", route);
  assert.match(html, /Orion_XS_12-12-70A_DC-DC_Battery_Charger/);
  assert.match(html, /Orion-Tr_Smart_DC-DC_Charger_-_Isolated/);
  assert.match(html, /12[,.]5[^<]{0,30}15 V/);
  assert.match(html, /900 Wh/);
  assert.match(html, /12→24 V/);
});
