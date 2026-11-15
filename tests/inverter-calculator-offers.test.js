import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateLanding } from "../src/calculator-landing.js";
import { projectInverterCalculatorOffers } from "../src/calculator-offer-catalog.js";
import {
  acceptInverterCalculatorSnapshot, loadInverterCalculatorOffers,
  INVERTER_CALCULATOR_CATALOG_PATH,
} from "../src/verified-offer-catalog-fetch.js";
import {
  eligibleInverterOffer, inverterOfferExpiresAt, isInverterOfferStillEligible,
  selectInverterCalculatorOffers,
} from "../src/inverter-calculator-offers.js";
import { mountInverterCalculatorBuyers } from "../src/inverter-calculator-offers-browser.js";

const full = JSON.parse(await readFile(new URL("../data/products.json", import.meta.url), "utf8"));
const compact = JSON.parse(await readFile(new URL("../data/inverter-calculator-offers-cz.json", import.meta.url), "utf8"));
const now = Date.parse(full.generatedAt) + 60_000;
const fixture = () => structuredClone(compact);
const calc = (voltage, watts) => ({ systemVoltage: voltage, inverterWatts: watts });

test("snapshot contains only 13 unambiguous live 12/24V model SKUs and preserves the original feed", () => {
  assert.deepEqual(compact, projectInverterCalculatorOffers(full, Date.parse(full.generatedAt)));
  assert.equal(compact.products.length, 13);
  assert.ok(acceptInverterCalculatorSnapshot(compact));
  assert.ok(JSON.stringify(compact).length < 8500);
  assert.ok(JSON.stringify(compact).length * 20 < JSON.stringify(full).length);
  for (const p of compact.products) {
    assert.equal(eligibleInverterOffer(p), true);
    assert.ok([12, 24].includes(p.specs.voltageV));
    assert.equal(p.specs.pureSine, true);
    const url = new URL(p.affiliateUrl);
    assert.equal(url.searchParams.get("a_aid"), "f34c86c8");
    assert.equal(url.searchParams.get("a_bid"), "35cb7fb0");
    assert.equal(url.searchParams.get("desturl"), p.productUrl);
  }
  assert.equal(compact.products.some(p => p.merchant === "reslshop"), false);
});

test("real calculator examples match only same-voltage, sufficiently powered models", () => {
  const high = calculateLanding("inverter-sizing", {
    largestLoadWatts: 1000, otherLoadWatts: 0, surgeMultiplier: 1, systemVoltage: "auto",
  }, "cs").result;
  assert.equal(high.inverterWatts, 1300);
  assert.equal(high.systemVoltage, 24);
  assert.deepEqual(selectInverterCalculatorOffers(compact, high, now).map(p => p.id), [
    "solarimport:E7934", "solarimport:E7935", "solarimport:E7936",
  ]);
  const low = calc(12, 400);
  assert.deepEqual(selectInverterCalculatorOffers(compact, low, now).map(p => p.id), [
    "solarimport:E7926", "solarimport:E7927", "solarimport:E7928",
  ]);
  const exact = selectInverterCalculatorOffers(compact, calc(12, 300), now);
  assert.equal(exact[0].id, "solarimport:E7925");
  assert.equal(selectInverterCalculatorOffers(compact, calc(12, 4000), now).length, 0);
  assert.equal(selectInverterCalculatorOffers(compact, calc(48, 300), now).length, 0);
  assert.equal(selectInverterCalculatorOffers(compact, calc(24, 6000), now).length, 0);
  assert.equal(selectInverterCalculatorOffers(compact, calc(12, 499.9), now).length, 0);
});

