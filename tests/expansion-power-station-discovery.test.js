import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addExpansionPowerStationDecisionDiscovery, EXPANSION_POWER_STATION_ROUTES } from "../src/expansion-power-station-content.js";
import { publicizeExpansionHtml } from "../src/expansion-publication.js";
import { renderPortugalPrivateContentPage } from "../src/private-content-pt.js";
import { renderSloveniaPrivateContentPage } from "../src/private-content-si.js";

const CASES = [
  { market: "pt", route: "/pt/guias/sistema-eletrico-completo-autocaravana/", render: renderPortugalPrivateContentPage },
  { market: "si", route: "/si/vodici/elektricni-sistem-avtodom/", render: renderSloveniaPrivateContentPage },
];

for (const { market, route, render } of CASES) {
  test(`${market} system guide leads to the portable-vs-fixed decision before component sizing`, () => {
    const base = render(route);
    const once = addExpansionPowerStationDecisionDiscovery(base, market, route);
    const twice = addExpansionPowerStationDecisionDiscovery(once, market, route);
    assert.equal(twice, once, "injection is idempotent");

    const generated = publicizeExpansionHtml(base, market, route);
    const committed = readFileSync(new URL(`../${route.slice(1)}index.html`, import.meta.url), "utf8");
    for (const html of [generated, committed]) {
      const target = `href="${EXPANSION_POWER_STATION_ROUTES[market]}"`;
      assert.equal((html.match(/data-power-station-decision/g) || []).length, 1);
      assert.ok(html.includes(target), "link stays inside the correct market");
      assert.ok(html.indexOf("data-power-station-decision") < html.indexOf("data-guide-top-cta"), "choice precedes calculator CTA");
      assert.ok(html.indexOf("data-power-station-decision") < html.indexOf('<aside class="cta">'), "choice is early in the guide");
      assert.match(html, /"dateModified":"2026-11-17"/);
    }
  });
}

test("discovery never mutates unrelated routes or markets", () => {
  const html = renderPortugalPrivateContentPage(CASES[0].route);
  for (const [market, route] of [["pt", EXPANSION_POWER_STATION_ROUTES.pt], ["ro", CASES[0].route], ["si", CASES[0].route]]) {
    assert.equal(addExpansionPowerStationDecisionDiscovery(html, market, route), html);
  }
});
