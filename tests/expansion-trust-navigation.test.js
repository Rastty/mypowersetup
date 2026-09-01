import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildAnalyticsContext } from "../src/analytics-context.js";
import { renderPrivateMarketSeedPage } from "../src/private-market-page.js";
import { PT_MARKET_SEED } from "../src/market-seed-pt.js";
import { SI_MARKET_SEED } from "../src/market-seed-si.js";
import { RO_MARKET_SEED } from "../src/market-seed-ro.js";

const PT_LINKS = ["/pt/guias/", "/pt/metodologia/", "/pt/sobre-o-projeto/", "/pt/afiliacao/", "/pt/privacidade/"];
const RO_LINKS = ["/ro/ghiduri/", "/ro/metodologie/", "/ro/despre-proiect/", "/ro/afiliere/", "/ro/confidentialitate/"];
const SI_LINKS = ["/si/vodici/", "/si/metodologija/", "/si/o-projektu/", "/si/affiliate/", "/si/zasebnost/"];

function assertCompleteLocalNavigation(html, links) {
  for (const href of links) assert.match(html, new RegExp(`href="${href.replaceAll("/", "\\/")}"`));
  assert.equal((html.match(/class="header-link"/g) || []).length, 3);
  assert.match(html, /<footer class="expansion-footer">/);
  assert.match(html, /noindex,nofollow,noarchive/);
}

test("Portugal calculator exposes its complete private trust and guide path", () => {
  assertCompleteLocalNavigation(renderPrivateMarketSeedPage(PT_MARKET_SEED), PT_LINKS);
});

test("Slovenia calculator exposes its complete private trust and guide path", () => {
  assertCompleteLocalNavigation(renderPrivateMarketSeedPage(SI_MARKET_SEED), SI_LINKS);
});

test("Romania calculator exposes its own complete trust and guide path without cross-market links", () => {
  const html = renderPrivateMarketSeedPage(RO_MARKET_SEED);
  assertCompleteLocalNavigation(html, RO_LINKS);
  for (const href of [...PT_LINKS, ...SI_LINKS]) assert.doesNotMatch(html, new RegExp(href.replaceAll("/", "\\/")));
});

test("Portugal, Romania and Slovenia analytics classify guide and trust routes locally", () => {
  assert.deepEqual(buildAnalyticsContext({ lang: "pt", pathname: "/pt/guias/capacidade-bateria-autocaravana/", hasCalculator: false }), {
    market: "pt", page_path: "/pt/guias/capacidade-bateria-autocaravana/", page_type: "guide",
  });
  assert.deepEqual(buildAnalyticsContext({ lang: "ro", pathname: "/ro/ghiduri/capacitate-baterie-autorulota/", hasCalculator: false }), {
    market: "ro", page_path: "/ro/ghiduri/capacitate-baterie-autorulota/", page_type: "guide",
  });
  assert.deepEqual(buildAnalyticsContext({ lang: "sl", pathname: "/si/vodici/kapaciteta-baterije-avtodom/", hasCalculator: false }), {
    market: "si", page_path: "/si/vodici/kapaciteta-baterije-avtodom/", page_type: "guide",
  });
  assert.equal(buildAnalyticsContext({ lang: "pt", pathname: "/pt/privacidade/", hasCalculator: false }).page_type, "trust");
  assert.equal(buildAnalyticsContext({ lang: "ro", pathname: "/ro/confidentialitate/", hasCalculator: false }).page_type, "trust");
  assert.equal(buildAnalyticsContext({ lang: "sl", pathname: "/si/zasebnost/", hasCalculator: false }).page_type, "trust");
});

test("analytics consent links point to the real local privacy pages", async () => {
  const source = await readFile(new URL("../src/analytics.js", import.meta.url), "utf8");
  assert.match(source, /detailsUrl: "\/pt\/privacidade\/"/);
  assert.match(source, /detailsUrl: "\/ro\/confidentialitate\/"/);
  assert.match(source, /detailsUrl: "\/si\/zasebnost\/"/);
  assert.doesNotMatch(source, /detailsUrl: "\/pt\/" }/);
  assert.doesNotMatch(source, /detailsUrl: "\/ro\/" }/);
  assert.doesNotMatch(source, /detailsUrl: "\/si\/" }/);
});
