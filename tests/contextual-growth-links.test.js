import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addContextualGrowthLinks, contextualGrowthLinks } from "../src/contextual-growth-links.js";
import { renderPortugalPrivateContentPage } from "../src/private-content-pt.js";
import { renderRomaniaPrivateContentPage } from "../src/private-content-ro.js";
import { renderSloveniaPrivateContentPage } from "../src/private-content-si.js";
import { publicizeExpansionHtml } from "../src/expansion-publication.js";
import { routeToPublicFile } from "../src/public-hreflang-map.js";

const CASES = Object.freeze([
  Object.freeze({
    market: "pt",
    prefix: "/pt/guias/",
    render: renderPortugalPrivateContentPage,
    routes: Object.freeze([
      "/pt/guias/capacidade-bateria-autocaravana/",
      "/pt/guias/lifepo4-vs-agm-autocaravana/",
      "/pt/guias/quantos-watts-paineis-solares-autocaravana/",
      "/pt/guias/como-escolher-controlador-mppt/",
      "/pt/guias/inversor-autocaravana-potencia/",
      "/pt/guias/carregador-dc-dc-autocaravana/",
      "/pt/guias/carregador-230v-bateria-autocaravana/",
      "/pt/guias/cabos-fusiveis-12v-autocaravana/",
      "/pt/guias/consumo-frigorifico-compressor-autocaravana/",
      "/pt/guias/sistema-eletrico-completo-autocaravana/",
    ]),
  }),
  Object.freeze({
    market: "ro",
    prefix: "/ro/ghiduri/",
    render: renderRomaniaPrivateContentPage,
    routes: Object.freeze([
      "/ro/ghiduri/capacitate-baterie-autorulota/",
      "/ro/ghiduri/lifepo4-sau-agm-autorulota/",
      "/ro/ghiduri/cate-panouri-solare-autorulota/",
      "/ro/ghiduri/regulator-mppt-autorulota/",
      "/ro/ghiduri/invertor-autorulota-putere/",
      "/ro/ghiduri/incarcator-dc-dc-autorulota/",
      "/ro/ghiduri/incarcator-230v-baterie-autorulota/",
      "/ro/ghiduri/cabluri-sigurante-12v-autorulota/",
      "/ro/ghiduri/consum-frigider-compresor-autorulota/",
      "/ro/ghiduri/sistem-electric-complet-autorulota/",
    ]),
  }),
  Object.freeze({
    market: "si",
    prefix: "/si/vodici/",
    render: renderSloveniaPrivateContentPage,
    routes: Object.freeze([
      "/si/vodici/kapaciteta-baterije-avtodom/",
      "/si/vodici/lifepo4-ali-agm-avtodom/",
      "/si/vodici/koliko-soncnih-panelov-avtodom/",
      "/si/vodici/mppt-regulator-avtodom/",
      "/si/vodici/inverter-avtodom-moc/",
      "/si/vodici/dc-dc-polnilnik-avtodom/",
      "/si/vodici/230v-polnilnik-baterije-avtodom/",
      "/si/vodici/kabli-varovalke-12v-avtodom/",
      "/si/vodici/poraba-kompresorski-hladilnik-avtodom/",
      "/si/vodici/elektricni-sistem-avtodom/",
    ]),
  }),
]);

for (const entry of CASES) {
  test(`${entry.market} gives every guide exactly three contextual next steps`, () => {
    assert.equal(entry.routes.length, 10);
    for (const route of entry.routes) {
      const links = contextualGrowthLinks(entry.market, route);
      assert.equal(links.length, 3, route);
      assert.equal(new Set(links.map(([, href]) => href)).size, 3, route);
      assert.ok(links.every(([, href]) => href.startsWith(entry.prefix) && href !== route), route);

      const generated = publicizeExpansionHtml(entry.render(route), entry.market, route);
      assert.equal((generated.match(/data-contextual-growth-links/g) || []).length, 1, route);
      for (const [, href] of links) assert.ok(generated.includes(`href="${href}"`), `${route} -> ${href}`);

      const committed = readFileSync(new URL(`../${routeToPublicFile(route)}`, import.meta.url), "utf8");
      assert.equal((committed.match(/data-contextual-growth-links/g) || []).length, 1, `${route} committed block`);
      for (const [, href] of links) assert.ok(committed.includes(`href="${href}"`), `${route} committed -> ${href}`);
    }
  });
}

test("contextual link injection is idempotent", () => {
  const route = CASES[0].routes[0];
  const base = CASES[0].render(route);
  const once = addContextualGrowthLinks(base, "pt", route);
  const twice = addContextualGrowthLinks(once, "pt", route);
  assert.equal(twice, once);
});

test("untargeted routes and markets remain unchanged", () => {
  const html = '<html><body><aside class="cta"></aside></body></html>';
  assert.equal(addContextualGrowthLinks(html, "pt", "/pt/guias/example/"), html);
  assert.equal(addContextualGrowthLinks(html, "de", "/de/ratgeber/example/"), html);
});
