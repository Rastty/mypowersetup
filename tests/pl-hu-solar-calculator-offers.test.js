import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  eligibleMarketSolarPanel, isMarketSolarOfferStillEligible, marketSolarExpiresAt,
  projectMarketSolarCalculatorOffers, selectMarketSolarCalculatorOffers,
} from "../src/pl-hu-solar-calculator-offers.js";
import {
  acceptMarketSolarCalculatorSnapshot, loadPlSolarCalculatorOffers, loadHuSolarCalculatorOffers,
  PL_SOLAR_CALCULATOR_CATALOG_PATH, HU_SOLAR_CALCULATOR_CATALOG_PATH,
} from "../src/verified-offer-catalog-fetch.js";
import { mountSolarCalculatorBuyers } from "../src/solar-calculator-offers-browser.js";

const now = Date.parse("2026-11-15T11:05:00.000Z");
const configs = [
  { market: "pl", currency: "PLN", bid: "95d61abf", price: 487.74,
    name: "Panel słoneczny Victron Energy BlueSolar 190 Wp Mono 12 V",
    url: "https://www.padabo.pl/panel-sloneczny-victron-energy-bluesolar-190-wp-mono-12-v_z109069/",
    load: loadPlSolarCalculatorOffers, path: PL_SOLAR_CALCULATOR_CATALOG_PATH,
    page: "pl/kalkulatory/panele-solarne/index.html" },
  { market: "hu", currency: "HUF", bid: "0f2a2252", price: 46165,
    name: "Victron Energy BlueSolar 190 Wp Mono 12 V napelem",
    url: "https://www.padabo.hu/victron-energy-bluesolar-190-wp-mono-12-v-napelem_z109069/",
    load: loadHuSolarCalculatorOffers, path: HU_SOLAR_CALCULATOR_CATALOG_PATH,
    page: "hu/kalkulatorok/napelem-teljesitmeny/index.html" },
];

function sample(config) {
  const merchant = `padabo_${config.market}`;
  const params = new URLSearchParams({ a_aid: "f34c86c8", a_bid: config.bid, desturl: config.url });
  return {
    schemaVersion: 1, projection: "solar_panel", market: `${config.market}-${config.market.toUpperCase()}`,
    generatedAt: "2026-11-15T11:04:00.000Z", sources: { [merchant]: { status: "ok" } },
    products: [{
      id: `${merchant}:109069`, merchant, category: "solar_panel", name: config.name,
      available: true, staleSource: false, priceCzk: config.price,
      priceCurrency: config.currency, productUrl: config.url,
      affiliateUrl: `https://ehub.cz/system/scripts/click.php?${params}`,
      specs: { powerW: 190, voltageV: 12 },
    }],
  };
}

function harness(market) {
  const doc = { hidden: false, addEventListener() {}, createElement(tag) {
    return { tag, ownerDocument: doc, dataset: {}, children: [], isConnected: true, listeners: {},
      append(child) { this.children.push(child); }, replaceChildren() { this.children = []; },
      get childElementCount() { return this.children.length; },
      addEventListener(type, fn) { this.listeners[type] = fn; },
    };
  } };
  const list = doc.createElement("ul");
  const fallback = doc.createElement("p");
  const section = { ownerDocument: doc, dataset: {}, hidden: true,
    querySelector(key) { return key === "[data-solar-offer-list]" ? list
      : key === "[data-solar-offer-fallback]" ? fallback : null; },
    querySelectorAll() { return list.children.flatMap(item => item.children.filter(c => c.tag === "a")); },
  };
  const root = { dataset: { calculatorIntent: "solar-sizing", calculatorLocale: market },
    querySelector(key) { return key === "[data-solar-buyers]" ? section : null; } };
  const events = [];
  let clock = now;
  const win = { addEventListener() {}, setTimeout() { return 1; }, clearTimeout() {},
    MyPowerSetupAnalytics: { track(name, params) { events.push({ name, params }); } } };
  const buyer = mountSolarCalculatorBuyers(root, {
    fetchImpl: async () => ({ ok: true, json: async () => sample(configs.find(c => c.market === market)) }),
    now: () => clock, windowRoot: win,
  });
  return { buyer, list, section, events, setClock(next) { clock = next; },
    click(link) { let stopped = false; link.listeners.click({ type: "click", button: 0,
      preventDefault() { stopped = true; }, stopPropagation() {} }); return stopped; } };
}

