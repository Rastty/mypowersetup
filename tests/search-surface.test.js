import test from "node:test";
import assert from "node:assert/strict";
import { buildMarketHomeSearchSurface } from "../src/search-surface.js";
import { renderPrivateMarketSeedPage } from "../src/private-market-page.js";
import { publicizeExpansionHtml } from "../src/expansion-publication.js";
import { PT_MARKET_SEED } from "../src/market-seed-pt.js";
import { SI_MARKET_SEED } from "../src/market-seed-si.js";
import { RO_MARKET_SEED } from "../src/market-seed-ro.js";

const MARKETS = [PT_MARKET_SEED, SI_MARKET_SEED, RO_MARKET_SEED];

for (const seed of MARKETS) {
  test(`${seed.key} homepage exposes the reusable search surface`, () => {
    const metadata = buildMarketHomeSearchSurface(seed);
    const canonical = `https://mypowersetup.com${seed.route}`;

    assert.match(metadata, /property="og:title"/);
    assert.match(metadata, /property="og:description"/);
    assert.match(metadata, /property="og:image" content="https:\/\/mypowersetup\.com\/social-card\.png"/);
    assert.match(metadata, /name="twitter:card" content="summary_large_image"/);
    assert.match(metadata, /"@type":"WebSite"/);
    assert.match(metadata, /"@type":"WebApplication"/);
    assert.match(metadata, /"@type":"Organization"/);
    assert.ok(metadata.includes(`\"inLanguage\":\"${seed.locale}\"`));
    assert.ok(metadata.includes(`\"url\":\"${canonical}#calculator-preview\"`));
  });

  test(`${seed.key} published homepage keeps indexability and rich search metadata together`, () => {
    const privateHtml = renderPrivateMarketSeedPage(seed);
    const publicHtml = publicizeExpansionHtml(privateHtml, seed.key, seed.route, { home: true });

    assert.doesNotMatch(publicHtml, /noindex/i);
    assert.match(publicHtml, new RegExp(`rel="canonical" href="https:\\/\\/mypowersetup\\.com${seed.route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
    assert.match(publicHtml, /property="og:url"/);
    assert.match(publicHtml, /"@type":"WebApplication"/);
    assert.match(publicHtml, /#calculator-preview/);
  });
}

test("search surface fails closed when reusable market metadata is incomplete", () => {
  assert.throws(() => buildMarketHomeSearchSurface({ route: "/x/" }), /SEARCH_SURFACE_MARKET_METADATA_REQUIRED/);
});
