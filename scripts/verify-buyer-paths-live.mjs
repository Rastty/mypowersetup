#!/usr/bin/env node
// Read-only public serving proof for existing CZ buyer paths.
// A successful Pages deployment is not proof the CDN serves the updated
// HTML and versioned JS. This audit does not submit forms or click offers.
import { readFile } from "node:fs/promises";
import { acceptCalculatorOffersSnapshot, acceptDcdcGuideSnapshot, acceptInverterCalculatorSnapshot } from "../src/verified-offer-catalog-fetch.js";
import { selectGuideOffers } from "../src/guide-verified-offers.js";
import { selectInverterCalculatorOffers } from "../src/inverter-calculator-offers.js";

const PRODUCTION_ORIGIN = "https://mypowersetup.com";
export const PAGES = Object.freeze([
  Object.freeze({ path: "/pruvodce/spotreba-kompresorove-lednice/", kind: "fridge_guide" }),
  Object.freeze({ path: "/pruvodce/agm-vs-lifepo4/", kind: "battery_guide" }),
  Object.freeze({ path: "/pruvodce/victron-mppt-100-20-vs-100-30-vs-100-50/", kind: "mppt_guide" }),
  Object.freeze({ path: "/kalkulacky/vydrz-baterie/", kind: "battery_runtime" }),
  Object.freeze({ path: "/kalkulacky/kapacita-baterie/", kind: "battery_capacity" }),
  Object.freeze({ path: "/kalkulacky/mppt-regulator/", kind: "mppt_calculator" }),
  Object.freeze({ path: "/kalkulacky/vykon-menice/", kind: "inverter_calculator" }),
  Object.freeze({ path: "/pruvodce/kapacita-baterie-do-karavanu/", kind: "battery_offers_guide" }),
  Object.freeze({ path: "/pruvodce/lifepo4-100ah-nebo-200ah-karavan/", kind: "battery_offers_comparison" }),
  Object.freeze({ path: "/pruvodce/jak-vybrat-mppt-regulator/", kind: "mppt_offers_guide" }),
  Object.freeze({ path: "/pruvodce/jak-vybrat-dc-dc-nabijecku/", kind: "dcdc_offers_guide" }),
  Object.freeze({ path: "/pruvodce/dc-dc-nabijecka-18a-vs-30a-vs-50a-karavan/", kind: "dcdc_offers_comparison" }),
]);
export const ASSETS = Object.freeze([
  "src/calculator-landing-browser.js",
  "src/calculator-handoff.js",
  "src/calculator-copy.js",
  "src/community-attribution.js",
  "src/analytics.js",
  "src/community-navigation.js",
  "src/battery-calculator-offers-browser.js",
  "src/battery-calculator-offers.js",
  "src/mppt-calculator-offers-browser.js",
  "src/mppt-calculator-offers.js",
  "src/inverter-calculator-offers-browser.js",
  "src/inverter-calculator-offers.js",
  "src/guide-offer-impressions.js",
  "src/guide-verified-offers.js",
  "src/calculator-offer-catalog.js",
  "src/verified-offer-catalog-fetch.js",
]);
const TRANSIENT_HTTP = new Set([429, 502, 503, 504]);
const VERSIONED_BROWSER = /<script\b[^>]*\bsrc=["'](\/src\/calculator-landing-browser\.js\?v=[^"']+)["'][^>]*>/i;
const GUIDE_WH = Object.freeze([270, 560]);
const EDITORIAL_BUYER_CATEGORIES = Object.freeze({
  "/pruvodce/kapacita-baterie-do-karavanu/": "battery",
  "/pruvodce/lifepo4-100ah-nebo-200ah-karavan/": "battery",
  "/pruvodce/jak-vybrat-mppt-regulator/": "controller",
  "/pruvodce/victron-mppt-100-20-vs-100-30-vs-100-50/": "controller",
  "/pruvodce/jak-vybrat-dc-dc-nabijecku/": "dc_charger",
  "/pruvodce/dc-dc-nabijecka-18a-vs-30a-vs-50a-karavan/": "dc_charger",
});
const EDITORIAL_VERSIONED_SCRIPT = /<script\b[^>]*\bsrc=["'](\/src\/guide-verified-offers\.js\?v=[^"']+)["'][^>]*>/gi;

