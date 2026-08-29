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

test("Portugal calculator exposes its complete private trust and guide path", () => {
  const html = renderPrivateMarketSeedPage(PT_MARKET_SEED);
  for (const href of PT_LINKS) assert.match(html, new RegExp(`href="${href.replaceAll("/", "\\/")}"`));
  assert.equal((html.match(/class="header-link"/g) || []).length, 1);
  assert.match(html, /<footer class="expansion-footer">/);
  assert.match(html, /noindex,nofollow,noarchive/);
});

test("Slovenia calculator exposes its complete private trust and guide path", () => {
  const html = renderPrivateMarketSeedPage(SI_MARKET_SEED);
  for (const href of SI_LINKS) assert.match(html, new RegExp(`href="${href.replaceAll("/", "\\/")}"`));
  assert.equal((html.match(/class="header-link"/g) || []).length, 1);
  assert.match(html, /<footer class="expansion-footer">/);
  assert.match(html, /noindex,nofollow,noarchive/);
});

test("Romania seed does not inherit Portugal or Slovenia navigation", () => {
  const html = renderPrivateMarketSeedPage(RO_MARKET_SEED);
  assert.doesNotMatch(html, /class="expansion-nav"/);
  assert.doesNotMatch(html, /class="expansion-footer"/);
  for (const href of [...PT_LINKS, ...SI_LINKS]) assert.doesNotMatch(html, new RegExp(href.replaceAll("/", "\\/")));
});

test("Portugal and Slovenia analytics classify guide and trust routes locally", () => {
  assert.deepEqual(buildAnalyticsContext({ lang: "pt", pathname: "/pt/guias/capacidade-bateria-autocaravana/", hasCalculator: false }), {
    market: "pt", page_path: "/pt/guias/capacidade-bateria-autocaravana/", page_type: "guide",
  });
  assert.deepEqual(buildAnalyticsContext({ lang: "sl", pathname: "/si/vodici/kapaciteta-baterije-avtodom/", hasCalculator: false }), {
    market: "si", page_path: "/si/vodici/kapaciteta-baterije-avtodom/", page_type: "guide",
  });
  assert.equal(buildAnalyticsContext({ lang: "pt", pathname: "/pt/privacidade/", hasCalculator: false }).page_type, "trust");
  assert.equal(buildAnalyticsContext({ lang: "sl", pathname: "/si/zasebnost/", hasCalculator: false }).page_type, "trust");
});

test("analytics consent links point to the real local privacy pages", async () => {
  const source = await readFile(new URL("../src/analytics.js", import.meta.url), "utf8");
  assert.match(source, /detailsUrl: "\/pt\/privacidade\/"/);
  assert.match(source, /detailsUrl: "\/si\/zasebnost\/"/);
  assert.doesNotMatch(source, /detailsUrl: "\/pt\/" }/);
  assert.doesNotMatch(source, /detailsUrl: "\/si\/" }/);
});
