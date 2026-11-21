import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  PAGES, ASSETS, checkPublicHtml, checkServedAsset, checkPublicCompactCatalog,
  checkPublicDcdcGuideCatalog, verifyBuyerPathsLive,
  checkPublicInverterCatalog, checkPublicSolarCatalog,
  checkPublicSkSolarCatalog, checkPublicMarketSolarCatalog, checkPublicPlS400Catalog,
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

test("eighteen CZ, SK, PL and HU buyer pages, exact JS and catalogs are public-evidence verified", async () => {
  const fetchImpl = mockFetch();
  const result = await verifyBuyerPathsLive({ fetchImpl });
  assert.equal(result.status, "PUBLIC_BUYER_HTML_JS_AND_CATALOG_VERIFIED");
  assert.equal(result.pages.length, PAGES.length);
  assert.equal(result.pages.length, 18);
  assert.equal(result.assets.length, ASSETS.length + 2, "three landing browser versions: older autonomy, CZ/SK, PL/HU");
  assert.equal(result.productionActions, 0);
  assert.equal(result.browserInteractionsVerified, false);
  assert.equal(result.seoUpliftMeasured, false);
  assert.equal(result.transientRetries, 0);
  const dcdcPublished = await dcdcReady();
  assert.equal(fetchImpl.calls.length, PAGES.length + ASSETS.length + 9 + Number(dcdcPublished));
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
  assert.equal(fetchImpl.calls.filter(url => url.includes("/data/products-pl.json")).length, 1);
  assert.equal(result.plS400Catalog.source, "exact");
  assert.equal(result.plS400Catalog.path, "/data/products-pl.json");
  assert.equal(result.plS400Catalog.outboundClickVerified, false);
  assert.equal(result.plS400Catalog.commissionVerified, false);
  assert.equal(fetchImpl.calls.filter(url => url.includes("/data/inverter-calculator-offers-cz.json")).length, 1);
  assert.equal(fetchImpl.calls.filter(url => url.includes("/data/solar-calculator-offers-cz.json")).length, 1);
  assert.equal(fetchImpl.calls.filter(url => url.includes("/data/solar-calculator-offers-sk.json")).length, 1);
  for (const market of ["pl", "hu"]) {
    assert.equal(fetchImpl.calls.filter(url => url.includes(`/data/solar-calculator-offers-${market}.json`)).length, 1);
    assert.ok(result.marketSolarCatalogs[market].reviewedProducts <= 1);
    assert.ok(result.marketSolarCatalogs[market].eligible12v450wp <= 1);
    assert.equal(result.marketSolarCatalogs[market].eligible24v450wp, 0);
    assert.equal(result.marketSolarCatalogs[market].commissionVerified, false);
  }
  assert.equal(result.inverterCatalog.reviewedProducts, 13);
  assert.equal(result.inverterCatalog.outboundClickVerified, false);
  assert.equal(result.inverterCatalog.commissionVerified, false);
  assert.equal(result.solarCatalog.reviewedProducts, 2);
  assert.equal(result.solarCatalog.eligible12v450wp, 2);
  assert.equal(result.solarCatalog.eligible24v450wp, 0);
  assert.equal(result.solarCatalog.commissionVerified, false);
  assert.ok(result.skSolarCatalog.reviewedProducts <= 2);
  assert.ok(result.skSolarCatalog.eligible12v450wp <= 2);
  assert.equal(result.skSolarCatalog.eligible24v450wp, 0);
  assert.equal(result.skSolarCatalog.commissionVerified, false);
  assert.ok(result.browserVersions.battery_runtime.includes("fridge-community1"));
  assert.ok(result.browserVersions.pl_s400_guide.includes("20261120-s400-editorial1"));
  for (const kind of ["mppt_calculator", "battery_capacity", "inverter_calculator", "solar_calculator", "sk_solar_calculator", "dcdc_calculator"])
    assert.ok(result.browserVersions[kind].includes("20261115-placement-events1"), kind);
  for (const kind of ["pl_solar_calculator", "hu_solar_calculator"])
    assert.ok(result.browserVersions[kind].includes("20261115-plhu-solar1"), kind);
  assert.ok(result.assets.some(row => row.asset === "src/battery-calculator-offers-browser.js" &&
    row.servedPath.includes("?v=20261115-placement-events1")));
  assert.ok(result.assets.some(row => row.asset === "src/mppt-calculator-offers-browser.js" &&
    row.servedPath.includes("?v=20261115-placement-events1")));
  assert.ok(result.assets.some(row => row.asset === "src/inverter-calculator-offers-browser.js" &&
    row.servedPath.includes("?v=20261115-placement-events1")));
  assert.ok(result.assets.some(row => row.asset === "src/solar-calculator-offers-browser.js" &&
    row.servedPath.includes("?v=20261115-plhu-solar1")));
  assert.ok(result.assets.some(row => row.asset === "src/dcdc-calculator-offers-browser.js" &&
    row.servedPath.includes("?v=20261115-placement-events1")));
  assert.ok(result.assets.some(row => row.asset === "src/awin-attribution.js" &&
    row.servedPath.includes("?v=20261115-placement-subids1")));
  assert.ok(result.assets.some(row => row.asset === "src/affiliate-analytics.js" &&
    row.servedPath.includes("?v=20261115-placement-events1")));
  assert.ok(result.assets.some(row => row.asset === "src/guide-offer-impressions.js" &&
    row.servedPath.includes("?v=20261115-placement-events1")));
  assert.ok(result.assets.some(row => row.asset === "src/pl-s400-guide-offers.js" &&
    row.servedPath.includes("?v=20261120-s400-editorial1")));
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
  assert.equal(transient.calls.length, PAGES.length + ASSETS.length + 10 + Number(await dcdcReady()));
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

test("public solar calculator and exact small panel catalog reject stale release bytes", async () => {
  const expected = await local("data/solar-calculator-offers-cz.json");
  const inspected = checkPublicSolarCatalog(expected, expected, Date.parse(JSON.parse(expected).generatedAt));
  assert.equal(inspected.reviewedProducts, 2);
  assert.equal(inspected.eligible12v450wp, 2);
  assert.equal(inspected.eligible24v450wp, 0);
  assert.equal(inspected.outboundClickVerified, false);
  assert.throws(() => checkPublicSolarCatalog("x".repeat(2702), "x".repeat(2702)),
    /PUBLIC_SOLAR_CATALOG_TOO_LARGE/);
  assert.throws(() => checkPublicSolarCatalog("{oops", "{oops"),
    /PUBLIC_SOLAR_CATALOG_INVALID_JSON/);
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url, file }) => {
    if (url.pathname !== "/kalkulacky/solarni-panely/") return null;
    return mockResponse(url.href, (await local(file)).replace(
      "Samotný součet Wp nedokazuje kompatibilitu sestavy.", "Všechno funguje."));
  } }) }), /PUBLIC_SOLAR_BUYER_GUARD_MISSING/);
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url }) => {
    if (url.pathname !== "/data/solar-calculator-offers-cz.json") return null;
    return mockResponse(url.href, expected.replace('"projection":"solar_panel"', '"projection":"wrong"'), "application/json");
  } }) }), /PUBLIC_SOLAR_CATALOG_SOURCE_DRIFT/);
});

