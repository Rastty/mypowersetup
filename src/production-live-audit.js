import { auditPublicSeo, PUBLIC_SEO_MARKETS, sitemapRoutes } from "./public-seo-audit.js";

const DEFAULT_SITE_URL = "https://mypowersetup.com";

const PRODUCT_CATALOGS = Object.freeze([
  "/data/products.json",
  "/data/products-ampul-cz.json",
  "/data/products-sk.json",
  "/data/products-pl.json",
  "/data/products-hu.json",
  "/data/products-pt.json",
  "/data/products-ro.json",
  "/data/products-si.json",
]);

function normalizedSiteUrl(value) {
  return String(value || DEFAULT_SITE_URL).replace(/\/$/, "");
}

async function fetchLive(fetcher, siteUrl, route, expectedType) {
  const response = await fetcher(`${siteUrl}${route}`, {
    cache: "no-store",
    headers: { accept: expectedType },
  });
  if (!response?.ok) throw new Error(`${route}:HTTP_${response?.status || "ERROR"}`);
  const contentType = response.headers?.get?.("content-type") || "";
  if (expectedType === "text/html" && !contentType.includes("text/html")) throw new Error(`${route}:CONTENT_TYPE_${contentType || "MISSING"}`);
  if (expectedType === "application/json" && !contentType.includes("json")) throw new Error(`${route}:CONTENT_TYPE_${contentType || "MISSING"}`);
  return response.text();
}

export function moduleScriptSources(html) {
  if (typeof html !== "string") return Object.freeze([]);
  return Object.freeze([...html.matchAll(/<script\b[^>]*>/gi)]
    .map(([tag]) => ({
      type: tag.match(/\btype=["']([^"']+)["']/i)?.[1],
      src: tag.match(/\bsrc=["']([^"']+)["']/i)?.[1],
    }))
    .filter(({ type, src }) => type === "module" && src)
    .map(({ src }) => src));
}

// Focused shipping proof for the Czech scenario entry. Identical assets and
// selection IDs matter more than HTTP 200 alone (which can serve stale Pages).
export async function auditCaravanEntryReadback({ localHtml, liveHtml, readLocalAsset, fetchLiveAsset }) {
  const failures = [];
  const expectedIds = ["weekend", "family", "work", "comfort"];
  const ids = (html) => [...String(html).matchAll(/data-caravan-profile=["']([^"']+)["']/g)].map((match) => match[1]);
  const localIds = ids(localHtml);
  const liveIds = ids(liveHtml);
  if (JSON.stringify(localIds) !== JSON.stringify(expectedIds)) failures.push("CZ_CARAVAN_LOCAL_SCENARIOS_INVALID");
  if (JSON.stringify(liveIds) !== JSON.stringify(localIds)) failures.push("CZ_CARAVAN_SCENARIOS_DRIFT");
  const assets = [
    "/src/caravan-entry.js?v=20261121-1",
    "/caravan-entry.css?v=20261121-2",
  ];
  for (const route of assets) {
    if (!String(localHtml).includes(route)) failures.push(`CZ_CARAVAN_LOCAL_ASSET_MISSING:${route}`);
    if (!String(liveHtml).includes(route)) failures.push(`CZ_CARAVAN_LIVE_ASSET_MISSING:${route}`);
    if (typeof readLocalAsset !== "function" || typeof fetchLiveAsset !== "function") {
      failures.push(`CZ_CARAVAN_ASSET_READER_MISSING:${route}`);
      continue;
    }
    try {
      const [local, live] = await Promise.all([readLocalAsset(route.split("?")[0]), fetchLiveAsset(route)]);
      if (typeof local !== "string" || typeof live !== "string" || live !== local) {
        failures.push(`CZ_CARAVAN_ASSET_DRIFT:${route}`);
      }
    } catch {
      failures.push(`CZ_CARAVAN_ASSET_FETCH_FAILED:${route}`);
    }
  }
  return Object.freeze({ ready: failures.length === 0, scenarios: Object.freeze(liveIds), checkedAssets: assets.length, failures: Object.freeze(failures) });
}

