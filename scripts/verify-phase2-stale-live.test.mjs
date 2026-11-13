import test from "node:test";
import assert from "node:assert/strict";
import { checkHtml, checkJavascript, checkBuyerJavascript, checkModelJavascript, checkImpressionJavascript, verifyLive, ROUTES, VERSION } from "./verify-phase2-stale-live.mjs";

const origin = "https://mypowersetup.com";
const js = [
  "function invalidateResult() {",
  "  resultPanel.hidden = true;",
  "  staleNotice.hidden = false;",
  "  clearCalculatorResultContext({sourcePath: landingPath});",
  "}",
  'form.addEventListener("input", invalidateResult);',
  'form.addEventListener("change", invalidateResult);',
  'form.addEventListener("submit", (event) => render(event));',
  'dcdcBuyers?.invalidate();',
  'void dcdcBuyers?.update(result);',
  'import { mountDcdcCalculatorBuyers } from "./dcdc-calculator-offers-browser.js?v=20261113-cz-affiliate-subid1";',
].join("\n");
const buyerJs = [
  "loadDcdcGuideOffers(fetchImpl);",
  "selectDcdcCalculatorOffers(payload, result, now());",
  "isDcdcOfferStillEligible(payload, result, offer, now());",
  'import { dcdcOfferDriveTime } from "./dcdc-calculator-offers.js?v=20261110-outcome1";',
  "dcdcOfferDriveTime(result, offer);",
  "classifyDcdcOfferOutcome(payload, result, now());",
  'const noMatch = "žádný se nevejde do bezpečného proudového limitu";',
  'const feedMissing = "Aktuální ceny a dostupnost nelze bezpečně ověřit";',
  'function trackOutcome(outcome, explicit) {',
  '  windowRoot?.MyPowerSetupAnalytics?.track?.("dcdc_offers_" + outcome);',
  '  if (!documentRoot.hidden && active) void update(active, { explicit: false });',
  'import { createVerifiedGuideImpressionTracker } from "./guide-offer-impressions.js?v=20261110-drive-variant2";',
  'timingLine.dataset.dcdcTimeFit = "too-slow";',
  'link.dataset.ctaVariant = "dcdc-longer-drive";',
  "buildAttributedAffiliateParameters(link);",
  'link.href = decorateAwinAffiliateUrl(offer.affiliateUrl, { market: "cz", category: "dc_charger" });',
  'allowedSources: ["dcdc-calculator-compare"]',
  "event.preventDefault();",
].join("\n");
const impressionJs = [
  'const variant = params.source === "dcdc-calculator-compare"',
  '  ? (params.ctaVariant === "dcdc-ideal-target-only"',
  '    || params.ctaVariant === "dcdc-longer-drive" ? params.ctaVariant : null)',
  '  : "";',
  'const key = JSON.stringify([params.source, params.merchant, params.category, params.productId, variant]);',
  'if (counted.has(key)) continue;',
].join("\n");
const modelJs = [
  "export function dcdcOfferDriveTime(result, offer) {",
  "export function classifyDcdcOfferOutcome(payload, result, now) {",
  "  if (!guideCatalogFresh(payload, now)) return 'unavailable';",
  '  return "no_safe_match";',
  "  const neededAh = batteryAh * replenishPercent / 100;",
  "  const minimumHours = neededAh / outputA;",
  "  return { displayedMinimumHours: Math.ceil(minimumHours * 10) / 10,",
  "    meetsIdealTarget: neededAh <= outputA * targetDriveHours };",
  "}",
].join("\n");
function html(intent, version = VERSION) {
  return '<!doctype html><html><body><div data-calculator-intent="' + intent + '">'
    + '<p data-calculator-stale role="status" hidden>Recalculate</p>'
    + '<div data-calculator-result></div></div>'
    + (intent === "dcdc-sizing" ? '<section data-dcdc-buyers><ul data-dcdc-offer-list></ul><p>nikoli potvrzení kompatibility</p></section>' : "")
    + '<script type="module" src="/src/phase2-calculator-browser.js?v=' + version + '"></script>'
    + '</body></html>';
}
function mockResponse(url, body, type = "text/html", status = 200) {
  return { url, status, ok: status >= 200 && status < 300,
    headers: { get(name) { return name === "content-type" ? type : null; } },
    async text() { return body; } };
}
function mockFetch({ wrongRedirect = false, staleHtml = false, staleJs = false, staleBuyerJs = false, staleModelJs = false, staleImpressionJs = false } = {}) {
  const calls = [];
  const fn = async input => {
    const url = String(input);
    calls.push(url);
    if (url.includes("phase2-calculator-browser.js")) return mockResponse(url,
      staleJs ? 'form.addEventListener("submit",()=>{});' : js, "text/javascript");
    if (url.includes("dcdc-calculator-offers-browser.js")) return mockResponse(url,
      staleBuyerJs ? 'function unsafeBuyer() {}' : buyerJs, "text/javascript");
    if (url.includes("guide-offer-impressions.js")) return mockResponse(url,
      staleImpressionJs ? "function oldImpression() {}" : impressionJs, "text/javascript");
    if (url.includes("dcdc-calculator-offers.js")) return mockResponse(url,
      staleModelJs ? 'function unknown() {}' : modelJs, "text/javascript");
    const route = ROUTES.find(item => url.endsWith(item.path));
    assert.ok(route, "unexpected request " + url);
    return mockResponse(wrongRedirect ? origin + "/" : url,
      html(route.intent, staleHtml ? "old" : VERSION));
  };
  fn.calls = calls;
  return fn;
}
test("both actual CZ routes and the same served versioned JS are verified", async () => {
  const fetchImpl = mockFetch();
  const result = await verifyLive({ fetchImpl });
  assert.equal(result.status, "PUBLIC_HTML_AND_SERVED_JS_VERIFIED");
  assert.equal(result.routes.length, 2);
  assert.equal(result.productionActions, 0);
  assert.equal(result.browserInteractionVerified, false);
  assert.equal(fetchImpl.calls.length, 6);
  assert.equal(result.buyerModuleVerified, true);
  assert.equal(result.modelModuleVerified, true);
  assert.equal(result.impressionModuleVerified, true);
  assert.ok(result.buyerModuleVersion.includes("dcdc-calculator-offers-browser.js?v=" + VERSION));
  assert.ok(fetchImpl.calls.some(url => url.endsWith("?v=" + VERSION)));
});
test("rejects stale HTML version and missing recalculation prompt", async () => {
  await assert.rejects(verifyLive({ fetchImpl: mockFetch({ staleHtml: true }) }), /VERSIONED_CALCULATOR_SCRIPT_MISSING/);
  assert.throws(() => checkHtml(html("dcdc-sizing").replace("data-calculator-stale", "data-stale-removed"),
    { intent: "dcdc-sizing" }), /STALE_NOTICE_MISSING/);
});
test("rejects wrong public route or stale JS", async () => {
  await assert.rejects(verifyLive({ fetchImpl: mockFetch({ wrongRedirect: true }) }), /PUBLIC_ROUTE_DRIFT/);
  await assert.rejects(verifyLive({ fetchImpl: mockFetch({ staleJs: true }) }), /SERVED_JS_STALE_GUARD_MISSING/);
  assert.throws(() => checkJavascript(js.replace('form.addEventListener("change", invalidateResult);', "")),
    /SERVED_JS_STALE_GUARD_MISSING/);
});
test("requires both electrical calculator intents and exact script version", () => {
  assert.throws(() => checkHtml(html("dcdc-sizing"), { intent: "dc-protection" }), /CALCULATOR_INTENT_MISMATCH/);
  assert.equal(checkHtml(html("dc-protection"), { intent: "dc-protection" }),
    "/src/phase2-calculator-browser.js?v=" + VERSION);
});

