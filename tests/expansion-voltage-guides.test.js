import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  addExpansionVoltageGuideDiscovery,
  expansionVoltageGuide,
  expansionVoltageGuideManifest,
  renderExpansionVoltageGuidePage,
} from "../src/expansion-voltage-guides.js";
import { expansionPublicationManifest, publicizeExpansionHtml } from "../src/expansion-publication.js";

const CASES = Object.freeze([
  ["pt", "/pt/guias/sistema-12v-ou-24v-autocaravana/", "/pt/guias/", "/pt/guias/inversor-autocaravana-potencia/"],
  ["ro", "/ro/ghiduri/sistem-12v-sau-24v-autorulota/", "/ro/ghiduri/", "/ro/ghiduri/invertor-autorulota-putere/"],
  ["si", "/si/vodici/12v-ali-24v-sistem-avtodom/", "/si/vodici/", "/si/vodici/inverter-avtodom-moc/"],
]);

for (const [market, route, hubRoute, relatedRoute] of CASES) {
  test(`${market} voltage guide is part of the public expansion manifest`, () => {
    const guide = expansionVoltageGuide(market);
    assert.equal(guide.route, route);
    assert.deepEqual(expansionVoltageGuideManifest(market).map((item) => item.route), [route]);
    assert.ok(expansionPublicationManifest(market).some((item) => item.route === route && item.priority === "0.8"));
  });

  test(`${market} voltage guide has technical depth, FAQ schema and calculator path`, () => {
    const html = renderExpansionVoltageGuidePage(market, route);
    assert.match(html, /noindex,nofollow,noarchive/);
    assert.match(html, /"@type":"Article"/);
    assert.match(html, /"@type":"FAQPage"/);
    assert.match(html, /I ≈ P ÷ V/);
    assert.match(html, /1[ .]200 W/);
    assert.match(html, /2[ .]000 W/);
    assert.match(html, /victronenergy\.com\/media\/pg\/The_Wiring_Unlimited_book\/en\/dc-wiring\.html/);
    assert.ok(html.includes(`href="/${market}/#calculator-preview"`));
  });

  test(`${market} voltage guide becomes canonical and indexable through the existing publisher`, () => {
    const privateHtml = renderExpansionVoltageGuidePage(market, route);
    const publicHtml = publicizeExpansionHtml(privateHtml, market, route);
    assert.doesNotMatch(publicHtml, /noindex/i);
    assert.ok(publicHtml.includes(`rel="canonical" href="https://mypowersetup.com${route}"`));
    assert.match(publicHtml, /"@type":"Article"/);
    assert.match(publicHtml, /"@type":"FAQPage"/);
    for (const locale of ["pt-PT", "ro-RO", "sl-SI"]) assert.match(publicHtml, new RegExp(`hreflang="${locale}"`));
  });

  test(`${market} guide hub and high-intent pages discover the voltage guide`, () => {
    const hub = addExpansionVoltageGuideDiscovery("<main><ul><li>existing</li></ul></main>", market, hubRoute);
    assert.ok(hub.includes(`href="${route}"`));

    const related = addExpansionVoltageGuideDiscovery('<main><aside class="cta">calculator</aside></main>', market, relatedRoute);
    assert.match(related, /data-voltage-guide-discovery/);
    assert.ok(related.includes(`href="${route}"`));
  });
}

test("published voltage guides are present in sitemap, hubs and LLM discovery", async () => {
  const [sitemap, llms, ...hubs] = await Promise.all([
    readFile("sitemap.xml", "utf8"),
    readFile("llms.txt", "utf8"),
    ...CASES.map(([, , hubRoute]) => readFile(`${hubRoute.slice(1)}index.html`, "utf8")),
  ]);
  for (const [[, route], hub] of CASES.map((item, index) => [item, hubs[index]])) {
    assert.ok(sitemap.includes(`<loc>https://mypowersetup.com${route}</loc>`));
    assert.ok(llms.includes(`https://mypowersetup.com${route}`));
    assert.ok(hub.includes(`href="${route}"`));
  }
});

test("voltage guide extension fails closed for unsupported markets and unrelated routes", () => {
  assert.equal(expansionVoltageGuide("xx"), null);
  assert.deepEqual(expansionVoltageGuideManifest("xx"), []);
  assert.equal(renderExpansionVoltageGuidePage("xx", "/xx/"), null);
  assert.equal(addExpansionVoltageGuideDiscovery("<main>same</main>", "pt", "/pt/metodologia/"), "<main>same</main>");
});
