import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderPrivateMarketSeedPage } from "../src/private-market-page.js";
import { renderPortugalPrivateContentPage } from "../src/private-content-pt.js";
import { renderSloveniaPrivateContentPage } from "../src/private-content-si.js";
import { renderRomaniaPrivateContentPage } from "../src/private-content-ro.js";
import { PT_MARKET_SEED } from "../src/market-seed-pt.js";
import { SI_MARKET_SEED } from "../src/market-seed-si.js";
import { RO_MARKET_SEED } from "../src/market-seed-ro.js";
import { expansionPublicationManifest } from "../src/expansion-publication.js";

const PRIVATE_ROBOTS = /<meta name="robots" content="noindex,nofollow,noarchive">/;

const markets = {
  pt: { seed: PT_MARKET_SEED, render: renderPortugalPrivateContentPage },
  si: { seed: SI_MARKET_SEED, render: renderSloveniaPrivateContentPage },
  ro: { seed: RO_MARKET_SEED, render: renderRomaniaPrivateContentPage },
};

test("currently private expansion homes and content stay noindex", () => {
  for (const [market, config] of Object.entries(markets)) {
    const manifest = expansionPublicationManifest(market);
    const home = renderPrivateMarketSeedPage(config.seed);
    assert.match(home, PRIVATE_ROBOTS, `${market} private home must stay noindex`);

    for (const entry of manifest.filter(({ source }) => source === "content")) {
      const html = config.render(entry.route);
      assert.ok(html, `${market} private route must render: ${entry.route}`);
      assert.match(html, PRIVATE_ROBOTS, `${market} private route must stay noindex: ${entry.route}`);
    }
  }
});

test("private expansion routes are absent from the public sitemap", async () => {
  const sitemap = await readFile("sitemap.xml", "utf8");
  for (const market of Object.keys(markets)) {
    for (const { route } of expansionPublicationManifest(market)) {
      assert.doesNotMatch(sitemap, new RegExp(`<loc>https:\\/\\/mypowersetup\\.com${escapeRegExp(route)}<\\/loc>`), `${market} private route leaked into sitemap: ${route}`);
    }
  }
});

test("robots policy allows public crawling and points at the canonical sitemap", async () => {
  const robots = await readFile("robots.txt", "utf8");
  assert.match(robots, /User-agent:\s*\*/);
  assert.match(robots, /Allow:\s*\//);
  assert.match(robots, /Sitemap:\s*https:\/\/mypowersetup\.com\/sitemap\.xml/);
  assert.doesNotMatch(robots, /Disallow:\s*\/(?:pt|si|ro)\//);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