// A single transient outage should not create a false negative, but repeated
// failures and semantic regressions must not be hidden by the retry layer.
test("recovers from one HTTP 503 on a page without skipping either route", async () => {
  const baseFetch = mockFetch();
  const calls = [];
  const delays = [];
  let failed = false;
  const result = await verifyLive({
    sleep: async ms => { delays.push(ms); },
    fetchImpl: async input => {
      const url = String(input);
      calls.push(url);
      if (!failed && url.endsWith(ROUTES[0].path)) {
        failed = true;
        return mockResponse(url, "Unavailable", "text/html", 503);
      }
      return baseFetch(input);
    },
  });
  assert.equal(result.status, "PUBLIC_HTML_AND_SERVED_JS_VERIFIED");
  assert.equal(result.transientRetries, 1);
  assert.deepEqual(delays, [250]);
  assert.equal(calls.length, 7);
  assert.equal(result.routes.length, 2);
});

test("recovers from a temporary HTTP 502 on versioned JS", async () => {
  const baseFetch = mockFetch();
  let jsAttempts = 0;
  const result = await verifyLive({ sleep: async () => {}, fetchImpl: async input => {
    const url = String(input);
    if (url.includes("phase2-calculator-browser.js") && ++jsAttempts === 1)
      return mockResponse(url, "Bad Gateway", "text/plain", 502);
    return baseFetch(input);
  } });
  assert.equal(jsAttempts, 2);
  assert.equal(result.transientRetries, 1);
  assert.equal(result.routes.length, 2);
});

