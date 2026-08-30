import test from "node:test";
import assert from "node:assert/strict";
import { addContextualGrowthLinks, contextualGrowthLinks } from "../src/contextual-growth-links.js";
import { renderPortugalPrivateContentPage } from "../src/private-content-pt.js";
import { publicizeExpansionHtml } from "../src/expansion-publication.js";

const ROUTES = [
  "/pt/guias/capacidade-bateria-autocaravana/",
  "/pt/guias/lifepo4-vs-agm-autocaravana/",
  "/pt/guias/quantos-watts-paineis-solares-autocaravana/",
  "/pt/guias/como-escolher-controlador-mppt/",
  "/pt/guias/inversor-autocaravana-potencia/",
];

for (const route of ROUTES) {
  test(`${route} gets three contextual next-step links before calculator CTA`, () => {
    const links = contextualGrowthLinks("pt", route);
    assert.equal(links.length, 3);
    assert.ok(links.every(([, href]) => href.startsWith("/pt/guias/") && href !== route));

    const html = publicizeExpansionHtml(renderPortugalPrivateContentPage(route), "pt", route);
    assert.equal((html.match(/data-contextual-growth-links/g) || []).length, 1);
    for (const [, href] of links) assert.ok(html.includes(`href="${href}"`));
    assert.ok(html.indexOf("data-contextual-growth-links") < html.indexOf('<aside class="cta">'));
  });
}

test("contextual link injection is idempotent", () => {
  const route = ROUTES[0];
  const base = renderPortugalPrivateContentPage(route);
  const once = addContextualGrowthLinks(base, "pt", route);
  const twice = addContextualGrowthLinks(once, "pt", route);
  assert.equal(twice, once);
});

test("untargeted routes and markets remain unchanged", () => {
  const html = '<html><body><aside class="cta"></aside></body></html>';
  assert.equal(addContextualGrowthLinks(html, "pt", "/pt/guias/consumo-frigorifico-compressor-autocaravana/"), html);
  assert.equal(addContextualGrowthLinks(html, "ro", "/ro/ghiduri/example/"), html);
});
