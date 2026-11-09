import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  PAGES, ASSETS, checkPublicHtml, checkServedAsset, verifyBuyerPathsLive,
} from "./verify-buyer-paths-live.mjs";

const origin = "https://mypowersetup.com";
const local = async path => readFile(new URL("../" + path, import.meta.url), "utf8");

function mockFetch({ mutate = () => null, retryStatus = null } = {}) {
  const calls = [];
  const impl = async input => {
    const url = new URL(String(input));
    calls.push(url.href);
    const file = url.pathname.startsWith("/src/")
      ? url.pathname.slice(1) : url.pathname.slice(1) + "index.html";
    const type = url.pathname.startsWith("/src/") ? "text/javascript" : "text/html";
    const response = await mutate({ url, file, calls });
    if (response) return response;
    if (retryStatus && calls.length === 1) return mockResponse(url.href, "Temporary", type, retryStatus);
    return mockResponse(url.href, await local(file), type);
  };
  impl.calls = calls;
  return impl;
}

function mockResponse(url, body, type = "text/html", status = 200) {
  return {
    url, status, ok: status >= 200 && status < 300,
    headers: { get(key) { return key === "content-type" ? type : null; } },
    async text() { return body; },
  };
}

test("six buyer pages including battery sizing plus every actual versioned calculator JS are public-evidence verified", async () => {
  const fetchImpl = mockFetch();
  const result = await verifyBuyerPathsLive({ fetchImpl });
  assert.equal(result.status, "PUBLIC_BUYER_HTML_AND_JS_VERIFIED");
  assert.equal(result.pages.length, PAGES.length);
  assert.equal(result.pages.length, 6);
  assert.equal(result.assets.length, ASSETS.length + 2, "three distinct browser cache keys");
  assert.equal(result.productionActions, 0);
  assert.equal(result.browserInteractionsVerified, false);
  assert.equal(result.seoUpliftMeasured, false);
  assert.equal(result.transientRetries, 0);
  assert.equal(fetchImpl.calls.length, PAGES.length + ASSETS.length + 2);
  assert.ok(result.browserVersions.battery_runtime.includes("fridge-community1"));
  assert.ok(result.browserVersions.mppt_calculator.includes("mppt-buyer1"));
  assert.ok(result.browserVersions.battery_capacity.includes("battery-buyer1"));
  assert.ok(result.assets.some(row => row.asset === "src/battery-calculator-offers-browser.js" &&
    row.servedPath.includes("?v=20261109-battery-buyer1")));
  for (const row of result.pages) assert.equal(row.http, 200);
});

test("failed or redirected production HTML is not falsely accepted", async () => {
  const first = PAGES[0].path;
  let calls = 0;
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: async url => {
    calls++;
    return mockResponse(url.href, "Missing", "text/html", 404);
  } }), /PUBLIC_HTTP_404/);
  assert.equal(calls, 1, "hard 404 is not retried");
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url }) => {
    if (url.pathname === first) return mockResponse(origin + "/", await local(first.slice(1) + "index.html"));
    return null;
  } }) }), /PUBLIC_ROUTE_DRIFT/);
});

test("missing precise fridge links and wrong calculator script cache key both fail", async () => {
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url, file }) => {
    if (url.pathname !== PAGES[0].path) return null;
    const body = (await local(file)).replace("dailyWh=560", "dailyWh=570");
    return mockResponse(url.href, body);
  } }) }), /PUBLIC_FRIDGE_SCENARIO_MISSING:560/);
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url, file }) => {
    if (url.pathname !== "/kalkulacky/vydrz-baterie/") return null;
    const body = (await local(file)).replace("20261109-fridge-community1", "old-version");
    return mockResponse(url.href, body);
  } }) }), /PUBLIC_CALCULATOR_VERSION_DRIFT/);
});

test("battery capacity route and exact buyer JS fail the audit on production drift", async () => {
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({url,file}) => {
    if (url.pathname !== "/kalkulacky/kapacita-baterie/") return null;
    return mockResponse(url.href, (await local(file)).replace(
      "Nejde o automatické potvrzení kompatibility", "Bez výhrad je kompatibilní"));
  } }) }), /PUBLIC_BATTERY_BUYER_GUARD_MISSING/);
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({url,file}) => {
    if (file !== "src/battery-calculator-offers-browser.js") return null;
    return mockResponse(url.href, (await local(file)).replace(
      "battery-calculator-match", "untrusted"), "text/javascript");
  } }) }), /PUBLIC_ASSET_SOURCE_DRIFT/);
});

test("served JS must equal local source; stale community and result guards never pass", async () => {
  const browser = "src/calculator-landing-browser.js";
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url, file }) => {
    if (file !== browser) return null;
    const body = (await local(file)).replace('prefill.from === "fridge-guide"', 'prefill.from === "untrusted"');
    return mockResponse(url.href, body, "text/javascript");
  } }) }), /PUBLIC_ASSET_SOURCE_DRIFT/);
  const handoff = await local("src/calculator-handoff.js");
  assert.throws(() => checkServedAsset(handoff.replace("FRIDGE_GUIDE_WH.includes(wh)", "true"), handoff,
    "src/calculator-handoff.js"), /PUBLIC_ASSET_SOURCE_DRIFT/);
});

test("do not pass noindex, wrong source canonical, or silently modified assumptions", async () => {
  const page = PAGES[0];
  const html = await local(page.path.slice(1) + "index.html");
  assert.throws(() => checkPublicHtml(html.replace('<main ', '<meta name="robots" content="noindex"><main '),
    html, page), /PUBLIC_NOINDEX/);
  assert.throws(() => checkPublicHtml(html.replace("268/557 Wh", "0/0 Wh"),
    html, page), /PUBLIC_FRIDGE_ASSUMPTIONS_MISSING/);
  assert.throws(() => checkPublicHtml(html.replace('href="' + origin + page.path + '"',
    'href="https://fake.invalid/"'), html, page), /PUBLIC_CANONICAL_MISMATCH/);
});

test("bounded 503 retries recover once, while permanent 502 fails closed", async () => {
  const transient = mockFetch({ retryStatus: 503 });
  const delays = [];
  const success = await verifyBuyerPathsLive({ fetchImpl: transient, sleep: async ms => { delays.push(ms); } });
  assert.equal(success.transientRetries, 1);
  assert.deepEqual(delays, [250]);
  assert.equal(transient.calls.length, PAGES.length + ASSETS.length + 3);
  let calls = 0;
  await assert.rejects(verifyBuyerPathsLive({ sleep: async () => {}, fetchImpl: async input => {
    calls++;
    return mockResponse(input.href, "Temporary", "text/plain", 502);
  } }), /PUBLIC_HTTP_502/);
  assert.equal(calls, 3);
});

test("readback cannot be redirected to an arbitrary origin or perform writes", async () => {
  await assert.rejects(verifyBuyerPathsLive({ origin: "http://mypowersetup.com", fetchImpl: mockFetch() }),
    /PUBLIC_ORIGIN_NOT_ALLOWLISTED/);
  await assert.rejects(verifyBuyerPathsLive({ origin: "https://other.example", fetchImpl: mockFetch() }),
    /PUBLIC_ORIGIN_NOT_ALLOWLISTED/);
});
