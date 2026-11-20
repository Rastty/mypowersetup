import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  plS400CatalogFresh, eligiblePlS400, selectPlS400Comparison,
  mountPlS400Comparison, refreshPlS400Comparison, trackPlS400Click,
} from "../src/pl-s400-guide-offers.js";

const NOW = Date.parse("2026-11-20T19:00:00Z");
const paths = [
  "/oxe-powerstation-s400-wielofunkcyjny-generator-ladujacy-400w386wh-torba/",
  "/oxe-powerstation-s400-i-panel-sloneczny-sp100w-torba/",
];
function offer(index) {
  const productUrl = "https://www.oxepower.pl" + paths[index];
  return {
    id: index === 0 ? "oxe_pl:OXE8817" : "oxe_pl:OXE8821",
    merchant: "oxe_pl", category: "power_station", brand: "OXE", name: "OXE S400",
    available: true, priceCzk: index === 0 ? 1128.35 : 2776.61, priceCurrency: "PLN",
    productUrl,
    affiliateUrl: `https://go.dognet.com/?chid=2mRVFbhJ&url=${encodeURIComponent(productUrl)}`,
    specs: { capacityWh: 385.56, powerW: 400, solarInputW: 90, dcOutputA: 8, pureSine: true },
  };
}
function catalog(products = [offer(0), offer(1)], generatedAt = "2026-11-20T18:40:11.569Z") {
  return {
    generatedAt,
    sources: { oxe_pl: {
      status: "ok", merchant: "oxe_pl", dognetChannel: "2mRVFbhJ",
      feedUrl: "https://www.oxepower.pl/export/google-dognet-pl.xml",
      liveOfferChecks: 11, liveOfferVerified: 10,
    } },
    products,
  };
}

test("two reviewed OXE exact SKU offers use same Polish storefront and Dognet channel as verified catalog", () => {
  const data = catalog();
  assert.equal(plS400CatalogFresh(data, NOW), true);
  assert.equal(selectPlS400Comparison(data, NOW).length, 2);
  for (const item of data.products) assert.equal(eligiblePlS400(item), true);
  assert.equal(selectPlS400Comparison(catalog([offer(0)]), NOW).length, 0);
  assert.equal(selectPlS400Comparison(catalog([offer(0), offer(0), offer(1)]), NOW).length, 0);
  assert.equal(selectPlS400Comparison(catalog([offer(0), { ...offer(1), available: false }]), NOW).length, 0);
});

test("stale, future or unverified catalog cannot activate static merchant links", () => {
  const cases = [
    { generatedAt: "2026-11-18T18:00:00.000Z" },
    { generatedAt: "2026-11-21T00:00:00.000Z" },
    { generatedAt: "2026-11-20" },
    { generatedAt: "2026-02-30T20:00:00.000Z" },
    { sources: { oxe_pl: { ...catalog().sources.oxe_pl, status: "stale" } } },
    { sources: { oxe_pl: { ...catalog().sources.oxe_pl, liveOfferVerified: 0 } } },
    { sources: { oxe_pl: { ...catalog().sources.oxe_pl, dognetChannel: "hijacked" } } },
    { products: "untrusted" },
  ];
  for (const changes of cases) {
    assert.equal(selectPlS400Comparison({ ...catalog(), ...changes }, NOW).length, 0, JSON.stringify(changes));
  }
  assert.equal(selectPlS400Comparison(catalog(), NOW + 48 * 60 * 60 * 1000).length, 0);
});

test("reject substituted specifications, wrong currency, manipulated URLs and duplicate affiliate params", () => {
  const first = offer(0);
  const evil = [
    { id: "oxe_pl:OXE9999" },
    { merchant: "someone_else" },
    { category: "solar_panel" },
    { brand: "unknown" },
    { available: false },
    { staleSource: true },
    { priceCzk: 0 },
    { priceCzk: NaN },
    { priceCurrency: "CZK" },
    { specs: { ...first.specs, powerW: 800 } },
    { specs: { ...first.specs, solarInputW: 100 } },
    { specs: { ...first.specs, pureSine: false } },
    { productUrl: "https://www.oxepower.pl/" },
    { productUrl: first.productUrl.replace("https://", "http://") },
    { productUrl: first.productUrl.replace(".pl/", ".pl:8443/") },
    { affiliateUrl: first.affiliateUrl + "&url=https%3A%2F%2Fevil.example%2F" },
    { affiliateUrl: first.affiliateUrl + "&chid=other" },
    { affiliateUrl: first.affiliateUrl + "&redirect=https%3A%2F%2Fevil.example%2F" },
    { affiliateUrl: first.affiliateUrl.replace("go.dognet.com", "evil.example") },
    { affiliateUrl: first.affiliateUrl + "#fragment" },
  ];
  for (const mutation of evil) {
    assert.equal(eligiblePlS400({ ...first, ...mutation }), false, JSON.stringify(mutation));
  }
  const swapped = offer(0);
  swapped.productUrl = offer(1).productUrl;
  swapped.affiliateUrl = offer(1).affiliateUrl;
  assert.equal(eligiblePlS400(swapped), false);
});

class FakeElement {
  constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.listeners = {}; this.hidden = false; }
  append(child) { child.parent = this; this.children.push(child); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((item) => item !== this); }
  querySelector(selector) {
    if (selector.startsWith(".")) {
      const find = (node) => node.children.find((item) => item.className === selector.slice(1) || find(item));
      return find(this) || null;
    }
    return null;
  }
  addEventListener(type, listener) { this.listeners[type] = listener; }
}

