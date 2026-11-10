#!/usr/bin/env node
// Read-only production proof for the two existing CZ electrical calculators.
// A Pages deploy or HTML parity success alone cannot establish that the served
// JavaScript invalidates an old sizing result after electrical input changes.
const DEFAULT_ORIGIN = "https://mypowersetup.com";
export const ROUTES = Object.freeze([
  { path: "/kalkulacky/dc-dc-nabijecka/", intent: "dcdc-sizing" },
  { path: "/kalkulacky/jisteni-12v/", intent: "dc-protection" },
]);
export const VERSION = "20261110-coverage1";
export const SCRIPT_PATH = "/src/phase2-calculator-browser.js";
export const BUYER_SCRIPT = "/src/dcdc-calculator-offers-browser.js?v=20261110-coverage1";
export const IMPRESSION_SCRIPT = "/src/guide-offer-impressions.js?v=20261110-drive-variant2";
export const MODEL_SCRIPT = "/src/dcdc-calculator-offers.js?v=20261110-outcome1";

// Retry only temporary HTTP availability failures. A wrong route, invalid content,
// stale client JS or a persistent 503 must still fail the production proof.
const RETRYABLE_HTTP = new Set([429, 502, 503, 504]);
async function fetchWithTransientRetry(url, options, fetchImpl, sleep, onRetry) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetchImpl(url, options);
    if (!RETRYABLE_HTTP.has(response.status) || attempt === 2) return response;
    onRetry();
    await sleep(250 * (2 ** attempt));
  }
}

function requireExactPage(response, origin, path) {
  if (!response.ok) throw new Error("PUBLIC_HTTP_" + response.status);
  const expected = new URL(path, origin);
  const actual = new URL(response.url);
  if (actual.origin !== expected.origin || actual.pathname !== expected.pathname || actual.search !== expected.search || actual.hash)
    throw new Error("PUBLIC_ROUTE_DRIFT");
}

export function checkHtml(html, { intent }) {
  if (!/<p\b[^>]*\bdata-calculator-stale(?:\s|>|=)/i.test(html))
    throw new Error("STALE_NOTICE_MISSING");
  if (!html.includes('data-calculator-intent="' + intent + '"'))
    throw new Error("CALCULATOR_INTENT_MISMATCH");
  if (!html.includes('data-calculator-result'))
    throw new Error("RESULT_PANEL_MISSING");
  if (intent === "dcdc-sizing" &&
      (!html.includes("data-dcdc-buyers") || !html.includes("data-dcdc-offer-list") ||
       !html.includes("nikoli potvrzení kompatibility")))
    throw new Error("DCDC_VERIFIED_BUYER_SLOT_MISSING");
  const scriptTags = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
  const expected = SCRIPT_PATH + "?v=" + VERSION;
  if (scriptTags.filter(src => src === expected).length !== 1)
    throw new Error("VERSIONED_CALCULATOR_SCRIPT_MISSING");
  return expected;
}

