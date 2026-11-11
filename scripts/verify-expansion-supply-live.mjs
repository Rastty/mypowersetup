#!/usr/bin/env node
// Read-only public proof for PT/RO/SI buyer outcome instrumentation.
// A GitHub Pages "deploy: success" alone cannot prove that the CDN serves the
// new calculator JS + outcome dependency. This neither submits forms nor
// clicks/loads merchant links, and it cannot certify GA4 delivery or revenue.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROUTES = Object.freeze(["/pt/", "/ro/", "/si/"]);
const DEFAULT_ORIGIN = "https://mypowersetup.com";
const BROWSER_ASSET = "src/expansion-calculator-browser.js";
const SUPPLY_ASSET = "src/expansion-supply-evidence.js";
const PRICE_ASSET = "src/expansion-line-price.js";
const ROLES_ASSET = "src/expansion-recommendation-roles.js";
const COMPONENT_ASSET = "src/expansion-component-recommendations.js";
const SCRIPT_PATTERN = /<script\b[^>]*\bsrc=["'](\/src\/expansion-calculator-browser\.js\?v=[^"']+)["'][^>]*>/gi;
const MODULE_PATTERN = /from ["']\.\/expansion-supply-evidence\.js\?v=([^"']+)["']/g;
const TEMPORARY = new Set([429, 502, 503, 504]);

function fail(label) { throw new Error("EXPANSION_PUBLIC_" + label); }
function normalize(source) { return String(source).replace(/\r\n/g, "\n").trimEnd(); }
function expectedScript(html, market) {
  const scripts = [...html.matchAll(SCRIPT_PATTERN)].map(row => row[1]);
  if (scripts.length !== 1) fail("SCRIPT_COUNT_" + market);
  return scripts[0];
}
function expectedSupplyImport(source) {
  const matches = [...source.matchAll(MODULE_PATTERN)].map(row => row[1]);
  if (matches.length !== 1 || !/^\d{8}-[a-z0-9-]+$/.test(matches[0]))
    fail("SUPPLY_DEPENDENCY_VERSION_DRIFT");
  return "/src/expansion-supply-evidence.js?v=" + matches[0];
}

