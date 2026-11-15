import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  eligibleSkSolarPanel, isSkSolarOfferStillEligible, projectSkSolarCalculatorOffers,
  selectSkSolarCalculatorOffers, skSolarExpiresAt,
} from "../src/sk-solar-calculator-offers.js";
import { calculateLanding } from "../src/calculator-landing.js";
import {
  acceptSkSolarCalculatorSnapshot, loadSkSolarCalculatorOffers, SK_SOLAR_CALCULATOR_CATALOG_PATH,
} from "../src/verified-offer-catalog-fetch.js";
import { mountSolarCalculatorBuyers } from "../src/solar-calculator-offers-browser.js";

const full = JSON.parse(await readFile(new URL("../data/products-sk.json", import.meta.url), "utf8"));
const compact = JSON.parse(await readFile(new URL("../data/solar-calculator-offers-sk.json", import.meta.url), "utf8"));
// Static positive test data must survive the real feed going out of stock.
// Production snapshots are independently checked against the mutable full feed.
const reviewedFixture = JSON.parse(await readFile(new URL("./fixtures/solar-sk-reviewed-snapshot.json", import.meta.url), "utf8"));
const date = Date.parse(reviewedFixture.generatedAt);
const now = date + 60_000;
const calc = (solarWatts, systemVoltage = 12) => ({ solarWatts, systemVoltage });
const fixture = () => structuredClone(reviewedFixture);

test("SK solar uses two real standalone Padabo SKU pages, exact eHub tracking and EUR", () => {
  assert.deepEqual(compact, projectSkSolarCalculatorOffers(full, Date.parse(full.generatedAt)));
  assert.equal(acceptSkSolarCalculatorSnapshot(compact), true);
  assert.ok(JSON.stringify(compact).length < 2500);
  assert.ok(JSON.stringify(compact).length * 50 < JSON.stringify(full).length);
  assert.ok(compact.products.length <= 2);
  assert.equal(reviewedFixture.products.length, 2);
  for (const p of reviewedFixture.products) {
    assert.equal(eligibleSkSolarPanel(p), true);
    assert.equal(p.priceCurrency, "EUR");
    assert.equal(p.specs.voltageV, 12);
    const affiliate = new URL(p.affiliateUrl);
    assert.equal(affiliate.searchParams.get("a_aid"), "f34c86c8");
    assert.equal(affiliate.searchParams.get("a_bid"), "7aed5c13");
    assert.equal(affiliate.searchParams.get("desturl"), p.productUrl);
  }
});

test("SK solar size result shows nominal quantity, never claims MPPT or roof fit", () => {
  const result = calculateLanding("solar-sizing", {
    dailyWh: "1200", season: "summer", systemVoltage: "12", batteryType: "lifepo4",
  }, "sk").result;
  assert.equal(result.solarWatts, 450);
  assert.deepEqual(selectSkSolarCalculatorOffers(reviewedFixture, result, now)
    .map(p => [p.id, p.recommendedQuantity]), [["padabo_sk:109069", 3]]);
  assert.deepEqual(selectSkSolarCalculatorOffers(reviewedFixture, calc(280), now)
    .map(p => [p.id, p.recommendedQuantity]), [
      ["padabo_sk:109069", 2], ["padabo_sk:104344", 3],
    ]);
  for (const result of [calc(450, 24), calc(900), calc(450.5), calc(0)])
    assert.deepEqual(selectSkSolarCalculatorOffers(reviewedFixture, result, now), []);
});