export async function auditProductionLive({
  fetcher = globalThis.fetch,
  siteUrl = DEFAULT_SITE_URL,
  localSitemapXml,
  readLocalHome,
  readLocalAsset,
} = {}) {
  if (typeof fetcher !== "function") throw new TypeError("PRODUCTION_FETCHER_REQUIRED");
  if (typeof localSitemapXml !== "string") throw new TypeError("PRODUCTION_LOCAL_SITEMAP_REQUIRED");
  if (typeof readLocalHome !== "function") throw new TypeError("PRODUCTION_LOCAL_HOME_READER_REQUIRED");

  const origin = normalizedSiteUrl(siteUrl);
  const failures = [];
  let liveSitemapXml = "";
  try {
    liveSitemapXml = await fetchLive(fetcher, origin, "/sitemap.xml", "application/xml");
  } catch (error) {
    failures.push(error.message);
  }

  const localRoutes = sitemapRoutes(localSitemapXml);
  const liveRoutes = liveSitemapXml ? sitemapRoutes(liveSitemapXml) : [];
  const localSet = new Set(localRoutes);
  const liveSet = new Set(liveRoutes);
  for (const route of localSet) if (!liveSet.has(route)) failures.push(`${route}:LIVE_SITEMAP_MISSING`);
  for (const route of liveSet) if (!localSet.has(route)) failures.push(`${route}:LIVE_SITEMAP_UNEXPECTED`);

  let seo = { ready: false, routeCount: 0, articlePages: 0, jsonLdScripts: 0, marketCounts: {}, failures: [] };
  if (liveSitemapXml) {
    seo = await auditPublicSeo({
      sitemapXml: liveSitemapXml,
      readPage: async (_path, route) => fetchLive(fetcher, origin, route, "text/html"),
    });
    failures.push(...seo.failures);
  }

  const assetRoutes = new Set();
  for (const market of PUBLIC_SEO_MARKETS) {
    try {
      const [liveHtml, localHtml] = await Promise.all([
        fetchLive(fetcher, origin, market.home, "text/html"),
        readLocalHome(market),
      ]);
      const liveAssets = moduleScriptSources(liveHtml);
      const localAssets = moduleScriptSources(localHtml);
      if (JSON.stringify(liveAssets) !== JSON.stringify(localAssets)) failures.push(`${market.home}:MODULE_ASSET_DRIFT`);
      for (const asset of liveAssets) if (asset.startsWith("/")) assetRoutes.add(asset);
      if (market.key === "cs") {
        const caravan = await auditCaravanEntryReadback({
          localHtml, liveHtml, readLocalAsset,
          fetchLiveAsset: (asset) => fetchLive(fetcher, origin, asset, asset.endsWith(".css?v=20261121-1") ? "text/css" : "text/javascript"),
        });
        failures.push(...caravan.failures);
      }
    } catch (error) {
      failures.push(error.message);
    }
  }

  for (const route of assetRoutes) {
    try {
      await fetchLive(fetcher, origin, route, "text/javascript");
    } catch (error) {
      failures.push(error.message);
    }
  }

  const catalogCounts = {};
  for (const route of PRODUCT_CATALOGS) {
    try {
      const payload = JSON.parse(await fetchLive(fetcher, origin, route, "application/json"));
      const count = Array.isArray(payload?.products) ? payload.products.length : -1;
      catalogCounts[route] = count;
      if (count <= 0) failures.push(`${route}:PRODUCTS_EMPTY`);
    } catch (error) {
      failures.push(error instanceof SyntaxError ? `${route}:JSON_INVALID` : error.message);
    }
  }

  return Object.freeze({
    ready: failures.length === 0,
    siteUrl: origin,
    localRouteCount: localRoutes.length,
    liveRouteCount: liveRoutes.length,
    checkedModuleAssets: assetRoutes.size,
    catalogCounts: Object.freeze(catalogCounts),
    seo,
    failures: Object.freeze([...new Set(failures)]),
  });
}

export { PRODUCT_CATALOGS };