function expectedVersionedImport(source, filename) {
  const matches = [...source.matchAll(/from ["']\.\/([a-z-]+\.js)\?v=([0-9]{8}-[a-z0-9-]+)["']/g)]
    .filter((match) => match[1] === filename);
  if (matches.length !== 1) fail("PRICE_DEPENDENCY_VERSION_DRIFT");
  return "/src/" + filename + "?v=" + matches[0][2];
}

function expectedMarketModule(source, market) {
  if (!["pt", "ro", "si"].includes(market)) fail("MARKET_INVALID");
  const pattern = new RegExp('import\\("\\./' + market + '-recommendations\\.js\\?v=([0-9]{8}-[a-z0-9-]+)"\\)', "g");
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) fail("MARKET_MODULE_VERSION_DRIFT:" + market);
  return "/src/" + market + "-recommendations.js?v=" + matches[0][1];
}

function expectedComponentModule(source) {
  const matches = [...source.matchAll(/from ["']\.\/expansion-component-recommendations\.js\?v=([0-9]{8}-[a-z0-9-]+)["']/g)];
  if (matches.length !== 2 || matches[0][1] !== matches[1][1])
    fail("SHARED_COMPONENT_VERSION_DRIFT");
  return "/src/expansion-component-recommendations.js?v=" + matches[0][1];
}

export function verifyExpansionSourceJavascript(served, local, kind) {
  if (normalize(served) !== normalize(local)) fail("SOURCE_JS_SOURCE_DRIFT:" + kind);
  const markers = kind === "component" ? [
    "export function hasExpansionSourceGaps(catalog)",
    "hasCurrentRecommendationSource(product, catalog.sources)",
    "}, limitPerCategory, sources);",
  ] : ["pt", "ro", "si"].includes(kind) ? [
    "hasCurrentRecommendationSource(product, ",
    "buildExpansionComponentRecommendations(",
    "hasExpansionSourceGaps",
  ] : [];
  if (!markers.length || !markers.every(marker => served.includes(marker)))
    fail("SOURCE_HEALTH_GUARD_MISSING:" + kind);
  return true;
}

export function verifyExpansionHtml(served, local, market) {
  if (!["pt", "ro", "si"].includes(market)) fail("UNKNOWN_MARKET");
  if (!/<html\b/i.test(served) || !served.includes("data-expansion-calculator"))
    fail("CALCULATOR_HTML_MISSING_" + market);
  const canonical = `<link rel="canonical" href="https://mypowersetup.com/${market}/">`;
  if (!local.includes(canonical) || !served.includes(canonical))
    fail("CANONICAL_DRIFT_" + market);
  const script = expectedScript(local, market);
  if (expectedScript(served, market) !== script) fail("SCRIPT_VERSION_DRIFT_" + market);
  return script;
}

export function verifyExpansionJavascript(served, local) {
  if (normalize(served) !== normalize(local)) fail("CALCULATOR_JS_SOURCE_DRIFT");
  const required = [
    "trackCatalogUnavailable()",
    "data-recommendation-unavailable",
    "classifyExpansionSupplyOutcome(priority)",
    'track(expansionSupplyEventName(classifyExpansionSupplyOutcome(priority)), { market: locale })',
    "Não conseguimos carregar agora as ofertas verificadas",
    "Nu putem încărca momentan ofertele verificate",
    "Trenutno ni mogoče naložiti preverjenih ponudb",
  ];
  if (!required.every(marker => served.includes(marker))) fail("CALCULATOR_SUPPLY_EVENT_MISSING");
  return expectedSupplyImport(served);
}

export function verifyExpansionPriceJavascript(served, local, kind) {
  if (normalize(served) !== normalize(local)) fail("PRICE_JS_SOURCE_DRIFT:" + kind);
  const markers = kind === "line" ? [
    "export function expansionLinePrice(item)",
    "unitPrice: item.price",
    "totalPrice",
    'item.category === "solar_panel"',
  ] : kind === "roles" ? [
    "import { expansionLinePrice }",
    "const line = expansionLinePrice(item)",
    "price: line.totalPrice",
  ] : [];
  if (!markers.length || !markers.every(marker => served.includes(marker)))
    fail("PRICE_COMPARISON_GUARD_MISSING:" + kind);
  return true;
}

export function verifyExpansionSupplyJavascript(served, local) {
  if (normalize(served) !== normalize(local)) fail("SUPPLY_JS_SOURCE_DRIFT");
  for (const event of [
    "expansion_supply_complete", "expansion_supply_inverter_missing",
    "expansion_supply_other_missing", "expansion_supply_unavailable",
  ]) if (!served.includes(event)) fail("SUPPLY_OUTCOME_EVENT_MISSING");
  if (!served.includes('coverage.missing.includes("inverter")'))
    fail("SUPPLY_CLASSIFIER_MISSING");
  return true;
}

async function fetchProof(url, type, fetchImpl, sleep) {
  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetchImpl(url, {
      redirect: "follow", cache: "no-store",
      signal: AbortSignal.timeout(20000),
      headers: { accept: type === "html" ? "text/html" : "text/javascript,application/javascript,*/*",
        "user-agent": "MyPowerSetup-expansion-supply-proof/1.0" },
    });
    if (!TEMPORARY.has(response.status) || attempt === 2) break;
    await sleep(250 * 2 ** attempt);
  }
  if (!response?.ok) fail("HTTP_" + (response?.status || "ERROR"));
  const actual = new URL(response.url || "");
  if (actual.href !== url.href) fail("REDIRECT_DRIFT");
  const mime = response.headers?.get("content-type") || "";
  if (type === "html" ? !mime.includes("text/html") :
    !/(?:java|ecma)script|text\/plain/.test(mime)) fail("MIME_DRIFT");
  return response.text();
}

export async function verifyExpansionSupplyLive({
  origin = DEFAULT_ORIGIN,
  fetchImpl = fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  readLocal = path => readFile(new URL("../" + path, import.meta.url), "utf8"),
} = {}) {
  const base = new URL(origin);
  if (base.protocol !== "https:" || base.pathname !== "/" || base.search || base.hash)
    fail("ORIGIN_INVALID");
  const pages = [];
  let browserScript = null;
  for (const route of ROUTES) {
    const market = route.split("/")[1];
    const htmlPath = market + "/index.html";
    const [local, served] = await Promise.all([
      readLocal(htmlPath),
      fetchProof(new URL(route, base), "html", fetchImpl, sleep),
    ]);
    const script = verifyExpansionHtml(served, local, market);
    if (browserScript && browserScript !== script) fail("CROSS_MARKET_VERSION_DRIFT");
    browserScript = script;
    pages.push(Object.freeze({ market, path: route, script, checked: true }));
  }
  const localBrowser = await readLocal(BROWSER_ASSET);
  const servedBrowser = await fetchProof(new URL(browserScript, base), "js", fetchImpl, sleep);
  const importUrl = verifyExpansionJavascript(servedBrowser, localBrowser);
  const priceUrl = expectedVersionedImport(servedBrowser, "expansion-line-price.js");
  const rolesUrl = expectedVersionedImport(servedBrowser, "expansion-recommendation-roles.js");
  const localSupply = await readLocal(SUPPLY_ASSET);
  const servedSupply = await fetchProof(new URL(importUrl, base), "js", fetchImpl, sleep);
  verifyExpansionSupplyJavascript(servedSupply, localSupply);
  const localPrice = await readLocal(PRICE_ASSET);
  const servedPrice = await fetchProof(new URL(priceUrl, base), "js", fetchImpl, sleep);
  verifyExpansionPriceJavascript(servedPrice, localPrice, "line");
  const localRoles = await readLocal(ROLES_ASSET);
  const servedRoles = await fetchProof(new URL(rolesUrl, base), "js", fetchImpl, sleep);
  verifyExpansionPriceJavascript(servedRoles, localRoles, "roles");
  // Validate the actual *served* merchant-specific recommendation modules, not
  // just the entrypoint: the live catalog must not expose stale-source offers.
  const marketModules = [];
  let componentUrl = null;
  for (const market of ["pt", "ro", "si"]) {
    const moduleUrl = expectedMarketModule(servedBrowser, market);
    const path = "src/" + market + "-recommendations.js";
    const [localModule, servedModule] = await Promise.all([
      readLocal(path),
      fetchProof(new URL(moduleUrl, base), "js", fetchImpl, sleep),
    ]);
    verifyExpansionSourceJavascript(servedModule, localModule, market);
    const shared = expectedComponentModule(servedModule);
    if (componentUrl && componentUrl !== shared) fail("CROSS_MARKET_COMPONENT_MODULE_DRIFT");
    componentUrl = shared;
    marketModules.push(Object.freeze({ market, script: moduleUrl, sourceParity: true }));
  }
  const [localComponent, servedComponent] = await Promise.all([
    readLocal(COMPONENT_ASSET),
    fetchProof(new URL(componentUrl, base), "js", fetchImpl, sleep),
  ]);
  verifyExpansionSourceJavascript(servedComponent, localComponent, "component");
  return Object.freeze({
    status: "verified_served_assets",
    pages,
    browserScript,
    supplyScript: importUrl,
    priceScript: priceUrl,
    rolesScript: rolesUrl,
    marketModules: Object.freeze(marketModules),
    componentScript: componentUrl,
    sourceParity: true,
    ga4EventsObserved: false,
    purchaseOrCommissionVerified: false,
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyExpansionSupplyLive().then(
    result => console.log(JSON.stringify(result, null, 2)),
    error => { console.error(error.message); process.exitCode = 1; },
  );
}