test("SK solar fails closed on stale, duplicate, mutated variant, price, stock or affiliate", () => {
  for (const mutate of [
    p => { p.specs.voltageV = 24; },
    p => { p.specs.powerW = 800; },
    p => { p.name += " extra"; },
    p => { p.productUrl = "https://example.com/"; },
    p => { p.productUrl += "?variant=other"; },
    p => { p.affiliateUrl += "&a_aid=malicious"; },
    p => { p.affiliateUrl += "&data1=unreviewed"; },
    p => { p.affiliateUrl = p.productUrl; },
    p => { p.available = false; },
    p => { p.staleSource = true; },
    p => { p.priceCurrency = "CZK"; },
    p => { p.priceCzk = -2; },
  ]) {
    const payload = fixture();
    mutate(payload.products.find(p => p.id === "padabo_sk:109069"));
    assert.equal(selectSkSolarCalculatorOffers(payload, calc(450), now).length, 0);
  }
  const duplicate = fixture();
  duplicate.products.push({ ...duplicate.products[1] });
  assert.equal(selectSkSolarCalculatorOffers(duplicate, calc(450), now).length, 0);
  const stale = fixture();
  stale.sources.padabo_sk.status = "stale";
  assert.equal(selectSkSolarCalculatorOffers(stale, calc(450), now).length, 0);
  assert.equal(selectSkSolarCalculatorOffers(reviewedFixture, calc(450), skSolarExpiresAt(reviewedFixture) + 1).length, 0);
  assert.equal(isSkSolarOfferStillEligible(reviewedFixture, calc(450), {
    ...reviewedFixture.products[1], recommendedQuantity: 3,
  }, skSolarExpiresAt(reviewedFixture) + 1), false);
  assert.equal(projectSkSolarCalculatorOffers({ ...full, sources: { ...full.sources, padabo_sk: { status: "stale" } } }, Date.parse(full.generatedAt)).products.length, 0);
});

test("SK loader reads only two-SKU snapshot, rejects invalid/unavailable source without full catalog", async () => {
  const calls = [];
  const good = await loadSkSolarCalculatorOffers(async (path, options) => {
    calls.push({ path, options });
    return { ok: true, json: async () => fixture() };
  });
  assert.deepEqual(good, reviewedFixture);
  assert.deepEqual(calls.map(c => c.path), [SK_SOLAR_CALCULATOR_CATALOG_PATH]);
  assert.equal(calls[0].options.cache, "no-store");
  assert.equal(calls[0].options.redirect, "error");
  for (const payload of [null, { ...reviewedFixture, market: "cz-CZ" },
    { ...reviewedFixture, products: [...reviewedFixture.products, reviewedFixture.products[1]] }])
    assert.equal(await loadSkSolarCalculatorOffers(async () => ({ ok: true, json: async () => payload })), null);
  assert.equal(await loadSkSolarCalculatorOffers(async () => ({ ok: false, status: 404 })), null);
  assert.equal(await loadSkSolarCalculatorOffers(async () => { throw Error("offline"); }), null);
});

function harness() {
  const events = [];
  const doc = {
    hidden: false, addEventListener() {},
    createElement(tag) {
      return { tag, ownerDocument: doc, dataset: {}, children: [], isConnected: true, listeners: {},
        append(child) { this.children.push(child); },
        replaceChildren() { this.children = []; },
        get childElementCount() { return this.children.length; },
        addEventListener(type, fn) { this.listeners[type] = fn; },
      };
    },
  };
  let observer;
  class Observer {
    constructor(cb) { this.cb = cb; this.targets = new Set(); observer = this; }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
    intersect(target) { this.cb([{ target, isIntersecting: true, intersectionRatio: 1 }]); }
  }
  const list = doc.createElement("ul");
  const fallback = doc.createElement("p");
  const section = {
    ownerDocument: doc, dataset: { liveOffers: "0" }, hidden: true,
    querySelector(s) { return s === "[data-solar-offer-list]" ? list : s === "[data-solar-offer-fallback]" ? fallback : null; },
    querySelectorAll() { return list.children.flatMap(p => p.children.filter(el => el.tag === "a")); },
  };
  const root = {
    dataset: { calculatorIntent: "solar-sizing", calculatorLocale: "sk" },
    querySelector(s) { return s === "[data-solar-buyers]" ? section : null; },
  };
  let time = now, consent = true;
  const win = {
    IntersectionObserver: Observer, addEventListener() {}, clearTimeout() {}, setTimeout() { return 1; },
    MyPowerSetupAnalytics: { track(name, params) {
      if (!consent) return false;
      events.push({ name, params }); return true;
    } },
  };
  const buyer = mountSolarCalculatorBuyers(root, {
    fetchImpl: async () => ({ ok: true, json: async () => fixture() }),
    now: () => time, windowRoot: win,
  });
  return { buyer, list, section, fallback, events,
    get observer() { return observer; },
    setClock(v) { time = v; }, setConsent(v) { consent = v; },
    click(link) { let blocked = false; link.listeners.click({ type: "click", button: 0,
      preventDefault() { blocked = true; }, stopPropagation() {} }); return blocked; },
  };
}