test("permanent 503 fails after bounded retries", async () => {
  const calls = [];
  const delays = [];
  await assert.rejects(verifyLive({
    sleep: async ms => { delays.push(ms); },
    fetchImpl: async input => {
      calls.push(String(input));
      return mockResponse(String(input), "Unavailable", "text/html", 503);
    },
  }), /PUBLIC_HTTP_503/);
  assert.equal(calls.length, 3);
  assert.deepEqual(delays, [250, 500]);
});

test("404 is not retried and semantic regressions still fail", async () => {
  let calls = 0;
  await assert.rejects(verifyLive({
    sleep: async () => { throw new Error("must not sleep"); },
    fetchImpl: async input => {
      calls++;
      return mockResponse(String(input), "Missing", "text/html", 404);
    },
  }), /PUBLIC_HTTP_404/);
  assert.equal(calls, 1);
  const invalid = mockFetch({ staleJs: true });
  await assert.rejects(verifyLive({ fetchImpl: invalid,
    sleep: async () => { throw new Error("must not retry stale JS"); } }), /SERVED_JS_STALE_GUARD_MISSING/);
  assert.equal(invalid.calls.length, 2);
});

test("missing DC-DC buyer or stale served buyer JS cannot be misreported as deployed", async () => {
  assert.throws(() => checkHtml(html("dcdc-sizing").replace("data-dcdc-offer-list", "broken-list"),
    { intent: "dcdc-sizing" }), /DCDC_VERIFIED_BUYER_SLOT_MISSING/);
  assert.throws(() => checkBuyerJavascript("function unsafeBuyer() {}"),
    /SERVED_DCDC_BUYER_GUARD_MISSING/);
  const invalid = mockFetch({ staleBuyerJs: true });
  await assert.rejects(verifyLive({ fetchImpl: invalid }),
    /SERVED_DCDC_BUYER_GUARD_MISSING/);
  assert.equal(invalid.calls.length, 4);
});


test("missing served sizing module never passes the live buyer comparison proof", async () => {
  const mock = mockFetch({ staleModelJs: true });
  await assert.rejects(verifyLive({ fetchImpl: mock }), /SERVED_DCDC_TIMING_MODEL_MISSING/);
  assert.equal(mock.calls.length, 6);
  assert.throws(() => checkModelJavascript("export function dcdcOfferDriveTime() {}"),
    /SERVED_DCDC_TIMING_MODEL_MISSING/);
});


test("direct DC-DC production proof rejects old browser impression deduplication", async () => {
  const mock = mockFetch({ staleImpressionJs: true });
  await assert.rejects(verifyLive({ fetchImpl: mock }),
    /SERVED_DCDC_VARIANT_IMPRESSIONS_MISSING/);
  assert.equal(mock.calls.length, 5, "the new impression dependency fails before model evidence");
  assert.throws(() => checkImpressionJavascript('const key = params.productId;'),
    /SERVED_DCDC_VARIANT_IMPRESSIONS_MISSING/);
});

test("served buyer proof rejects either missing actionable no-offer explanation", () => {
  assert.throws(() => checkBuyerJavascript(buyerJs.replace("žádný se nevejde do bezpečného proudového limitu", "obecná zpráva")),
    /SERVED_DCDC_BUYER_GUARD_MISSING/);
  assert.throws(() => checkBuyerJavascript(buyerJs.replace("Aktuální ceny a dostupnost nelze bezpečně ověřit", "obecná zpráva")),
    /SERVED_DCDC_BUYER_GUARD_MISSING/);
});