test("SK solar page and compact Padabo feed must match the exact deployed release", async () => {
  const file = "data/solar-calculator-offers-sk.json";
  const expected = await local(file);
  const report = checkPublicSkSolarCatalog(expected, expected, Date.parse(JSON.parse(expected).generatedAt) + 60_000);
  assert.ok(report.reviewedProducts <= 2);
  assert.equal(report.eligible24v450wp, 0);
  assert.equal(report.commissionVerified, false);
  assert.throws(() => checkPublicSkSolarCatalog(expected.replace('"market":"sk-SK"', '"market":"cz-CZ"'), expected),
    /PUBLIC_SK_SOLAR_CATALOG_SOURCE_DRIFT/);
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url, file: source }) => {
    if (source !== file) return null;
    return mockResponse(url.href, expected.replace('"projection":"solar_panel"', '"projection":"untrusted"'), "application/json");
  } }) }), /PUBLIC_SK_SOLAR_CATALOG_SOURCE_DRIFT/);
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url, file: source }) => {
    if (source !== "sk/kalkulacky/solarne-panely/index.html") return null;
    return mockResponse(url.href, (await local(source)).replace(
      "Samotný súčet Wp nezaručuje kompatibilitu celej zostavy.", "Kompatibilita je zaručená."));
  } }) }), /PUBLIC_SK_SOLAR_BUYER_GUARD_MISSING/);
});

test("PL and HU solar public HTML, tiny Padabo feeds and buyer JS must match release", async () => {
  for (const market of ["pl", "hu"]) {
    const file = `data/solar-calculator-offers-${market}.json`;
    const expected = await local(file);
    const report = checkPublicMarketSolarCatalog(market, expected, expected,
      Date.parse(JSON.parse(expected).generatedAt) + 60_000);
    assert.ok(report.reviewedProducts <= 1);
    assert.equal(report.eligible24v450wp, 0);
    assert.equal(report.commissionVerified, false);
    assert.throws(() => checkPublicMarketSolarCatalog(market,
      expected.replace('"projection":"solar_panel"', '"projection":"untrusted"'), expected),
    /PUBLIC_MARKET_SOLAR_CATALOG_SOURCE_DRIFT/);
    await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url, file: source }) => {
      if (source !== file) return null;
      return mockResponse(url.href, expected.replace(`"market":"${market}-${market.toUpperCase()}"`,
        '"market":"sk-SK"'), "application/json");
    } }) }), /PUBLIC_MARKET_SOLAR_CATALOG_SOURCE_DRIFT/);
  }
  const page = "pl/kalkulatory/panele-solarne/index.html";
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url, file }) => {
    if (file !== page) return null;
    return mockResponse(url.href, (await local(page)).replace(
      "Suma Wp nie gwarantuje kompatybilności instalacji.", "Pasuje do wszystkiego."));
  } }) }), /PUBLIC_PL_SOLAR_BUYER_GUARD_MISSING/);
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url, file }) => {
    if (file !== "src/pl-hu-solar-calculator-offers.js") return null;
    return mockResponse(url.href, (await local(file)).replace('"padabo_pl"', '"fake_pl"'), "text/javascript");
  } }) }), /PUBLIC_ASSET_SOURCE_DRIFT/);
});