test("SK buyer shows euros, records consent-gated SK click and hides stale links", async () => {
  const h = harness();
  await h.buyer.update(calc(450));
  assert.equal(h.list.childElementCount, 1);
  const [row] = h.list.children;
  assert.match(row.children.find(x => x.tag === "span").textContent, /3 × 190 Wp = 570 Wp/);
  assert.match(row.children.filter(x => x.tag === "span")[1].textContent, /328,47/);
  const link = row.children.find(x => x.tag === "a");
  const url = new URL(link.href);
  assert.equal(url.searchParams.get("a_aid"), "f34c86c8");
  assert.equal(url.searchParams.get("a_bid"), "7aed5c13");
  assert.equal(url.searchParams.get("data1"), "mps_sk_solar_panel");
  assert.equal(link.dataset.merchant, "padabo_sk");
  assert.equal(link.rel, "sponsored noopener noreferrer");
  assert.ok(h.observer.targets.has(link));
  h.setConsent(false);
  h.observer.intersect(link);
  assert.equal(h.events.length, 0);
  h.setConsent(true);
  h.observer.intersect(link);
  assert.equal(h.events[0].name, "product_choice_impression");
  assert.equal(h.click(link), false);
  assert.equal(h.events[1].name, "affiliate_click");
  h.buyer.invalidate();
  assert.equal(h.section.hidden, true);
  assert.equal(h.click(link), true);
  await h.buyer.update(calc(450));
  const refreshed = h.list.children[0].children.find(x => x.tag === "a");
  h.setClock(skSolarExpiresAt(reviewedFixture) + 1);
  assert.equal(h.click(refreshed), true);
  assert.equal(h.list.childElementCount, 0);
});

test("SK page offers sit before navigation; input changes invalidate both CZ and SK solar cards", async () => {
  const [sk, browser, sync, workflow, checker] = await Promise.all([
    readFile("sk/kalkulacky/solarne-panely/index.html", "utf8"),
    readFile("src/calculator-landing-browser.js", "utf8"),
    readFile("scripts/sync-products-sk.mjs", "utf8"),
    readFile(".github/workflows/sync-products.yml", "utf8"),
    readFile("scripts/check-solar-calculator-offers-sk.mjs", "utf8"),
  ]);
  assert.ok(sk.indexOf("data-solar-buyers") > sk.indexOf("data-result-warnings"));
  assert.ok(sk.indexOf('class="calculator-actions"') > sk.indexOf("data-solar-buyers"));
  assert.match(sk, /Samotný súčet Wp nezaručuje kompatibilitu celej zostavy/);
  assert.match(browser, /\["cs", "sk", "pl", "hu"\]\.includes\(locale\)/);
  const invalidator = browser.match(/const invalidateResult = \(\) => \{([\s\S]*?)\n  \};/)?.[1] || "";
  assert.match(invalidator, /solarBuyers\?\.invalidate\(\)/);
  assert.match(sync, /projectSkSolarCalculatorOffers\(catalog\)/);
  assert.match(workflow, /data\/solar-calculator-offers-sk\.json/);
  assert.match(workflow, /check-solar-calculator-offers-sk\.mjs/);
  assert.match(checker, /SK_SOLAR_CATALOG_SOURCE_DRIFT/);
});