function fail(code) { throw new Error(code); }
function normalText(text) { return String(text).replace(/\r\n/g, "\n").trimEnd(); }
export function checkPublicHtml(html, local, { path, kind }) {
  if (typeof html !== "string" || !html.includes("<html")) fail("PUBLIC_HTML_INVALID:" + path);
  if (!/<main\b/i.test(html)) fail("PUBLIC_MAIN_MISSING:" + path);
  if (/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html))
    fail("PUBLIC_NOINDEX:" + path);
  const canonicalHref = markup => markup.match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)/i)?.[1] || null;
  const canonical = PRODUCTION_ORIGIN + path;
  // Alternate hreflang or article links cannot substitute for canonical.
  if (canonicalHref(html) !== canonical || canonicalHref(local) !== canonical)
    fail("PUBLIC_CANONICAL_MISMATCH:" + path);
  const category = EDITORIAL_BUYER_CATEGORIES[path];
  if (category) {
    const expectedScripts = [...local.matchAll(EDITORIAL_VERSIONED_SCRIPT)].map(match => match[1]);
    const actualScripts = [...html.matchAll(EDITORIAL_VERSIONED_SCRIPT)].map(match => match[1]);
    if (expectedScripts.length !== 1 || actualScripts.length !== 1 ||
        actualScripts[0] !== expectedScripts[0])
      fail("PUBLIC_EDITORIAL_SCRIPT_VERSION_DRIFT:" + path);
    const actualCategories = [...html.matchAll(/data-guide-category=["']([^"']+)["']/g)].map(match => match[1]);
    if (actualCategories.length !== 1 || actualCategories[0] !== category)
      fail("PUBLIC_EDITORIAL_CATEGORY_DRIFT:" + path);
  }
  if (kind === "fridge_guide") {
    for (const wh of GUIDE_WH) {
      const href = '/kalkulacky/vydrz-baterie/?mps_from=fridge-guide&amp;dailyWh=' + wh;
      if (!local.includes('href="' + href + '"') || !html.includes('href="' + href + '"'))
        fail("PUBLIC_FRIDGE_SCENARIO_MISSING:" + wh);
    }
    if (!html.includes("268/557 Wh") || !html.includes("zaokrouhlili nahoru"))
      fail("PUBLIC_FRIDGE_ASSUMPTIONS_MISSING");
  }
  if (kind === "battery_guide" && !html.includes('href="/kalkulacky/vydrz-baterie/"'))
    fail("PUBLIC_BATTERY_GUIDE_LINK_MISSING");
  if (kind === "mppt_guide" && !html.includes('href="/kalkulacky/mppt-regulator/"'))
    fail("PUBLIC_MPPT_GUIDE_LINK_MISSING");
  if (kind === "battery_runtime" || kind === "mppt_calculator" || kind === "battery_capacity" || kind === "inverter_calculator") {
    const intent = kind === "battery_runtime" ? "battery-autonomy"
      : kind === "battery_capacity" ? "battery-capacity"
      : kind === "inverter_calculator" ? "inverter-sizing" : "mppt-sizing";
    if (!html.includes('data-calculator-intent="' + intent + '"') ||
        !html.includes("data-calculator-result") || !html.includes("data-calculator-form"))
      fail("PUBLIC_CALCULATOR_MISSING:" + path);
    const localScript = local.match(VERSIONED_BROWSER)?.[1];
    const liveScripts = [...html.matchAll(new RegExp(VERSIONED_BROWSER.source, "gi"))].map(m => m[1]);
    if (!localScript || liveScripts.length !== 1 || liveScripts[0] !== localScript)
      fail("PUBLIC_CALCULATOR_VERSION_DRIFT:" + path);
    if (kind === "battery_capacity" &&
        (!html.includes('data-battery-buyers') || !html.includes('data-battery-offer-list') ||
         !html.includes("Nejde o automatické potvrzení kompatibility")))
      fail("PUBLIC_BATTERY_BUYER_GUARD_MISSING");
    if (kind === "inverter_calculator" &&
        (!html.includes('data-inverter-buyers') || !html.includes('data-inverter-offer-list')
         || !html.includes("není potvrzení úplné kompatibility")))
      fail("PUBLIC_INVERTER_BUYER_GUARD_MISSING");
    if (kind === "battery_runtime" &&
        (!html.includes('name="dailyWh"') || !html.includes('name="batteryCapacityAh"') ||
         !html.includes('name="systemVoltage"') || !html.includes('name="batteryType"')))
      fail("PUBLIC_EDITABLE_BATTERY_FORM_MISSING");
    return localScript;
  }
  return null;
}

