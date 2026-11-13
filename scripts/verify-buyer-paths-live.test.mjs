import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  PAGES, ASSETS, checkPublicHtml, checkServedAsset, checkPublicCompactCatalog,
  checkPublicDcdcGuideCatalog, verifyBuyerPathsLive,
} from "./verify-buyer-paths-live.mjs";

const origin = "https://mypowersetup.com";
const local = async path => readFile(new URL("../" + path, import.meta.url), "utf8");
const dcdcReady = async () => {
  try { await local("data/dcdc-guide-offers-cz.json"); return true; }
  catch (error) { if (error?.code === "ENOENT") return false; throw error; }
};

function mockFetch({ mutate = () => null, retryStatus = null } = {}) {
  const calls = [];
  const impl = async input => {
    const url = new URL(String(input));
    calls.push(url.href);
    const file = url.pathname.startsWith("/src/") || url.pathname.startsWith("/data/")
      ? url.pathname.slice(1) : url.pathname.slice(1) + "index.html";
    const type = url.pathname.startsWith("/src/") ? "text/javascript"
      : url.pathname.startsWith("/data/") ? "application/json" : "text/html";
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

test("eleven buyer pages, exact versioned JS and deployed compact catalog are public-evidence verified", async () => {
  const fetchImpl = mockFetch();
  const result = await verifyBuyerPathsLive({ fetchImpl });
  assert.equal(result.status, "PUBLIC_BUYER_HTML_JS_AND_CATALOG_VERIFIED");
  assert.equal(result.pages.length, PAGES.length);
  assert.equal(result.pages.length, 11);
  assert.equal(result.assets.length, ASSETS.length + 1, "two distinct browser cache keys: autonomy and shared CZ buyer entry");
  assert.equal(result.productionActions, 0);
  assert.equal(result.browserInteractionsVerified, false);
  assert.equal(result.seoUpliftMeasured, false);
  assert.equal(result.transientRetries, 0);
  const dcdcPublished = await dcdcReady();
  assert.equal(fetchImpl.calls.length, PAGES.length + ASSETS.length + 2 + Number(dcdcPublished));
  assert.equal(result.dcdcCatalog.status, dcdcPublished
    ? "PUBLIC_DCDC_CATALOG_VERIFIED" : "LEGACY_FULL_CATALOG_UNTIL_FIRST_SYNC");
  if (dcdcPublished) {
    assert.ok(result.dcdcCatalog.bytes < 6000);
    assert.ok(result.dcdcCatalog.reviewedProducts <= 4);
    assert.equal(result.dcdcCatalog.outboundClickVerified, false);
  }
  assert.ok(result.compactCatalog.bytes > 0);
  assert.ok(result.compactCatalog.bytes < 12_000);
  assert.equal(result.compactCatalog.reviewedProducts, 6);
  assert.equal(result.compactCatalog.source, "exact");
  assert.equal(result.compactCatalog.outboundClickVerified, false);
  assert.equal(result.compactCatalog.commissionVerified, false);
  assert.equal(fetchImpl.calls.filter(url => url.includes("/data/calculator-offers-cz.json")).length, 1);
  assert.ok(result.browserVersions.battery_runtime.includes("fridge-community1"));
  assert.ok(result.browserVersions.mppt_calculator.includes("cz-affiliate-subid1"));
  assert.ok(result.browserVersions.battery_capacity.includes("cz-affiliate-subid1"));
  assert.ok(result.assets.some(row => row.asset === "src/battery-calculator-offers-browser.js" &&
    row.servedPath.includes("?v=20261113-cz-affiliate-subid1")));
  assert.ok(result.assets.some(row => row.asset === "src/mppt-calculator-offers-browser.js" &&
    row.servedPath.includes("?v=20261113-cz-affiliate-subid1")));
  assert.ok(result.assets.some(row => row.asset === "src/calculator-offer-catalog.js" &&
    row.servedPath.includes("?v=20261109-lightweight-cz1")));
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
  assert.equal(transient.calls.length, PAGES.length + ASSETS.length + 3 + Number(await dcdcReady()));
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

test("wrong editorial guide browser version or recommendation category cannot pass live parity", async () => {
  const page = "/pruvodce/kapacita-baterie-do-karavanu/";
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url, file }) => {
    if (url.pathname !== page) return null;
    return mockResponse(url.href, (await local(file)).replace("20261113-guide-network-attribution1", "stale-version"));
  } }) }), /PUBLIC_EDITORIAL_SCRIPT_VERSION_DRIFT/);
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url, file }) => {
    if (url.pathname !== "/pruvodce/dc-dc-nabijecka-18a-vs-30a-vs-50a-karavan/") return null;
    return mockResponse(url.href, (await local(file)).replace('data-guide-category="dc_charger"',
      'data-guide-category="controller"'));
  } }) }), /PUBLIC_EDITORIAL_CATEGORY_DRIFT/);
});

