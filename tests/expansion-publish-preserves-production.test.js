import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { renderPrivateMarketSeedPage } from "../src/private-market-page.js";
import { renderPortugalPrivateContentPage } from "../src/private-content-pt.js";
import { renderRomaniaPrivateContentPage } from "../src/private-content-ro.js";
import { renderSloveniaPrivateContentPage } from "../src/private-content-si.js";
import { renderExpansionVoltageGuidePage } from "../src/expansion-voltage-guides.js";
import { PT_MARKET_SEED } from "../src/market-seed-pt.js";
import { RO_MARKET_SEED } from "../src/market-seed-ro.js";
import { SI_MARKET_SEED } from "../src/market-seed-si.js";
import { assertExpansionMoneyGuideSeo, expansionMoneyGuideRoutes } from "../src/expansion-money-guide-seo.js";
import { expansionPublicationManifest, publicizeExpansionHtml } from "../src/expansion-publication.js";

const config = Object.freeze({
  pt: { seed: PT_MARKET_SEED, render: renderPortugalPrivateContentPage, chemistry: "/pt/guias/lifepo4-vs-agm-autocaravana/" },
  ro: { seed: RO_MARKET_SEED, render: renderRomaniaPrivateContentPage, chemistry: "/ro/ghiduri/lifepo4-sau-agm-autorulota/" },
  si: { seed: SI_MARKET_SEED, render: renderSloveniaPrivateContentPage, chemistry: "/si/vodici/lifepo4-ali-agm-avtodom/" },
});
const moneyGuides = new Set(expansionMoneyGuideRoutes());
const root = new URL("../", import.meta.url);

test("republication reproduces every committed PT/RO/SI page without stripping previous SEO or navigation", async () => {
  for (const [market, { seed, render, chemistry }] of Object.entries(config)) {
    for (const item of expansionPublicationManifest(market)) {
      const before = item.source === "home"
        ? renderPrivateMarketSeedPage(seed)
        : render(item.route) || renderExpansionVoltageGuidePage(market, item.route);
      assert.ok(before, `${item.route}: publication source missing`);
      const rendered = publicizeExpansionHtml(before, market, item.route, { home: item.source === "home" });
      const committed = await readFile(new URL(item.path, root), "utf8");
      assert.equal(rendered, committed, `${item.route}: regeneration would change committed public markup`);
      if (item.source === "home") {
        assert.match(rendered, /expansion-calculator-browser\.js\?v=20261117-bms-load1/);
        assert.ok(rendered.includes('class="guide-preview-grid"'), `${market}: public money-guide discovery missing`);
        assert.ok(rendered.includes(`href="${chemistry}"`), `${market}: chemistry decision guide missing`);
        assert.equal((rendered.match(/data-money-guide/g) || []).length, 4, `${market}: 4 specialist cards missing`);
      }
      if (moneyGuides.has(item.route)) {
        assertExpansionMoneyGuideSeo(rendered, item.route);
        assert.ok(rendered.includes("data-guide-conversion-cta"), `${market}: buyer CTA missing`);
      }
    }
  }
});