export function checkServedAsset(served, local, asset) {
  // Explicit exact source parity: minified/stale/improperly deployed JS is
  // an observable failure; only line-ending and trailing-newline normalize.
  if (normalText(served) !== normalText(local))
    fail("PUBLIC_ASSET_SOURCE_DRIFT:" + asset);
  if (asset === "src/calculator-landing-browser.js") {
    if (!served.includes('prefill.from === "fridge-guide"') ||
        !served.includes("applyCalculatorHandoffPrefill(") ||
        !served.includes("form.addEventListener(\"input\", invalidateResult)") ||
        !served.includes("form.addEventListener(\"change\", invalidateResult)"))
      fail("PUBLIC_FRIDGE_BROWSER_GUARD_MISSING");
  }
  if (asset === "src/calculator-handoff.js") {
    if (!served.includes("applyFridgeGuidePrefill(") ||
        !served.includes("readCommunityAttribution(params.toString())") ||
        !served.includes("FRIDGE_GUIDE_WH.includes(wh)"))
      fail("PUBLIC_FRIDGE_HANDOFF_GUARD_MISSING");
  }
  return true;
}

// This is a source/readback proof, not an assertion of conversion or checkout.
// Returning zero eligible offers is a valid fail-closed outcome, not a sale.
export function checkPublicCompactCatalog(served, local, now = Date.now()) {
  if (Buffer.byteLength(served, "utf8") > 12_000) fail("PUBLIC_COMPACT_CATALOG_TOO_LARGE");
  if (normalText(served) !== normalText(local)) fail("PUBLIC_COMPACT_CATALOG_SOURCE_DRIFT");
  let payload;
  try { payload = JSON.parse(served); } catch { fail("PUBLIC_COMPACT_CATALOG_INVALID_JSON"); }
  if (!acceptCalculatorOffersSnapshot(payload)) fail("PUBLIC_COMPACT_CATALOG_INVALID_SCHEMA");
  const counts = Object.fromEntries(["battery", "controller"].map(category =>
    [category, selectGuideOffers(payload, category, now).length]));
  return Object.freeze({
    path: "/data/calculator-offers-cz.json",
    bytes: Buffer.byteLength(served, "utf8"),
    reviewedProducts: payload.products.length,
    eligibleBatteryOffers: counts.battery,
    eligibleControllerOffers: counts.controller,
    generatedAt: payload.generatedAt,
    sourceStatus: payload.sources.vselektro.status,
    source: "exact",
    outboundClickVerified: false,
    commissionVerified: false,
  });
}

// This artifact intentionally appears only after the first merchant feed sync.
// Until then DC–DC guides keep their previously verified legacy full-catalog
// fallback. If committed, a stale/malformed public DC–DC view MUST fail audit.
export function checkPublicDcdcGuideCatalog(served, local, now = Date.now()) {
  if (Buffer.byteLength(served, "utf8") > 6000) fail("PUBLIC_DCDC_CATALOG_TOO_LARGE");
  if (normalText(served) !== normalText(local)) fail("PUBLIC_DCDC_CATALOG_SOURCE_DRIFT");
  let payload;
  try { payload = JSON.parse(served); } catch { fail("PUBLIC_DCDC_CATALOG_INVALID_JSON"); }
  if (!acceptDcdcGuideSnapshot(payload)) fail("PUBLIC_DCDC_CATALOG_INVALID_SCHEMA");
  return Object.freeze({
    status: "PUBLIC_DCDC_CATALOG_VERIFIED",
    path: "/data/dcdc-guide-offers-cz.json",
    bytes: Buffer.byteLength(served, "utf8"),
    reviewedProducts: payload.products.length,
    eligibleDcdcOffers: selectGuideOffers(payload, "dc_charger", now).length,
    generatedAt: payload.generatedAt,
    sourceStatus: payload.sources.vselektro.status,
    outboundClickVerified: false,
    commissionVerified: false,
  });
}

