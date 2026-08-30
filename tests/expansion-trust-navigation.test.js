import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildAnalyticsContext } from "../src/analytics-context.js";
import { renderPrivateMarketSeedPage } from "../src/private-market-page.js";
import { PT_MARKET_SEED } from "../src/market-seed-pt.js";
import { SI_MARKET_SEED } from "../src/market-seed-si.js";
import { RO_MARKET_SEED } from "../src/market-seed-ro.js";

const PT_LINKS = ["/pt/guias/", "/pt/metodologia/", "/pt/sobre-o-projeto/", "/pt/afiliacao/", "/pt/privacidade/"];
const SI_LINKS = ["/si/vodici/", "/si/metodologija/", "/si/o-projektu/", "/si/affiliate/", "/si/zasebnost/"];
const RO_LINKS = ["/ro/ghiduri/", "/ro/metodologie/", "/ro/despre-proiect/", "/ro/afiliere/", "/ro/confidentialitate/"];

for (const [name, seed, links] of [
  ["Portugal", PT_MARKET_SEED, PT_LINKS],
  ["Slovenia", SI_MARKET_SEED, SI_LINKS],
  ["Romania", RO_MARKET_SEED, RO_LINKS],
]) {
  test(`${name} calculator exposes its complete local trust and guide path`, () => {
    const html = renderPrivateMarketSeedPage(seed);
    for (const href of links) assert.match(html, new RegExp(`href="${href.replaceAll("/", "\\/")}"`));
    const header = html.match(/<header class="site-header">([\s\S]*?)<\/header>/)?.[1] || "";
    assert.equal((header.match(/class="header-link"/g) || []).length, 3);
    assert.match(html, /<footer class="expansion-footer">/);
    assert.match(html, /noindex,nofollow,noarchive/);
  });
}

test("each expansion market keeps navigation isolated to its own local routes", () => {
  const cases = [
    [PT_MARKET_SEED, PT_LINKS, [...SI_LINKS, ...RO_LINKS]],
    [SI_MARKET_SEED, SI_LINKS, [...PT_LINKS, ...RO_LINKS]],
    [RO_MARKET_SEED, RO_LINKS, [...PT_LINKS, ...SI_LINKS]],
  ];
  for (const [seed, localLinks, foreignLinks] of cases) {
    const html = renderPrivateMarketSeedPage(seed);
    for (const href of localLinks) assert.match(html, new RegExp(href.replaceAll("/", "\\/")));
    for (const href of foreignLinks) assert.doesNotMatch(html, new RegExp(href.replaceAll("/", "\\/")));
  }
});

test("expansion analytics classify guide and trust routes locally", () => {
  assert.deepEqual(buildAnalyticsContext({ lang: "pt", pathname: "/pt/guias/capacidade-bateria-autocaravana/", hasCalculator: false }), {
    market: "pt", page_path: "/pt/guias/capacidade-bateria-autocaravana/", page_type: "guide",
  });
  assert.deepEqual(buildAnalyticsContext({ lang: "sl", pathname: "/si/vodici/kapaciteta-baterije-avtodom/", hasCalculator: false }), {
    market: "si", page_path: "/si/vodici/kapaciteta-baterije-avtodom/", page_type: "guide",
  });
  assert.deepEqual(buildAnalyticsContext({ lang: "ro", pathname: "/ro/ghiduri/capacitate-baterie-autorulota/", hasCalculator: false }), {
    market: "ro", page_path: "/ro/ghiduri/capacitate-baterie-autorulota/", page_type: "guide",
  });
  assert.equal(buildAnalyticsContext({ lang: "pt", pathname: "/pt/privacidade/", hasCalculator: false }).page_type, "trust");
  assert.equal(buildAnalyticsContext({ lang: "sl", pathname: "/si/zasebnost/", hasCalculator: false }).page_type, "trust");
  assert.equal(buildAnalyticsContext({ lang: "ro", pathname: "/ro/confidentialitate/", hasCalculator: false }).page_type, "trust");
});

test("analytics consent links point to the real local privacy pages", async () => {
  const source = await readFile(new URL("../src/analytics.js", import.meta.url), "utf8");
  assert.match(source, /detailsUrl: "\/pt\/privacidade\/"/);
  assert.match(source, /detailsUrl: "\/si\/zasebnost\/"/);
  assert.match(source, /detailsUrl: "\/ro\/confidentialitate\/"/);
  assert.doesNotMatch(source, /detailsUrl: "\/pt\/" }/);
  assert.doesNotMatch(source, /detailsUrl: "\/si\/" }/);
  assert.doesNotMatch(source, /detailsUrl: "\/ro\/" }/);
});
