export const INDEXNOW_HOST = "mypowersetup.com";
export const INDEXNOW_ORIGIN = `https://${INDEXNOW_HOST}`;
export const INDEXNOW_KEY_FILE = "f89b37b1edc8eb20d1ef7029ac1fd280.txt";

const PUBLIC_HOME_ROUTES = Object.freeze(["/", "/sk/", "/pl/", "/hu/"]);
const SHARED_CALCULATOR_FILES = new Set([
  "styles.css",
  "src/charging.js",
  "src/engine.js",
  "src/existing-setup.js",
  "src/installation.js",
  "src/packages.js",
  "src/power-station.js",
  "src/products.js",
  "src/recommendation-coverage.js",
  "src/roof.js",
  "src/setup-url.js",
  "src/share.js",
  "src/system-diagram.js",
  "src/usage-profiles.js",
  "src/verdict.js",
  "src/wiring.js",
]);

const MARKET_HOME_FILES = Object.freeze({
  "/": new Set(["index.html", "src/app.js", "src/catalog.js", "data/products.json"]),
  "/sk/": new Set(["sk/index.html", "src/app-sk.js", "src/catalog-sk.js", "data/products-sk.json"]),
  "/pl/": new Set(["pl/index.html", "src/app-pl.js", "src/catalog-pl.js", "data/products-pl.json"]),
  "/hu/": new Set([
    "hu/index.html",
    "src/app-hu.js",
    "src/app-hu-browser.js",
    "src/catalog-hu.js",
    "src/page-hu.js",
    "src/ui-copy-hu.js",
    "data/products-hu.json",
  ]),
});

export function extractSitemapUrls(xml) {
  if (typeof xml !== "string") throw new TypeError("INDEXNOW_SITEMAP_REQUIRED");
  const urls = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim());
  return [...new Set(urls)].filter((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === INDEXNOW_HOST;
    } catch {
      return false;
    }
  });
}

export function changedFilesToIndexNowUrls(changedFiles, sitemapUrls, { forceAll = false } = {}) {
  const allowed = new Set((sitemapUrls || []).filter(isOwnedPublicUrl));
  const files = [...new Set((changedFiles || []).map(normalizeRepoPath).filter(Boolean))];
  if (forceAll || files.includes(INDEXNOW_KEY_FILE)) return [...allowed].sort();

  const selected = new Set();
  const includeRoute = (route) => {
    const url = `${INDEXNOW_ORIGIN}${route}`;
    if (allowed.has(url)) selected.add(url);
  };

  for (const file of files) {
    const staticRoute = staticHtmlPathToRoute(file);
    if (staticRoute) includeRoute(staticRoute);

    if (SHARED_CALCULATOR_FILES.has(file)) {
      for (const route of PUBLIC_HOME_ROUTES) includeRoute(route);
    }

    for (const [route, marketFiles] of Object.entries(MARKET_HOME_FILES)) {
      if (marketFiles.has(file)) includeRoute(route);
    }
  }

  return [...selected].sort();
}

export function buildIndexNowPayload(urlList, key) {
  if (!/^[A-Za-z0-9-]{8,128}$/.test(String(key || ""))) throw new Error("INDEXNOW_KEY_INVALID");
  const urls = [...new Set(urlList || [])];
  if (!urls.length) throw new Error("INDEXNOW_URLS_REQUIRED");
  if (urls.length > 10000) throw new Error("INDEXNOW_URL_LIMIT");
  if (!urls.every(isOwnedPublicUrl)) throw new Error("INDEXNOW_FOREIGN_URL");
  return Object.freeze({
    host: INDEXNOW_HOST,
    key,
    keyLocation: `${INDEXNOW_ORIGIN}/${INDEXNOW_KEY_FILE}`,
    urlList: Object.freeze(urls),
  });
}

export function isIndexNowSuccess(status) {
  return status === 200 || status === 202;
}

function staticHtmlPathToRoute(file) {
  if (file === "index.html") return "/";
  if (!file.endsWith("/index.html")) return null;
  return `/${file.slice(0, -"index.html".length)}`;
}

function normalizeRepoPath(value) {
  return String(value || "").trim().replace(/^\.\//, "").replaceAll("\\", "/");
}

function isOwnedPublicUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === INDEXNOW_HOST;
  } catch {
    return false;
  }
}
