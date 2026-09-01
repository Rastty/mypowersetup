import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { expansionPublicationManifest, publicizeExpansionHtml, addExpansionHomeAlternate, addExpansionRoutesToSitemap, publishedExpansionMarketsFromSitemap, requireExpansionNativeApproval } from "../src/expansion-publication.js";

for (const market of ["pt", "si", "ro"]) {
  test(`${market} publication manifest covers home, hub, four trust pages, eleven guides and one voltage guide`, () => {
    const manifest = expansionPublicationManifest(market);
    assert.equal(manifest.length, 18);
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

test("publicizer supplies one localized Article schema only when an expansion guide lacks one", async () => {
  const cases = [
    ["pt", "/pt/guias/consumo-frigorifico-compressor-autocaravana/", "pt-PT"],
    ["pt", "/pt/guias/sistema-eletrico-completo-autocaravana/", "pt-PT"],
    ["ro", "/ro/ghiduri/consum-frigider-compresor-autorulota/", "ro-RO"],
    ["ro", "/ro/ghiduri/sistem-electric-complet-autorulota/", "ro-RO"],
    ["si", "/si/vodici/poraba-kompresorski-hladilnik-avtodom/", "sl-SI"],
    ["si", "/si/vodici/elektricni-sistem-avtodom/", "sl-SI"],
  ];
  for (const [market, route, locale] of cases) {
    const privateHtml = '<html><head><meta name="robots" content="noindex,nofollow,noarchive"></head><body></body></html>';
    const once = publicizeExpansionHtml(privateHtml, market, route);
    const twice = publicizeExpansionHtml(once, market, route);
    assert.equal((once.match(/data-expansion-article-fallback/g) || []).length, 1, route);
    assert.match(once, new RegExp(`"inLanguage":"${locale}"`));
    assert.equal(twice, once, route);
  }

  const existingArticle = '<html><head><script type="application/ld+json">{"@type":"Article","inLanguage":"pt-PT"}</script></head><body></body></html>';
  assert.doesNotMatch(publicizeExpansionHtml(existingArticle, "pt", "/pt/guias/capacidade-bateria-autocaravana/"), /data-expansion-article-fallback/);
});

test("home publication adds all public hreflangs, static language links and release marker idempotently", () => {
  const html = '<html><head></head><body><header><nav class="expansion-nav"><a class="header-link" href="/ro/ghiduri/">Ghiduri</a></nav></header></body></html>';
  const once = publicizeExpansionHtml(html, "ro", "/ro/", { home: true });
  const twice = publicizeExpansionHtml(once, "ro", "/ro/", { home: true });
  for (const locale of ["cs-CZ", "sk-SK", "pl-PL", "hu-HU", "pt-PT", "sl-SI", "ro-RO"]) assert.match(once, new RegExp(`hreflang="${locale}"`));
  for (const route of ["/", "/sk/", "/pl/", "/hu/", "/pt/", "/si/"]) assert.match(once, new RegExp(`class="header-link language-switch" href="${route.replaceAll("/", "\\/")}"`));
  assert.doesNotMatch(once, /class="header-link language-switch" href="\/ro\/"/);
  assert.equal((once.match(/class="header-link language-switch"/g) || []).length, 6);
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
  assert.equal((once.match(/<loc>/g) || []).length, 18);
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

test("committed expansion homes carry one complete reciprocal hreflang set", async () => {
  const locales = Object.freeze({
    "cs-CZ": "/",
    "sk-SK": "/sk/",
    "pl-PL": "/pl/",
    "hu-HU": "/hu/",
    "pt-PT": "/pt/",
    "sl-SI": "/si/",
    "ro-RO": "/ro/",
    "x-default": "/",
  });
  for (const market of ["pt", "si", "ro"]) {
    const html = await readFile(new URL(`../${market}/index.html`, import.meta.url), "utf8");
    for (const [locale, route] of Object.entries(locales)) {
      const tag = `<link rel="alternate" hreflang="${locale}" href="https://mypowersetup.com${route}">`;
      assert.equal(html.split(tag).length - 1, 1, `${market} must contain one ${locale} alternate`);
    }
  }
});