test("public inverter view, buyer marker and outbound evidence fail on production drift", async () => {
  const expected = await local("data/inverter-calculator-offers-cz.json");
  const inspected = checkPublicInverterCatalog(expected, expected, Date.parse(JSON.parse(expected).generatedAt));
  assert.equal(inspected.reviewedProducts, 13);
  assert.equal(inspected.eligible12v400w, 3);
  assert.equal(inspected.eligible24v1300w, 3);
  assert.equal(inspected.outboundClickVerified, false);
  assert.equal(inspected.commissionVerified, false);
  assert.throws(() => checkPublicInverterCatalog(expected.replace('"schemaVersion":1', '"schemaVersion":2'), expected),
    /PUBLIC_INVERTER_CATALOG_SOURCE_DRIFT/);
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url, file }) => {
    if (file !== "kalkulacky/vykon-menice/index.html") return null;
    return mockResponse(url.href, (await local(file)).replace("není potvrzení úplné kompatibility", "kompatibilní bez výhrad"));
  } }) }), /PUBLIC_INVERTER_BUYER_GUARD_MISSING/);
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url, file }) => {
    if (file !== "data/inverter-calculator-offers-cz.json") return null;
    return mockResponse(url.href, (await local(file)).replace("35cb7fb0", "wrong-id"), "application/json");
  } }) }), /PUBLIC_INVERTER_CATALOG_SOURCE_DRIFT/);
});

test("PL S400 exact public catalog proves reviewed SKUs but never fabricates clicks or stale offers", async () => {
  const source = await local("data/products-pl.json");
  const generatedAt = Date.parse(JSON.parse(source).generatedAt);
  const verified = checkPublicPlS400Catalog(source, source, generatedAt + 60_000);
  assert.equal(verified.source, "exact");
  assert.equal(verified.eligibleComparisonOffers, 2);
  assert.equal(verified.sourceStatus, "ok");
  assert.equal(verified.outboundClickVerified, false);
  assert.equal(verified.commissionVerified, false);
  assert.equal(checkPublicPlS400Catalog(source, source, generatedAt + 72 * 3600_000).eligibleComparisonOffers, 0);
  assert.throws(() => checkPublicPlS400Catalog(source + "x", source, generatedAt), /PUBLIC_PL_S400_CATALOG_SOURCE_DRIFT/);
  assert.throws(() => checkPublicPlS400Catalog("{broken", "{broken", generatedAt), /PUBLIC_PL_S400_CATALOG_INVALID_JSON/);
  assert.throws(() => checkPublicPlS400Catalog("x".repeat(1_000_001), "x".repeat(1_000_001), generatedAt), /PUBLIC_PL_S400_CATALOG_TOO_LARGE/);
  const swapped = { ...JSON.parse(source), market: "hu-HU" };
  assert.throws(() => checkPublicPlS400Catalog(JSON.stringify(swapped), JSON.stringify(swapped), generatedAt), /PUBLIC_PL_S400_CATALOG_INVALID_SCHEMA/);
  const invalid = JSON.parse(source);
  const offer = invalid.products.find(p => p.id === "oxe_pl:OXE8817");
  offer.available = false;
  assert.equal(checkPublicPlS400Catalog(JSON.stringify(invalid), JSON.stringify(invalid), generatedAt).eligibleComparisonOffers, 0);
});

test("PL S400 page script, served browser JS and catalog must all match the published source", async () => {
  const page = "/pl/poradnik/oxe-s400-czy-zestaw-sp100w-kamper/";
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url, file }) => {
    if (url.pathname !== page) return null;
    return mockResponse(url.href, (await local(file)).replace("20261120-s400-editorial1", "old-cached-version"));
  } }) }), /PUBLIC_PL_S400_GUIDE_DRIFT/);
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url }) => {
    if (url.pathname !== "/src/pl-s400-guide-offers.js") return null;
    return mockResponse(url.href, "stale served script", "text/javascript");
  } }) }), (error) => String(error?.message).includes("PUBLIC_ASSET_SOURCE_DRIFT:src/pl-s400-guide-offers.js"));
  await assert.rejects(verifyBuyerPathsLive({ fetchImpl: mockFetch({ mutate: async ({ url }) => {
    if (url.pathname !== "/data/products-pl.json") return null;
    return mockResponse(url.href, "{}", "application/json");
  } }) }), /PUBLIC_PL_S400_CATALOG_SOURCE_DRIFT/);
});