test("public compact JSON must exactly match deployed approved snapshot, not merely exist", async () => {
  const file = "data/calculator-offers-cz.json";
  const expected = await local(file);
  const good = checkPublicCompactCatalog(expected, expected, Date.parse(JSON.parse(expected).generatedAt));
  assert.equal(good.source, "exact");
  assert.equal(good.reviewedProducts, 6);
  assert.equal(good.eligibleBatteryOffers, 3);
  assert.equal(good.eligibleControllerOffers, 3);
  assert.equal(good.outboundClickVerified, false);

  assert.throws(() => checkPublicCompactCatalog(expected.replace('"schemaVersion":1', '"schemaVersion":2'), expected),
    /PUBLIC_COMPACT_CATALOG_SOURCE_DRIFT/);
  assert.throws(() => checkPublicCompactCatalog("x".repeat(12_001), "x".repeat(12_001)),
    /PUBLIC_COMPACT_CATALOG_TOO_LARGE/);
  assert.throws(() => checkPublicCompactCatalog("{bad", "{bad"),
    /PUBLIC_COMPACT_CATALOG_INVALID_JSON/);
  assert.throws(() => checkPublicCompactCatalog('{"products":[]}', '{"products":[]}'),
    /PUBLIC_COMPACT_CATALOG_INVALID_SCHEMA/);

  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url }) => {
    if (url.pathname !== "/data/calculator-offers-cz.json") return null;
    return mockResponse(url.href, expected.replace('"schemaVersion":1', '"schemaVersion":2'),
      "application/json");
  } }) }), /PUBLIC_COMPACT_CATALOG_SOURCE_DRIFT/);
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url }) => {
    if (url.pathname !== "/data/calculator-offers-cz.json") return null;
    return mockResponse(url.href, expected, "text/html");
  } }) }), /PUBLIC_NON_JSON/);
});

test("new public DC-DC view has exact source parity and never asserts recorded buyer clicks", async () => {
  const empty=JSON.stringify({
    schemaVersion:1,projection:"dc_charger",generatedAt:"2026-11-10T12:00:00Z",
    sources:{vselektro:{status:"ok"}},products:[],
  })+"\n";
  const report=checkPublicDcdcGuideCatalog(empty,empty,Date.parse("2026-11-10T12:00:00Z"));
  assert.equal(report.status,"PUBLIC_DCDC_CATALOG_VERIFIED");
  assert.equal(report.reviewedProducts,0);
  assert.equal(report.eligibleDcdcOffers,0);
  assert.equal(report.commissionVerified,false);
  assert.throws(()=>checkPublicDcdcGuideCatalog(empty+" ",empty.replace('"schemaVersion":1','"schemaVersion":2')),
    /PUBLIC_DCDC_CATALOG_SOURCE_DRIFT/);
  assert.throws(()=>checkPublicDcdcGuideCatalog("{broken","{broken"),/PUBLIC_DCDC_CATALOG_INVALID_JSON/);
  assert.throws(()=>checkPublicDcdcGuideCatalog("x".repeat(6001),"x".repeat(6001)),
    /PUBLIC_DCDC_CATALOG_TOO_LARGE/);
  const corrupted=empty.replace('"projection":"dc_charger"','"projection":"wrong"');
  assert.throws(()=>checkPublicDcdcGuideCatalog(corrupted,corrupted),/PUBLIC_DCDC_CATALOG_INVALID_SCHEMA/);

  if (await dcdcReady()) {
    const original=await local("data/dcdc-guide-offers-cz.json");
    const audit=checkPublicDcdcGuideCatalog(original,original,Date.parse(JSON.parse(original).generatedAt));
    assert.ok(audit.reviewedProducts<=4);
    await assert.rejects(verifyBuyerPathsLive({fetchImpl:mockFetch({mutate:async({url})=>{
      if (url.pathname!=="/data/dcdc-guide-offers-cz.json") return null;
      return mockResponse(url.href,original.replace('"projection":"dc_charger"','"projection":"wrong"'),
        "application/json");
    }})}),/PUBLIC_DCDC_CATALOG_SOURCE_DRIFT/);
  }
});
