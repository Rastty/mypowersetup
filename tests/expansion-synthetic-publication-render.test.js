import test from "node:test";
import assert from "node:assert/strict";
import { renderPrivateMarketSeedPage } from "../src/private-market-page.js";
import { renderPortugalPrivateContentPage } from "../src/private-content-pt.js";
import { renderSloveniaPrivateContentPage } from "../src/private-content-si.js";
import { renderRomaniaPrivateContentPage } from "../src/private-content-ro.js";
import { renderExpansionVoltageGuidePage } from "../src/expansion-voltage-guides.js";
import { PT_MARKET_SEED } from "../src/market-seed-pt.js";
import { SI_MARKET_SEED } from "../src/market-seed-si.js";
import { RO_MARKET_SEED } from "../src/market-seed-ro.js";
import { expansionPublicationManifest, publicizeExpansionHtml, requireExpansionNativeApproval } from "../src/expansion-publication.js";

const APPROVED_REVIEW = Object.freeze({
  nativeLanguageReview: true,
  publicPublicationApproved: true,
  nativeSpeaker: true,
  reviewer: "Synthetic native reviewer",
  reviewedAt: "2026-08-30",
  calculatorReviewed: true,
  guidesReviewed: true,
  trustReviewed: true,
  terminologyReviewed: true,
  blockingIssuesResolved: true,
});

const MARKETS = Object.freeze({
  pt: Object.freeze({ seed: PT_MARKET_SEED, render: renderPortugalPrivateContentPage, locale: "pt-PT" }),
  si: Object.freeze({ seed: SI_MARKET_SEED, render: renderSloveniaPrivateContentPage, locale: "sl-SI" }),
  ro: Object.freeze({ seed: RO_MARKET_SEED, render: renderRomaniaPrivateContentPage, locale: "ro-RO" }),
});

for (const [market, config] of Object.entries(MARKETS)) {
  test(`${market} synthetic approved release renders every publication route safely`, () => {
    assert.equal(requireExpansionNativeApproval(market, APPROVED_REVIEW), true);
    const manifest = expansionPublicationManifest(market);
    assert.equal(manifest.length, 18);

    for (const entry of manifest) {
      const privateHtml = entry.source === "home"
        ? renderPrivateMarketSeedPage(config.seed)
        : config.render(entry.route) || renderExpansionVoltageGuidePage(market, entry.route);
      assert.ok(privateHtml, `missing private render for ${entry.route}`);

      const publicHtml = publicizeExpansionHtml(privateHtml, market, entry.route, { home: entry.source === "home" });
      assert.doesNotMatch(publicHtml, /<meta name="robots" content="noindex,nofollow,noarchive">/i, `private robots leaked on ${entry.route}`);
      assert.match(publicHtml, new RegExp(`rel="canonical" href="https:\\/\\/mypowersetup\\.com${entry.route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`), `canonical missing on ${entry.route}`);

      if (entry.source === "home") {
        assert.match(publicHtml, new RegExp(`hreflang="${config.locale}"`));
        assert.match(publicHtml, new RegExp(`__MPS_${market.toUpperCase()}_PUBLICATION__`));
      }
    }
  });
}