export function checkJavascript(source) {
  // This verifies the *served* browser code, not merely the Git commit.
  // Browser interaction is a separate proof layer; do not claim it here.
  const required = [
    /function\s+invalidateResult\s*\(/,
    /resultPanel\.hidden\s*=\s*true/,
    /staleNotice\.hidden\s*=\s*false/,
    /clearCalculatorResultContext\s*\(/,
    /form\.addEventListener\(\s*["']input["']\s*,\s*invalidateResult\s*\)/,
    /form\.addEventListener\(\s*["']change["']\s*,\s*invalidateResult\s*\)/,
    /form\.addEventListener\(\s*["']submit["']/,
    /dcdcBuyers\?\.invalidate\(\)/,
    /dcdcBuyers\?\.update\(result\)/,
    /dcdc-calculator-offers-browser\.js\?v=20261110-coverage1/,
  ];
  if (!required.every(pattern => pattern.test(source))) throw new Error("SERVED_JS_STALE_GUARD_MISSING");
  return true;
}

// The new direct comparison must be served at the exact versioned import
// referenced by the phase-2 browser. Main JS parity alone cannot prove
// the module graph reaches the shopper's browser.
export function checkBuyerJavascript(source) {
  const required = [
    /loadDcdcGuideOffers\(/,
    /selectDcdcCalculatorOffers\(/,
    /isDcdcOfferStillEligible\(/,
    /dcdcOfferDriveTime\(/,
    /classifyDcdcOfferOutcome\(/,
    /trackOutcome\(/,
    /explicit: false/,
    /dcdc_offers_/,

    /dcdc-calculator-offers\.js\?v=20261110-drivefit1/,
    /dcdcTimeFit/,
    /ctaVariant/,
    /guide-offer-impressions\.js\?v=20261110-drive-variant2/,
    /buildAttributedAffiliateParameters\(/,
    /allowedSources:\s*\["dcdc-calculator-compare"\]/,
    /event\.preventDefault\(\)/,
  ];
  if (!required.every(pattern => pattern.test(source)))
    throw new Error("SERVED_DCDC_BUYER_GUARD_MISSING");
  return true;
}

// The browser's compared charge-time math must also be served from the exact
// versioned dependency. A stale CDN model must never silently disagree with
// the new per-product target-fit messages.
export function checkModelJavascript(source) {
  const required = [
    /export function dcdcOfferDriveTime\(/,
    /export function classifyDcdcOfferOutcome\(/,
    /guideCatalogFresh\(/,
    /"no_safe_match"/,

    /const neededAh = batteryAh \* replenishPercent \/ 100/,
    /const minimumHours = neededAh \/ outputA/,
    /displayedMinimumHours: Math\.ceil\(/,
    /meetsIdealTarget: neededAh <= outputA \* targetDriveHours/,
  ];
  if (!required.every(pattern => pattern.test(source)))
    throw new Error("SERVED_DCDC_TIMING_MODEL_MISSING");
  return true;
}

// The new SKU + drive-time variant deduplication must be in the actual
// served browser dependency, not just in a GitHub source file or mock test.
export function checkImpressionJavascript(source) {
  const required = [
    /params\.source === "dcdc-calculator-compare"/,
    /params\.ctaVariant === "dcdc-ideal-target-only"/,
    /params\.ctaVariant === "dcdc-longer-drive"/,
    /const key = JSON\.stringify\(\[params\.source, params\.merchant, params\.category, params\.productId, variant\]\)/,
    /counted\.has\(key\)/,
  ];
  if (!required.every(pattern => pattern.test(source)))
    throw new Error("SERVED_DCDC_VARIANT_IMPRESSIONS_MISSING");
  return true;
}

export async function verifyLive({ fetchImpl = fetch, origin = DEFAULT_ORIGIN,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const base = new URL(origin);
  if (base.protocol !== "https:" || base.pathname !== "/" || base.search || base.hash)
    throw new Error("INVALID_PRODUCTION_ORIGIN");
  const results = [];
  let servedJs = null;
  let transientRetries = 0;
  const onRetry = () => { transientRetries++; };
  for (const route of ROUTES) {
    const response = await fetchWithTransientRetry(new URL(route.path, base), {
      redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(20000),
      headers: { accept: "text/html", "user-agent": "MyPowerSetup-phase2-live-proof/1.0" },
    }, fetchImpl, sleep, onRetry);
    requireExactPage(response, base, route.path);
    if (!response.headers.get("content-type")?.includes("text/html"))
      throw new Error("PUBLIC_NON_HTML");
    const html = await response.text();
    const script = checkHtml(html, route);
    if (servedJs === null) {
      const jsResponse = await fetchWithTransientRetry(new URL(script, base), {
        redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(20000),
        headers: { accept: "text/javascript,application/javascript,*/*", "user-agent": "MyPowerSetup-phase2-live-proof/1.0" },
      }, fetchImpl, sleep, onRetry);
      requireExactPage(jsResponse, base, script);
      servedJs = await jsResponse.text();
      checkJavascript(servedJs);
    }
    results.push({ path: route.path, intent: route.intent, http: response.status, version: VERSION, htmlMarker: true, servedJsGuard: true });
  }
  const buyerResponse = await fetchWithTransientRetry(new URL(BUYER_SCRIPT, base), {
    redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(20000),
    headers: { accept: "text/javascript,application/javascript,*/*", "user-agent": "MyPowerSetup-phase2-live-proof/1.0" },
  }, fetchImpl, sleep, onRetry);
  requireExactPage(buyerResponse, base, BUYER_SCRIPT);
  if (!/(?:java|ecma)script|text\/plain/.test(buyerResponse.headers.get("content-type") || ""))
    throw new Error("PUBLIC_NON_JS");
  checkBuyerJavascript(await buyerResponse.text());
  const impressionResponse = await fetchWithTransientRetry(new URL(IMPRESSION_SCRIPT, base), {
    redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(20000),
    headers: { accept: "text/javascript,application/javascript,*/*", "user-agent": "MyPowerSetup-phase2-live-proof/1.0" },
  }, fetchImpl, sleep, onRetry);
  requireExactPage(impressionResponse, base, IMPRESSION_SCRIPT);
  if (!/(?:java|ecma)script|text\/plain/.test(impressionResponse.headers.get("content-type") || ""))
    throw new Error("PUBLIC_NON_JS");
  checkImpressionJavascript(await impressionResponse.text());
  const modelResponse = await fetchWithTransientRetry(new URL(MODEL_SCRIPT, base), {
    redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(20000),
    headers: { accept: "text/javascript,application/javascript,*/*", "user-agent": "MyPowerSetup-phase2-live-proof/1.0" },
  }, fetchImpl, sleep, onRetry);
  requireExactPage(modelResponse, base, MODEL_SCRIPT);
  if (!/(?:java|ecma)script|text\/plain/.test(modelResponse.headers.get("content-type") || ""))
    throw new Error("PUBLIC_NON_JS");
  checkModelJavascript(await modelResponse.text());
  return { status: "PUBLIC_HTML_AND_SERVED_JS_VERIFIED", origin: base.origin, routes: results,
    buyerModuleVersion: BUYER_SCRIPT, buyerModuleVerified: true,
    impressionModuleVersion: IMPRESSION_SCRIPT, impressionModuleVerified: true,
    modelModuleVersion: MODEL_SCRIPT, modelModuleVerified: true,
    browserInteractionVerified: false, affiliateOrRevenueEffectVerified: false, transientRetries, productionActions: 0 };
}

if (process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href) {
  try {
    console.log("PHASE2_STALE_PUBLIC_READBACK " + JSON.stringify(await verifyLive()));
  } catch (error) {
    console.error("PHASE2_STALE_PUBLIC_READBACK " + JSON.stringify({
      status: "NOT_VERIFIED", reason: String(error?.message || error).slice(0, 120), productionActions: 0,
    }));
    process.exitCode = 1;
  }
}
