const CALCULATOR_ROOTS = Object.freeze([
  "/kalkulacky/",
  "/sk/kalkulacky/",
  "/pl/kalkulatory/",
  "/hu/kalkulatorok/",
]);

function clean(value) {
  return String(value ?? "").trim();
}

function bareHostname(value) {
  const text = clean(value);
  if (!text) return "";
  try {
    const url = new URL(text.includes("://") ? text : `https://${text}`);
    return url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  } catch {
    return "";
  }
}

export const GSC_CALCULATOR_ROOTS = CALCULATOR_ROOTS;

export function exactGscDomainProperty(targetHostname = "mypowersetup.com") {
  const hostname = bareHostname(targetHostname);
  if (!hostname) throw new Error("GSC_TARGET_HOSTNAME_INVALID");
  return `sc-domain:${hostname}`;
}

export function selectExactGscProperty(siteEntries = [], targetHostname = "mypowersetup.com") {
  const expected = exactGscDomainProperty(targetHostname);
  const matches = (Array.isArray(siteEntries) ? siteEntries : [])
    .filter((item) => clean(item?.siteUrl).toLowerCase() === expected)
    .map((item) => ({
      siteUrl: clean(item.siteUrl),
      permissionLevel: clean(item.permissionLevel),
    }));

  if (!matches.length) throw new Error(`GSC_EXACT_DOMAIN_PROPERTY_NOT_FOUND:${expected}`);
  if (matches.length > 1) throw new Error(`GSC_EXACT_DOMAIN_PROPERTY_AMBIGUOUS:${expected}`);

  const selected = matches[0];
  const permission = selected.permissionLevel.toLowerCase();
  if (permission === "siteunverifieduser" || permission === "none") {
    throw new Error(`GSC_PROPERTY_NOT_VERIFIED:${expected}`);
  }
  return Object.freeze(selected);
}

function decodeXmlText(value) {
  return clean(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function calculatorUrlsFromSitemap(xml, targetHostname = "mypowersetup.com") {
  const hostname = bareHostname(targetHostname);
  if (!hostname) throw new Error("GSC_TARGET_HOSTNAME_INVALID");

  const urls = [];
  const seen = new Set();
  const matcher = /<loc>([\s\S]*?)<\/loc>/gi;
  let match;
  while ((match = matcher.exec(String(xml ?? ""))) !== null) {
    const value = decodeXmlText(match[1]);
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      continue;
    }
    if (bareHostname(parsed.hostname) !== hostname) continue;
    if (!CALCULATOR_ROOTS.some((root) => parsed.pathname.startsWith(root))) continue;
    const normalized = `https://${hostname}${parsed.pathname.endsWith("/") ? parsed.pathname : `${parsed.pathname}/`}`;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
  }

  if (!urls.length) throw new Error("GSC_CALCULATOR_URLS_NOT_FOUND_IN_SITEMAP");
  return Object.freeze(urls);
}

function pageEqualsFilter(url) {
  return [{
    groupType: "and",
    filters: [{
      dimension: "page",
      operator: "equals",
      expression: String(url),
    }],
  }];
}

export function gscPageQueryRequest(url, startDate, endDate) {
  return Object.freeze({
    startDate,
    endDate,
    dimensions: ["query"],
    type: "web",
    rowLimit: 25000,
    dimensionFilterGroups: pageEqualsFilter(url),
  });
}

export function gscPageTotalRequest(url, startDate, endDate) {
  return Object.freeze({
    startDate,
    endDate,
    type: "web",
    rowLimit: 1,
    dimensionFilterGroups: pageEqualsFilter(url),
  });
}

export function normalizeSearchAnalyticsPageTotal(url, response = {}) {
  const row = Array.isArray(response?.rows) ? response.rows[0] : null;
  return Object.freeze({
    page: String(url),
    clicks: Number(row?.clicks || 0),
    impressions: Number(row?.impressions || 0),
    ctr: Number(row?.ctr || 0),
    position: Number(row?.position || 0),
  });
}

export function normalizeSearchAnalyticsRows(url, response = {}) {
  return (Array.isArray(response?.rows) ? response.rows : [])
    .map((row) => {
      const query = clean(Array.isArray(row?.keys) ? row.keys[0] : "");
      if (!query) return null;
      return {
        keys: [String(url), query],
        clicks: Number(row?.clicks || 0),
        impressions: Number(row?.impressions || 0),
        ctr: Number(row?.ctr || 0),
        position: Number(row?.position || 0),
      };
    })
    .filter(Boolean);
}

export function normalizeUrlInspection(url, response = {}) {
  const result = response?.inspectionResult?.indexStatusResult || response?.indexStatusResult || response || {};
  const verdict = clean(result.verdict);
  const coverageState = clean(result.coverageState);
  const robotsTxtState = clean(result.robotsTxtState);
  const indexingState = clean(result.indexingState);
  const pageFetchState = clean(result.pageFetchState);
  const lastCrawlTime = clean(result.lastCrawlTime);
  const googleCanonical = clean(result.googleCanonical);
  const userCanonical = clean(result.userCanonical);
  const sitemap = Array.isArray(result.sitemap) ? result.sitemap.map(clean).filter(Boolean) : [];

  const lowerVerdict = verdict.toLowerCase();
  const lowerCoverage = coverageState.toLowerCase();
  let indexed = null;
  if (lowerVerdict === "pass" || (lowerCoverage.includes("indexed") && !lowerCoverage.includes("not indexed"))) indexed = true;
  else if (
    lowerVerdict === "fail"
    || lowerCoverage.includes("unknown to google")
    || lowerCoverage.includes("not on google")
    || lowerCoverage.includes("not indexed")
    || lowerCoverage.includes("excluded")
  ) indexed = false;

  return Object.freeze({
    url: String(url),
    ...(indexed === null ? {} : { indexed }),
    verdict,
    coverageState,
    robotsTxtState,
    indexingState,
    pageFetchState,
    lastCrawlTime,
    googleCanonical,
    userCanonical,
    sitemap,
  });
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function defaultGscDateRange(now = new Date()) {
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);
  return Object.freeze({ startDate: isoDate(start), endDate: isoDate(end) });
}