for (const config of configs) {
  test(`${config.market.toUpperCase()} solar snapshot is compact, exact source projection and local currency`, async () => {
    const [full, serialized] = await Promise.all([
      readFile(`data/products-${config.market}.json`, "utf8").then(JSON.parse),
      readFile(`data/solar-calculator-offers-${config.market}.json`, "utf8"),
    ]);
    assert.equal(serialized, JSON.stringify(projectMarketSolarCalculatorOffers(config.market, full,
      Date.parse(full.generatedAt))) + "\n");
    assert.equal(acceptMarketSolarCalculatorSnapshot(config.market, JSON.parse(serialized)), true);
    assert.ok(Buffer.byteLength(serialized) < 1600);
    const item = sample(config).products[0];
    assert.equal(eligibleMarketSolarPanel(config.market, item), true);
    assert.equal(item.priceCurrency, config.currency);
    assert.equal(new URL(item.affiliateUrl).searchParams.get("desturl"), item.productUrl);
    const matches = selectMarketSolarCalculatorOffers(config.market, sample(config),
      { solarWatts: 450, systemVoltage: 12 }, now);
    assert.deepEqual(matches.map(p => [p.id, p.recommendedQuantity]), [[item.id, 3]]);
    assert.deepEqual(selectMarketSolarCalculatorOffers(config.market, sample(config),
      { solarWatts: 450, systemVoltage: 24 }, now), []);
  });

  test(`${config.market.toUpperCase()} solar fails closed on mutation, expiry, duplicates or wrong source`, () => {
    for (const mutate of [
      p => { p.products[0].name += " extra"; },
      p => { p.products[0].specs.powerW = 180; },
      p => { p.products[0].specs.voltageV = 24; },
      p => { p.products[0].available = false; },
      p => { p.products[0].staleSource = true; },
      p => { p.products[0].priceCurrency = "EUR"; },
      p => { p.products[0].priceCzk = 0; },
      p => { p.products[0].affiliateUrl += "&a_bid=wrong"; },
      p => { p.products[0].affiliateUrl += "&data1=wrong"; },
      p => { p.products[0].productUrl += "?variant=other"; },
      p => { p.products.push({ ...p.products[0] }); },
      p => { p.sources[`padabo_${config.market}`].status = "stale"; },
      p => { p.market = "sk-SK"; },
      p => { p.generatedAt = "2999-01-01T00:00:00.000Z"; },
    ]) {
      const payload = sample(config);
      mutate(payload);
      assert.deepEqual(selectMarketSolarCalculatorOffers(config.market, payload,
        { solarWatts: 450, systemVoltage: 12 }, now), []);
    }
    const payload = sample(config);
    const result = { solarWatts: 450, systemVoltage: 12 };
    assert.deepEqual(selectMarketSolarCalculatorOffers(config.market, payload, result,
      marketSolarExpiresAt(payload) + 1), []);
    assert.equal(isMarketSolarOfferStillEligible(config.market, payload, result,
      { ...payload.products[0], recommendedQuantity: 3 }, marketSolarExpiresAt(payload) + 1), false);
  });

  test(`${config.market.toUpperCase()} loader is read-only, no redirect and no full-catalog fallback`, async () => {
    const calls = [];
    const loaded = await config.load(async (path, options) => {
      calls.push({ path, options }); return { ok: true, json: async () => sample(config) };
    });
    assert.deepEqual(loaded, sample(config));
    assert.deepEqual(calls.map(c => c.path), [config.path]);
    assert.equal(calls[0].options.cache, "no-store");
    assert.equal(calls[0].options.redirect, "error");
    assert.equal(await config.load(async () => ({ ok: false, status: 404 })), null);
    assert.equal(await config.load(async () => { throw new Error("offline"); }), null);
    const switched = sample(config); switched.market = "sk-SK";
    assert.equal(await config.load(async () => ({ ok: true, json: async () => switched })), null);
  });

  test(`${config.market.toUpperCase()} buyer renders nominal count, tracked link, blocks expired click`, async () => {
    const h = harness(config.market);
    await h.buyer.update({ solarWatts: 450, systemVoltage: 12 });
    assert.equal(h.list.childElementCount, 1);
    const row = h.list.children[0];
    const copy = row.children.filter(c => c.tag === "span");
    assert.match(copy[0].textContent, /3 × 190 Wp = 570 Wp/);
    assert.ok(copy[1].textContent.includes(new Intl.NumberFormat(config.market === "pl" ? "pl-PL" : "hu-HU",
      { style: "currency", currency: config.currency, maximumFractionDigits: 0 }).format(config.price * 3)));
    const link = row.children.find(c => c.tag === "a");
    assert.equal(new URL(link.href).searchParams.get("a_bid"), config.bid);
    assert.equal(link.dataset.merchant, `padabo_${config.market}`);
    assert.equal(link.rel, "sponsored noopener noreferrer");
    assert.equal(h.click(link), false);
    assert.equal(h.events.at(-1).name, "affiliate_click");
    h.setClock(marketSolarExpiresAt(sample(config)) + 1);
    assert.equal(h.click(link), true);
    assert.equal(h.list.childElementCount, 0);
  });

  test(`${config.market.toUpperCase()} page puts buyer choice inside calculated result`, async () => {
    const html = await readFile(config.page, "utf8");
    assert.ok(html.indexOf("data-solar-buyers") > html.indexOf("data-result-warnings"));
    assert.ok(html.indexOf("data-solar-buyers") < html.indexOf('class="calculator-actions"'));
    assert.match(html, /data-solar-offer-list/);
    assert.match(html, /data-solar-offer-fallback/);
  });
}
