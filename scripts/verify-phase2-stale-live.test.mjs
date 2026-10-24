import test from "node:test";
import assert from "node:assert/strict";
import { checkHtml, checkJavascript, verifyLive, ROUTES, VERSION } from "./verify-phase2-stale-live.mjs";

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
].join("\n");
function html(intent, version = VERSION) {
  return '<!doctype html><html><body><div data-calculator-intent="' + intent + '">'
    + '<p data-calculator-stale role="status" hidden>Recalculate</p>'
    + '<div data-calculator-result></div></div>'
    + '<script type="module" src="/src/phase2-calculator-browser.js?v=' + version + '"></script>'
    + '</body></html>';
}
function mockResponse(url, body, type = "text/html", status = 200) {
  return { url, status, ok: status >= 200 && status < 300,
    headers: { get(name) { return name === "content-type" ? type : null; } },
    async text() { return body; } };
}
function mockFetch({ wrongRedirect = false, staleHtml = false, staleJs = false } = {}) {
  const calls = [];
  const fn = async input => {
    const url = String(input);
    calls.push(url);
    if (url.includes("phase2-calculator-browser.js")) return mockResponse(url,
      staleJs ? 'form.addEventListener("submit",()=>{});' : js, "text/javascript");
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
  assert.equal(fetchImpl.calls.length, 3);
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
