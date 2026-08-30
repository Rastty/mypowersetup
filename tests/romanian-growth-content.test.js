import test from "node:test";
import assert from "node:assert/strict";
import { romanianGrowthContent, enhanceRomaniaSearchContent } from "../src/expansion-search-content-ro.js";
import { contextualGrowthLinks } from "../src/contextual-growth-links.js";
import { renderRomaniaPrivateContentPage } from "../src/private-content-ro.js";
import { publicizeExpansionHtml } from "../src/expansion-publication.js";

const ROUTES = Object.freeze([
  "/ro/ghiduri/capacitate-baterie-autorulota/",
  "/ro/ghiduri/cate-panouri-solare-autorulota/",
  "/ro/ghiduri/lifepo4-sau-agm-autorulota/",
  "/ro/ghiduri/regulator-mppt-autorulota/",
  "/ro/ghiduri/invertor-autorulota-putere/",
]);

for (const route of ROUTES) {
  test(`${route} gets Romanian high-intent content, schema and contextual links`, () => {
    const item = romanianGrowthContent(route);
    assert.ok(item);
    assert.equal(item.faq.length, 3);
    assert.ok(item.description.length > 80);

    const privateHtml = renderRomaniaPrivateContentPage(route);
    assert.ok(privateHtml);
    const html = publicizeExpansionHtml(privateHtml, "ro", route);

    assert.equal((html.match(/data-ro-search-growth=/g) || []).length, 1);
    assert.equal((html.match(/data-ro-search-growth-schema/g) || []).length, 1);
    assert.match(html, /"@type":"Article"/);
    assert.match(html, /"@type":"FAQPage"/);
    assert.match(html, /"inLanguage":"ro-RO"/);
    assert.match(html, /data-contextual-growth-links/);
    assert.match(html, /Continuă dimensionarea sistemului/);
    assert.ok(html.indexOf("data-ro-search-growth=") < html.indexOf('<aside class="cta">'));
    assert.ok(html.indexOf("data-contextual-growth-links") < html.indexOf('<aside class="cta">'));

    const links = contextualGrowthLinks("ro", route);
    assert.equal(links.length, 3);
    for (const [, href] of links) {
      assert.ok(href.startsWith("/ro/ghiduri/"));
      assert.notEqual(href, route);
      assert.ok(html.includes(`href="${href}"`));
    }
  });
}

test("Romania search content injection is idempotent", () => {
  const route = ROUTES[0];
  const base = renderRomaniaPrivateContentPage(route);
  const once = enhanceRomaniaSearchContent(base, "ro", route);
  const twice = enhanceRomaniaSearchContent(once, "ro", route);
  assert.equal(twice, once);
});

test("Romania growth layer leaves Portugal and untargeted Romania routes unchanged", () => {
  const html = '<html><head></head><body><aside class="cta"></aside></body></html>';
  assert.equal(enhanceRomaniaSearchContent(html, "pt", "/pt/guias/capacidade-bateria-autocaravana/"), html);
  assert.equal(enhanceRomaniaSearchContent(html, "ro", "/ro/ghiduri/consum-frigider-compresor-autorulota/"), html);
});
