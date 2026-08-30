import test from "node:test";
import assert from "node:assert/strict";
import { expansionPublicationManifest, publicizeExpansionHtml, addExpansionHomeAlternate, addExpansionRoutesToSitemap, publishedExpansionMarketsFromSitemap, requireExpansionNativeApproval } from "../src/expansion-publication.js";

for (const market of ["pt", "si", "ro"]) {
  test(`${market} publication manifest covers home, hub, four trust pages and ten guides`, () => {
    const manifest = expansionPublicationManifest(market);
    assert.equal(manifest.length, 16);
    assert.equal(manifest[0].source, "home");
    assert.equal(new Set(manifest.map((entry) => entry.route)).size, manifest.length);
    assert.ok(manifest.every((entry) => entry.path.endsWith("index.html")));
  });
}

test("publicizer removes private robots only for the requested market and adds canonical", () => {
  const html = '<html><head><meta name="robots" content="noindex,nofollow,noarchive"></head><body></body></html>';
  const output = publicizeExpansionHtml(html, "pt", "/pt/guias/", { home: false });
  assert.doesNotMatch(output, /noindex/);
  assert.match(output, /rel="canonical" href="https:\/\/mypowersetup.com\/pt\/guias\/"/);
  assert.throws(() => publicizeExpansionHtml(html, "pt", "/si/vodici/"), /ROUTE_INVALID/);
});

test("home publication adds its locale hreflang and release marker idempotently", () => {
  const html = '<html><head></head><body></body></html>';
  const once = publicizeExpansionHtml(html, "ro", "/ro/", { home: true });
  const twice = publicizeExpansionHtml(once, "ro", "/ro/", { home: true });
  assert.match(once, /hreflang="ro-RO"/);
  assert.match(once, /__MPS_RO_PUBLICATION__/);
  assert.equal(twice, once);
});

test("published-market alternate injection is idempotent", () => {
  const html = '<html><head><link rel="alternate" hreflang="x-default" href="https://mypowersetup.com/" /></head></html>';
  const once = addExpansionHomeAlternate(html, "si");
  const twice = addExpansionHomeAlternate(once, "si");
  assert.match(once, /hreflang="sl-SI" href="https:\/\/mypowersetup.com\/si\/"/);
  assert.equal(twice, once);
});

test("published expansion markets are detected only from sitemap home routes", () => {
  const xml = '<?xml version="1.0"?><urlset><url><loc>https://mypowersetup.com/pt/</loc></url><url><loc>https://mypowersetup.com/si/vodici/</loc></url><url><loc>https://mypowersetup.com/ro/</loc></url></urlset>';
  assert.deepEqual(publishedExpansionMarketsFromSitemap(xml), ["pt", "ro"]);
  assert.deepEqual(publishedExpansionMarketsFromSitemap(xml, { exclude: "pt" }), ["ro"]);
});

test("sequential expansion homes can carry reciprocal hreflang alternates", () => {
  const base = '<html><head></head><body></body></html>';
  let pt = publicizeExpansionHtml(base, "pt", "/pt/", { home: true });
  let si = publicizeExpansionHtml(base, "si", "/si/", { home: true });
  pt = addExpansionHomeAlternate(pt, "si");
  si = addExpansionHomeAlternate(si, "pt");
  assert.match(pt, /hreflang="sl-SI" href="https:\/\/mypowersetup.com\/si\/"/);
  assert.match(si, /hreflang="pt-PT" href="https:\/\/mypowersetup.com\/pt\/"/);
});

test("sitemap publication adds all routes once", () => {
  const xml = '<?xml version="1.0"?><urlset></urlset>';
  const once = addExpansionRoutesToSitemap(xml, "pt");
  const twice = addExpansionRoutesToSitemap(once, "pt");
  assert.equal((once.match(/<loc>/g) || []).length, 16);
  assert.equal(twice, once);
});

test("language approval rejects a nominal approval with an incomplete review checklist", () => {
  assert.throws(
    () => requireExpansionNativeApproval("pt", {
      languageEditorialReview: true,
      publicPublicationApproved: true,
      reviewer: "AI editorial language review",
      reviewedAt: "2026-08-30",
    }),
    /reviewerQualification.*calculatorReviewed.*guidesReviewed.*trustReviewed.*terminologyReviewed.*blockingIssuesResolved/,
  );
});

test("language approval rejects malformed review dates", () => {
  assert.throws(
    () => requireExpansionNativeApproval("si", {
      languageEditorialReview: true,
      publicPublicationApproved: true,
      reviewerType: "ai_editorial_review",
      reviewer: "AI editorial language review",
      reviewedAt: "30-08-2026",
      calculatorReviewed: true,
      guidesReviewed: true,
      trustReviewed: true,
      terminologyReviewed: true,
      blockingIssuesResolved: true,
    }),
    /reviewedAt/,
  );
});

test("language approval opens only after the complete explicit checklist and publication approval", () => {
  const evidence = {
    languageEditorialReview: true,
    publicPublicationApproved: true,
    nativeSpeaker: false,
    reviewerType: "ai_editorial_review",
    reviewer: "AI editorial language review",
    reviewedAt: "2026-08-30",
    calculatorReviewed: true,
    guidesReviewed: true,
    trustReviewed: true,
    terminologyReviewed: true,
    blockingIssuesResolved: true,
  };
  for (const market of ["pt", "si", "ro"]) assert.equal(requireExpansionNativeApproval(market, evidence), true);
});