test("inverter buying fails closed for manipulated technical, stock, price, URL and affiliate facts", () => {
  const id = "solarimport:E7925";
  for (const mutate of [
    p => { p.specs.powerW = 12300; },
    p => { p.specs.voltageV = 48; },
    p => { p.specs.pureSine = false; },
    p => { p.name = "ROGERELE Měnič REP12300-12 300W"; },
    p => { p.productUrl = "https://example.com/buy"; },
    p => { p.productUrl += "?tracking=1"; },
    p => { p.affiliateUrl = p.productUrl; },
    p => { p.affiliateUrl += "&a_aid=evil"; },
    p => { p.affiliateUrl += "&data1=fake"; },
    p => { p.available = false; },
    p => { p.staleSource = true; },
    p => { p.priceCzk = 0; },
    p => { p.priceCurrency = "EUR"; },
  ]) {
    const copy = fixture();
    mutate(copy.products.find(p => p.id === id));
    assert.equal(selectInverterCalculatorOffers(copy, calc(12, 300), now).some(p => p.id === id), false);
  }
  const duplicate = fixture();
  duplicate.products.push({ ...duplicate.products[0] });
  assert.equal(selectInverterCalculatorOffers(duplicate, calc(12, 300), now).some(p => p.id === id), false);
  assert.equal(selectInverterCalculatorOffers({ ...fixture(), sources: { solarimport: { status: "stale" } } }, calc(12, 300), now).length, 0);
  assert.equal(selectInverterCalculatorOffers(compact, calc(12, 300), inverterOfferExpiresAt(compact) + 1).length, 0);
  assert.equal(isInverterOfferStillEligible(compact, calc(12, 300), compact.products[0], inverterOfferExpiresAt(compact) + 1), false);
});

test("new projection never upgrades stale feed data to a fresh offer", () => {
  const stale = { ...full, sources: { ...full.sources, solarimport: { status: "stale" } } };
  assert.equal(projectInverterCalculatorOffers(stale, now).products.length, 0);
  assert.equal(projectInverterCalculatorOffers(stale, now).sources.solarimport.status, "stale");
  const late = projectInverterCalculatorOffers(full, Date.parse(full.generatedAt) + 73 * 3600_000);
  assert.equal(late.products.length, 0);
});

test("loader accepts only the tiny versioned view; never falls back to the full feed", async () => {
  const calls = [];
  const good = await loadInverterCalculatorOffers(async (path, options) => {
    calls.push({ path, options });
    return { ok: true, json: async () => fixture() };
  });
  assert.deepEqual(good, compact);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, INVERTER_CALCULATOR_CATALOG_PATH);
  assert.equal(calls[0].options.cache, "no-store");
  assert.equal(calls[0].options.redirect, "error");
  for (const input of [null, {}, { ...compact, schemaVersion: 2 }, { ...compact, products: Array.from({ length: 14 }, () => compact.products[0]) }]) {
    assert.equal(await loadInverterCalculatorOffers(async () => ({ ok: true, json: async () => input })), null);
  }
  assert.equal(await loadInverterCalculatorOffers(async () => ({ ok: false, status: 404 })), null);
  assert.equal(await loadInverterCalculatorOffers(async () => { throw Error("feed down"); }), null);
});