test("rendering uses escaped text nodes, exact affiliate destination and a reversible no-offer fallback", () => {
  const original = globalThis.document;
  globalThis.document = { createElement: (tag) => new FakeElement(tag) };
  try {
    const root = new FakeElement("section");
    const fallback = new FakeElement("p");
    fallback.className = "guide-offer-fallback";
    root.append(fallback);
    assert.equal(mountPlS400Comparison(root, catalog(), NOW, () => NOW), 2);
    assert.equal(root.dataset.liveOffers, "2");
    assert.equal(fallback.hidden, true);
    const rows = root.querySelector(".guide-offer-list").children;
    assert.equal(rows.length, 2);
    assert.match(rows[0].children[1].textContent, /zł/);
    assert.equal(rows[0].children[2].href, offer(0).affiliateUrl);
    assert.equal(rows[1].children[2].href, offer(1).affiliateUrl);
    assert.equal(rows[0].children[2].rel, "sponsored noopener noreferrer");
    const link = rows[0].children[2];
    let stopped = false;
    link.listeners.click({ preventDefault() { stopped = true; }, stopPropagation() {} });
    assert.equal(stopped, false);
    // Once a tab is suspended beyond the evidence window, even old links
    // that remained in memory must be unclickable before the next refresh.
    const staleRoot = new FakeElement("section");
    const staleFallback = new FakeElement("p");
    staleFallback.className = "guide-offer-fallback";
    staleRoot.append(staleFallback);
    mountPlS400Comparison(staleRoot, catalog(), NOW, () => NOW + 72 * 60 * 60 * 1000);
    const staleLink = staleRoot.querySelector(".guide-offer-list").children[0].children[2];
    staleLink.listeners.click({ preventDefault() { stopped = true; }, stopPropagation() {} });
    assert.equal(stopped, true);
    assert.equal(staleRoot.querySelector(".guide-offer-list"), null);
    assert.equal(staleFallback.hidden, false);
    assert.equal(mountPlS400Comparison(root, null, NOW), 0);
    assert.equal(root.querySelector(".guide-offer-list"), null);
    assert.equal(fallback.hidden, false);
  } finally { globalThis.document = original; }
});

test("failed, non-JSON and stale network refreshes hide previously rendered buyer CTAs", async () => {
  const original = globalThis.document;
  globalThis.document = { createElement: (tag) => new FakeElement(tag) };
  try {
    const root = new FakeElement("section");
    const fallback = new FakeElement("p");
    fallback.className = "guide-offer-fallback";
    root.append(fallback);
    mountPlS400Comparison(root, catalog(), NOW);
    const bad = await refreshPlS400Comparison(root, async () => ({ ok: true, headers: { get: () => "text/html" } }), NOW);
    assert.equal(bad, null);
    assert.equal(root.dataset.liveOffers, "0");
    const good = await refreshPlS400Comparison(root, async (url, options) => {
      assert.equal(url, "/data/products-pl.json");
      assert.equal(options.cache, "no-store");
      assert.equal(options.redirect, "error");
      return { ok: true, headers: { get: () => "application/json" }, json: async () => catalog() };
    }, NOW);
    assert.ok(good);
    assert.equal(root.dataset.liveOffers, "2");
    const fail = await refreshPlS400Comparison(root, async () => { throw new Error("offline"); }, NOW);
    assert.equal(fail, null);
    assert.equal(root.dataset.liveOffers, "0");
  } finally { globalThis.document = original; }
});

test("only successful consent-aware PL power-station click events count", () => {
  const calls = [];
  const link = { href: offer(0).affiliateUrl, dataset: {
    source: "editorial-comparison", merchant: "oxe_pl", category: "power_station",
    productId: "oxe_pl:OXE8817", offerExpiresAt: String(NOW + 60_000),
  }};
  const event = { type: "click", button: 0, defaultPrevented: false, target: { closest: () => link } };
  const granted = { track: (name, params) => { calls.push([name, params]); return true; } };
  assert.equal(trackPlS400Click(event, granted, NOW), true);
  assert.equal(calls[0][0], "affiliate_click");
  assert.equal(calls[0][1].purchaseRoute, "portable");
  assert.equal(calls[0][1].source, "editorial-comparison");
  for (const change of [{ defaultPrevented: true }, { button: 2 }, { type: "auxclick", button: 0 }]) {
    assert.equal(trackPlS400Click({ ...event, ...change }, granted, NOW), false);
  }
  assert.equal(trackPlS400Click(event, granted, NOW + 120_000), false);
  assert.equal(trackPlS400Click(event, { track: () => false }, NOW), false);
  assert.equal(calls.length, 1);
});

test("PL guide keeps technical claims distinct from live commercial prices and reuses consented viewport impressions", async () => {
  const html = await readFile("pl/poradnik/oxe-s400-czy-zestaw-sp100w-kamper/index.html", "utf8");
  const hub = await readFile("pl/poradnik/index.html", "utf8");
  const script = await readFile("src/pl-s400-guide-offers.js", "utf8");
  assert.match(html, /<html lang="pl">/);
  assert.match(html, /"inLanguage":"pl-PL"/);
  assert.match(html, /386 Wh/);
  assert.match(html, /maksymalnie 90 W/);
  assert.doesNotMatch(html, /1128[.,]35|2776[.,]61/);
  assert.match(html, /data-pl-s400-offers/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /Informacja o afiliacji/);
  assert.match(hub, /data-guide-hub-related href="\/pl\/poradnik\/oxe-s400-czy-zestaw-sp100w-kamper\/"/);
  assert.match(script, /createVerifiedGuideImpressionTracker/);
  assert.match(script, /allowedMerchants: \["oxe_pl"\]/);
  assert.match(script, /link\.dataset\.offerExpiresAt/);
});