export function checkPublicInverterCatalog(served, local, now = Date.now()) {
  if (Buffer.byteLength(served, "utf8") > 8500) fail("PUBLIC_INVERTER_CATALOG_TOO_LARGE");
  if (normalText(served) !== normalText(local)) fail("PUBLIC_INVERTER_CATALOG_SOURCE_DRIFT");
  let payload;
  try { payload = JSON.parse(served); } catch { fail("PUBLIC_INVERTER_CATALOG_INVALID_JSON"); }
  if (!acceptInverterCalculatorSnapshot(payload)) fail("PUBLIC_INVERTER_CATALOG_INVALID_SCHEMA");
  return Object.freeze({
    path: "/data/inverter-calculator-offers-cz.json",
    bytes: Buffer.byteLength(served), reviewedProducts: payload.products.length,
    eligible12v400w: selectInverterCalculatorOffers(payload, { inverterWatts: 400, systemVoltage: 12 }, now).length,
    eligible24v1300w: selectInverterCalculatorOffers(payload, { inverterWatts: 1300, systemVoltage: 24 }, now).length,
    generatedAt: payload.generatedAt, sourceStatus: payload.sources.solarimport.status,
    outboundClickVerified: false, commissionVerified: false,
  });
}

async function fetchPage(fetchImpl, url, contentType, sleep, onRetry) {
  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetchImpl(url, {
      redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(20000),
      headers: { accept: contentType === "html" ? "text/html"
        : contentType === "json" ? "application/json" : "text/javascript,application/javascript,*/*",
        "user-agent": "MyPowerSetup-buyer-paths-live-proof/1.0" },
    });
    if (!TRANSIENT_HTTP.has(response.status) || attempt === 2) break;
    onRetry();
    await sleep(250 * (2 ** attempt));
  }
  if (!response.ok) fail("PUBLIC_HTTP_" + response.status + ":" + url.pathname);
  const resolved = new URL(response.url);
  if (resolved.origin !== url.origin || resolved.pathname !== url.pathname ||
      resolved.search !== url.search || resolved.hash)
    fail("PUBLIC_ROUTE_DRIFT:" + url.pathname);
  const type = response.headers.get("content-type") || "";
  if (contentType === "html" && !type.includes("text/html")) fail("PUBLIC_NON_HTML:" + url.pathname);
  if (contentType === "js" && !/(?:java|ecma)script|text\/plain/.test(type))
    fail("PUBLIC_NON_JS:" + url.pathname);
  if (contentType === "json" && !/(?:application\/json|text\/plain)/.test(type))
    fail("PUBLIC_NON_JSON:" + url.pathname);
  return response.text();
}