function harness() {
  const events = [];
  const doc = {
    hidden: false, listeners: {},
    addEventListener(type, fn) { this.listeners[type] = fn; },
    createElement(tag) {
      return { tag, ownerDocument: doc, dataset: {}, children: [], isConnected: true, listeners: {},
        append(item) { this.children.push(item); },
        replaceChildren() { this.children = []; },
        get childElementCount() { return this.children.length; },
        addEventListener(type, callback) { this.listeners[type] = callback; },
        closest() { return null; },
      };
    },
  };
  let observer;
  class Observer {
    constructor(callback) { this.callback = callback; this.targets = new Set(); observer = this; }
    observe(link) { this.targets.add(link); }
    unobserve(link) { this.targets.delete(link); }
    intersect(link) { this.callback([{ target: link, isIntersecting: true, intersectionRatio: 1 }]); }
  }
  const list = doc.createElement("ul");
  const fallback = doc.createElement("p");
  const section = {
    ownerDocument: doc, dataset: { liveOffers: "0" }, hidden: true,
    querySelector(s) { return s === "[data-inverter-offer-list]" ? list : s === "[data-inverter-offer-fallback]" ? fallback : null; },
    querySelectorAll() { return list.children.flatMap(item => item.children.filter(p => p.tag === "a")); },
  };
  const root = {
    dataset: { calculatorIntent: "inverter-sizing", calculatorLocale: "cs" },
    querySelector(s) { return s === "[data-inverter-buyers]" ? section : null; },
  };
  let count = 0;
  let clock = now;
  let consent = true;
  const win = {
    IntersectionObserver: Observer,
    MyPowerSetupAnalytics: { track(name, params) { if (!consent) return false; events.push({ name, params }); return true; } },
    addEventListener() {}, clearTimeout() {}, setTimeout() { return 1; },
  };
  const buyer = mountInverterCalculatorBuyers(root, {
    fetchImpl: async () => { count++; return { ok: true, json: async () => compact }; },
    now: () => clock, windowRoot: win,
  });
  return {
    buyer, list, fallback, section, events,
    get observer() { return observer; },
    get fetchCount() { return count; },
    setClock(value) { clock = value; },
    setConsent(value) { consent = value; },
    click(link) { let prevented = false; link.listeners.click({ type: "click", button: 0,
      preventDefault() { prevented = true; }, stopPropagation() {} }); return prevented; },
  };
}

test("buyer offers require a submitted calculation, carry affiliate ID, measure consented impressions and block stale clicks", async () => {
  const h = harness();
  assert.equal(h.fetchCount, 0);
  assert.equal(h.section.hidden, true);
  await h.buyer.update(calc(12, 400));
  assert.equal(h.fetchCount, 1);
  assert.equal(h.list.childElementCount, 3);
  const link = h.list.children[0].children.find(el => el.tag === "a");
  const url = new URL(link.href);
  assert.equal(url.searchParams.get("data1"), "mps_cz_inverter");
  assert.equal(url.searchParams.get("a_aid"), "f34c86c8");
  assert.equal(url.searchParams.get("a_bid"), "35cb7fb0");
  assert.equal(url.searchParams.get("desturl"), compact.products[1].productUrl);
  assert.equal(link.rel, "sponsored noopener noreferrer");
  assert.equal(link.dataset.merchant, "solarimport");
  assert.equal(h.observer.targets.has(link), true);
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
  assert.equal(h.events.length, 2);
  await h.buyer.update(calc(12, 400));
  const freshLink = h.list.children[0].children.find(el => el.tag === "a");
  h.setClock(inverterOfferExpiresAt(compact) + 1);
  assert.equal(h.click(freshLink), true);
  assert.equal(h.list.childElementCount, 0);
});

test("published inverter buyer page and daily source-to-projection verification are wired", async () => {
  const [page, browser, sync, workflow, check] = await Promise.all([
    readFile("kalkulacky/vykon-menice/index.html", "utf8"),
    readFile("src/calculator-landing-browser.js", "utf8"),
    readFile("scripts/sync-products.mjs", "utf8"),
    readFile(".github/workflows/sync-products.yml", "utf8"),
    readFile("scripts/check-inverter-calculator-offers-cz.mjs", "utf8"),
  ]);
  for (const attr of ["data-inverter-buyers", "data-inverter-offer-fallback", "data-inverter-offer-list"])
    assert.ok(page.includes(attr));
  assert.match(browser, /mountInverterCalculatorBuyers\(root\)/);
  assert.match(browser, /inverterBuyers\.update\(result\)/);
  assert.match(browser, /inverterBuyers\?\.invalidate\(\)/);
  assert.match(sync, /projectInverterCalculatorOffers\(fullCatalog/);
  assert.match(workflow, /data\/inverter-calculator-offers-cz\.json/);
  assert.match(workflow, /check-inverter-calculator-offers-cz\.mjs/);
  assert.match(check, /INVERTER_CATALOG_SOURCE_DRIFT/);
});
