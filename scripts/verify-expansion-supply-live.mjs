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
  const localSupply = await readLocal(SUPPLY_ASSET);
  const servedSupply = await fetchProof(new URL(importUrl, base), "js", fetchImpl, sleep);
  verifyExpansionSupplyJavascript(servedSupply, localSupply);
  return Object.freeze({
    status: "verified_served_assets",
    pages,
    browserScript,
    supplyScript: importUrl,
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