export async function verifyBuyerPathsLive({
  fetchImpl = fetch,
  readLocal = path => readFile(path, "utf8"),
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  origin = PRODUCTION_ORIGIN,
  now = Date.now,
} = {}) {
  const base = new URL(origin);
  if (base.href !== PRODUCTION_ORIGIN + "/") fail("PUBLIC_ORIGIN_NOT_ALLOWLISTED");
  let retries = 0;
  const checkedPages = [];
  const browserVersions = new Map();
  for (const page of PAGES) {
    const relative = page.path.slice(1) + "index.html";
    const local = await readLocal(relative);
    const publicHtml = await fetchPage(fetchImpl, new URL(page.path, base), "html", sleep, () => retries++);
    const browserScript = checkPublicHtml(publicHtml, local, page);
    if (browserScript) browserVersions.set(page.kind, browserScript);
    checkedPages.push({ path: page.path, http: 200, canonical: "exact", content: "verified" });
  }
  if (!browserVersions.has("battery_runtime") || !browserVersions.has("battery_capacity") ||
      !browserVersions.has("mppt_calculator") || !browserVersions.has("inverter_calculator"))
    fail("PUBLIC_CALCULATOR_COVERAGE_INCOMPLETE");

  const checkedAssets = [];
  const localBrowser = await readLocal("src/calculator-landing-browser.js");
  const mpptBuyer = await readLocal("src/mppt-calculator-offers-browser.js");
  const batteryBuyer = await readLocal("src/battery-calculator-offers-browser.js");
  for (const asset of ASSETS) {
    const local = await readLocal(asset);
    // Resolve the *actual* versioned import used by the served calculator
    // browser. Checking an unversioned dependency could miss stale CDN bytes.
    const dependency = ["src/calculator-handoff.js", "src/calculator-copy.js",
      "src/battery-calculator-offers-browser.js",
      "src/mppt-calculator-offers-browser.js",
      "src/inverter-calculator-offers-browser.js",
      "src/calculator-offer-catalog.js"].includes(asset);
    const importer = asset === "src/calculator-offer-catalog.js" ? batteryBuyer : localBrowser;
    const imports = [...importer.matchAll(/from ["']\.\/([^"']+)["']/g)].map(match => match[1]);
    const imported = dependency
      ? imports.find(value => value.startsWith(asset.split("/").at(-1) + "?v="))
      : null;
    if (asset === "src/calculator-offer-catalog.js" &&
        !mpptBuyer.includes(`from "./${imported}"`))
      fail("PUBLIC_BUYER_CATALOG_IMPORT_DRIFT");
    if (dependency && !imported) fail("PUBLIC_VERSIONED_IMPORT_MISSING:" + asset);
    const paths = asset === "src/calculator-landing-browser.js"
      ? [...new Set(browserVersions.values())]
      : [dependency ? "/src/" + imported : "/" + asset];
    for (const path of paths) {
      const served = await fetchPage(fetchImpl, new URL(path, base), "js", sleep, () => retries++);
      checkServedAsset(served, local, asset);
      checkedAssets.push({ asset, servedPath: path, source: "exact", http: 200 });
    }
  }
  // Independently read back the public materialized view. An approved SKU
  // in GitHub alone does not prove the live Pages CDN serves that product.
  const catalogPath = "/data/calculator-offers-cz.json";
  const publicCatalog = await fetchPage(fetchImpl, new URL(catalogPath, base), "json", sleep, () => retries++);
  const compactCatalog = checkPublicCompactCatalog(
    publicCatalog, await readLocal(catalogPath.slice(1)), now()
  );
  const dcdcPath = "/data/dcdc-guide-offers-cz.json";
  let dcdcLocal;
  try {
    dcdcLocal = await readLocal(dcdcPath.slice(1));
  } catch (error) {
    // The first scheduled merchant sync will produce this new artifact.
    // Don't falsely report an HTTP 404 as an observed available offer.
    if (error?.code !== "ENOENT") throw error;
  }
  const dcdcCatalog = dcdcLocal === undefined
    ? Object.freeze({status: "LEGACY_FULL_CATALOG_UNTIL_FIRST_SYNC", source: "not_published"})
    : checkPublicDcdcGuideCatalog(
      await fetchPage(fetchImpl, new URL(dcdcPath, base), "json", sleep, () => retries++),
      dcdcLocal, now()
    );
  const inverterPath = "/data/inverter-calculator-offers-cz.json";
  const inverterCatalog = checkPublicInverterCatalog(
    await fetchPage(fetchImpl, new URL(inverterPath, base), "json", sleep, () => retries++),
    await readLocal(inverterPath.slice(1)), now()
  );
  return Object.freeze({
    status: "PUBLIC_BUYER_HTML_JS_AND_CATALOG_VERIFIED",
    origin: base.origin, pages: checkedPages, assets: checkedAssets,
    browserVersions: Object.fromEntries(browserVersions),
    compactCatalog,
    dcdcCatalog,
    inverterCatalog,
    transientRetries: retries,
    browserInteractionsVerified: false,
    seoUpliftMeasured: false,
    productionActions: 0,
  });
}

if (process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href) {
  try {
    const report = await verifyBuyerPathsLive();
    console.log("BUYER_PATHS_LIVE_READBACK " + JSON.stringify(report));
  } catch (error) {
    console.error("BUYER_PATHS_LIVE_READBACK " + JSON.stringify({
      status: "NOT_VERIFIED",
      reason: String(error?.message || error).slice(0, 200),
      productionActions: 0,
    }));
    process.exitCode = 1;
  }
}
