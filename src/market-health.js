export const CORE_PRODUCT_MINIMUMS = Object.freeze({
  battery: 2,
  solar_panel: 3,
  controller: 2,
  inverter: 3,
  dc_charger: 2,
  shore_charger: 2,
});

export function assessMarketHealth({
  key,
  locale,
  expectedPublic,
  homepageHtml,
  canonicalUrl,
  sitemapUrls,
  catalogs,
  guideCount,
  minimumGuideCount = 9,
  productMinimums = CORE_PRODUCT_MINIMUMS,
} = {}) {
  const normalizedCatalogs = Array.isArray(catalogs) ? catalogs.filter(Boolean) : [];
  const products = normalizedCatalogs.flatMap((catalog) => Array.isArray(catalog?.products) ? catalog.products : []);
  const sources = Object.assign({}, ...normalizedCatalogs.map((catalog) => catalog?.sources || {}));
  const categoryCounts = Object.fromEntries(Object.keys(productMinimums).map((category) => [category, 0]));

  for (const product of products) {
    if (Object.hasOwn(categoryCounts, product?.category)) categoryCounts[product.category] += 1;
  }

  const missingCoverage = Object.entries(productMinimums)
    .filter(([category, minimum]) => categoryCounts[category] < minimum)
    .map(([category, minimum]) => Object.freeze({ category, count: categoryCounts[category], minimum }));

  const sourceEntries = Object.entries(sources);
  const staleSources = sourceEntries.filter(([, source]) => source?.status !== "ok").map(([source]) => source);
  const invalidAffiliateProducts = products
    .filter((product) => !isHttpsUrl(product?.affiliateUrl) || !isHttpsUrl(product?.productUrl))
    .map((product) => product?.id || product?.name || "unknown");

  const sitemapSet = new Set(sitemapUrls || []);
  const sitemapContainsHomepage = sitemapSet.has(canonicalUrl);
  const homepageNoindex = hasNoindex(homepageHtml);
  const homepageCanonical = extractCanonical(homepageHtml);

  const safetyChecks = Object.freeze({
    catalogPresent: normalizedCatalogs.length > 0 && products.length > 0,
    sourceMetadataPresent: sourceEntries.length > 0,
    affiliateDestinationsValid: invalidAffiliateProducts.length === 0,
    canonicalMatches: homepageCanonical === canonicalUrl,
    publicationStateMatches: expectedPublic
      ? sitemapContainsHomepage && !homepageNoindex
      : !sitemapContainsHomepage && homepageNoindex,
  });

  const qualityChecks = Object.freeze({
    sourcesFresh: sourceEntries.length > 0 && staleSources.length === 0,
    productCoverage: missingCoverage.length === 0,
    guideDepth: Number.isInteger(guideCount) && guideCount >= minimumGuideCount,
  });

  const blockers = [
    ...(!safetyChecks.catalogPresent ? ["CATALOG_MISSING"] : []),
    ...(!safetyChecks.sourceMetadataPresent ? ["SOURCE_METADATA_MISSING"] : []),
    ...(!safetyChecks.affiliateDestinationsValid ? ["AFFILIATE_DESTINATION_INVALID"] : []),
    ...(!safetyChecks.canonicalMatches ? ["CANONICAL_MISMATCH"] : []),
    ...(!safetyChecks.publicationStateMatches ? ["PUBLICATION_STATE_MISMATCH"] : []),
  ];
  const attention = [
    ...(!qualityChecks.sourcesFresh ? staleSources.map((source) => `SOURCE_NOT_FRESH:${source}`) : []),
    ...missingCoverage.map(({ category, count, minimum }) => `PRODUCT_COVERAGE:${category}:${count}/${minimum}`),
    ...(!qualityChecks.guideDepth ? [`GUIDE_DEPTH:${guideCount}/${minimumGuideCount}`] : []),
  ];

  const status = blockers.length ? "blocked" : attention.length ? "attention" : "healthy";

  return Object.freeze({
    key,
    locale,
    expectedPublic: Boolean(expectedPublic),
    status,
    productCount: products.length,
    categoryCounts: Object.freeze(categoryCounts),
    sourceCount: sourceEntries.length,
    staleSources: Object.freeze(staleSources),
    guideCount,
    sitemapContainsHomepage,
    homepageNoindex,
    homepageCanonical,
    safetyChecks,
    qualityChecks,
    missingCoverage: Object.freeze(missingCoverage),
    invalidAffiliateProducts: Object.freeze(invalidAffiliateProducts),
    blockers: Object.freeze(blockers),
    attention: Object.freeze(attention),
  });
}

export function summarizeMarketHealth(markets) {
  const reports = Array.isArray(markets) ? markets : [];
  const counts = reports.reduce((result, market) => {
    result[market.status] = (result[market.status] || 0) + 1;
    return result;
  }, { healthy: 0, attention: 0, blocked: 0 });
  return Object.freeze({
    safe: reports.every((market) => market.blockers.length === 0),
    allHealthy: reports.every((market) => market.status === "healthy"),
    counts: Object.freeze(counts),
    markets: Object.freeze(reports.map(({ key, status, blockers, attention }) => Object.freeze({ key, status, blockers, attention }))),
  });
}

export function extractSitemapUrls(xml) {
  return [...new Set([...String(xml || "").matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim()))];
}

export function extractCanonical(html) {
  const match = String(html || "").match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i)
    || String(html || "").match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["'][^>]*>/i);
  return match?.[1] || null;
}

export function hasNoindex(html) {
  return /<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*\bnoindex\b[^"']*["'][^>]*>/i.test(String(html || ""))
    || /<meta\b[^>]*\bcontent=["'][^"']*\bnoindex\b[^"']*["'][^>]*\bname=["']robots["'][^>]*>/i.test(String(html || ""));
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
