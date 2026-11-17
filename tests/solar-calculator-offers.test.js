import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateLanding } from "../src/calculator-landing.js";
import { projectSolarCalculatorOffers } from "../src/calculator-offer-catalog.js";
import {
  acceptSolarCalculatorSnapshot, loadSolarCalculatorOffers, SOLAR_CALCULATOR_CATALOG_PATH,
} from "../src/verified-offer-catalog-fetch.js";
import {
  eligibleSolarPanel, solarOfferExpiresAt, isSolarOfferStillEligible,
  selectSolarCalculatorOffers,
} from "../src/solar-calculator-offers.js";
import { mountSolarCalculatorBuyers } from "../src/solar-calculator-offers-browser.js";

const full = JSON.parse(await readFile(new URL("../data/products.json", import.meta.url), "utf8"));
const compact = JSON.parse(await readFile(new URL("../data/solar-calculator-offers-cz.json", import.meta.url), "utf8"));
const now = Date.parse(full.generatedAt) + 60_000;
const fixture = () => structuredClone(compact);
const calc = (systemVoltage, solarWatts) => ({ systemVoltage, solarWatts });

test("solar snapshot is a same-source, exact-SKU, bounded view of the feed", () => {
  assert.deepEqual(compact, projectSolarCalculatorOffers(full, Date.parse(full.generatedAt)));
  assert.equal(compact.products.length, 2);
  assert.equal(compact.products.some(p => p.id === "solarimport:E7366"), false);
  assert.equal(acceptSolarCalculatorSnapshot(compact), true);
  assert.ok(JSON.stringify(compact).length < 2700);
  assert.ok(JSON.stringify(compact).length * 50 < JSON.stringify(full).length);
  for (const panel of compact.products) {
    assert.equal(eligibleSolarPanel(panel), true);
    assert.equal(panel.specs.voltageV, 12);
    const url = new URL(panel.affiliateUrl);
    assert.equal(url.searchParams.get("a_aid"), "f34c86c8");
    assert.equal(url.searchParams.get("a_bid"), "35cb7fb0");
    assert.equal(url.searchParams.get("desturl"), panel.productUrl);
  }
});

test("solar buyers only match nominal 12V panel quantities of at most four", () => {
  const result = calculateLanding("solar-sizing", {
    dailyWh: "1200", season: "summer", systemVoltage: "12", batteryType: "lifepo4",
  }, "cs").result;
  assert.equal(result.solarWatts, 450);
  const offers = selectSolarCalculatorOffers(compact, result, now);
  assert.deepEqual(offers.map(p => [p.id, p.recommendedQuantity]), [
    ["solarimport:E8934", 3], ["solarimport:E8722", 4],
  ]);
  assert.equal(offers[0].recommendedQuantity * offers[0].specs.powerW >= result.solarWatts, true);
  assert.equal(selectSolarCalculatorOffers(compact, calc(24, 450), now).length, 0);
  assert.equal(selectSolarCalculatorOffers(compact, calc(12, 900), now).length, 0);
  assert.equal(selectSolarCalculatorOffers(compact, calc(12, 450.5), now).length, 0);
  assert.equal(selectSolarCalculatorOffers(compact, calc(12, 0), now).length, 0);
});

test("solar offers fail closed on stale feed, duplicates, manipulated SKU or tracking", () => {
  const id = "solarimport:E8934";
  for (const mutate of [
    p => { p.specs.powerW = 1000; },
    p => { p.specs.voltageV = 24; },
    p => { p.name = "Unverified solar panel"; },
    p => { p.productUrl = "https://example.com/"; },
    p => { p.productUrl += "?ref=other"; },
    p => { p.affiliateUrl += "&a_aid=evil"; },
    p => { p.affiliateUrl += "&data1=trick"; },
    p => { p.affiliateUrl = p.productUrl; },
    p => { p.available = false; },
    p => { p.staleSource = true; },
    p => { p.priceCurrency = "EUR"; },
    p => { p.priceCzk = -1; },
  ]) {
    const data = fixture();
    mutate(data.products.find(p => p.id === id));
    assert.equal(selectSolarCalculatorOffers(data, calc(12, 450), now).some(p => p.id === id), false);
  }
  const duplicate = fixture();
  duplicate.products.push({ ...duplicate.products[0] });
  assert.equal(selectSolarCalculatorOffers(duplicate, calc(12, 450), now)
    .some(p => p.id === duplicate.products[0].id), false);
  assert.equal(selectSolarCalculatorOffers({ ...compact, sources: { solarimport: { status: "stale" } } }, calc(12, 450), now).length, 0);
  assert.equal(selectSolarCalculatorOffers(compact, calc(12, 450), solarOfferExpiresAt(compact) + 1).length, 0);
  assert.equal(isSolarOfferStillEligible(compact, calc(12, 450), { ...compact.products[0], recommendedQuantity: 4 }, solarOfferExpiresAt(compact) + 1), false);
  assert.equal(projectSolarCalculatorOffers({ ...full, sources: { ...full.sources, solarimport: { status: "stale" } } }, now).products.length, 0);
});

test("solar loader uses only bounded read-only artifact and no full-feed fallback", async () => {
  const paths = [];
  const loaded = await loadSolarCalculatorOffers(async (path, options) => {
    paths.push({ path, options });
    return { ok: true, json: async () => fixture() };
  });
  assert.deepEqual(loaded, compact);
  assert.deepEqual(paths.map(p => p.path), [SOLAR_CALCULATOR_CATALOG_PATH]);
  assert.equal(paths[0].options.cache, "no-store");
  assert.equal(paths[0].options.redirect, "error");
  for (const data of [null, {}, { ...compact, schemaVersion: 2 }, { ...compact, products: Array.from({ length: 4 }, () => compact.products[0]) }]) {
    assert.equal(await loadSolarCalculatorOffers(async () => ({ ok: true, json: async () => data })), null);
  }
  assert.equal(await loadSolarCalculatorOffers(async () => ({ ok: false, status: 404 })), null);
  assert.equal(await loadSolarCalculatorOffers(async () => { throw Error("network error"); }), null);
});

function harness() {
  const events = [];
  const doc = {
    hidden: false,
    addEventListener() {},
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
    dataset: { calculatorIntent: "solar-sizing", calculatorLocale: "cs" },
    querySelector(s) { return s === "[data-solar-buyers]" ? section : null; },
  };
  let time = now, fetchCount = 0, consent = true;
  const windowRoot = {
    IntersectionObserver: Observer, addEventListener() {}, clearTimeout() {}, setTimeout() { return 1; },
    MyPowerSetupAnalytics: { track(name, params) { if (!consent) return false; events.push({ name, params }); return true; } },
  };
  const buyer = mountSolarCalculatorBuyers(root, {
    fetchImpl: async () => { fetchCount++; return { ok: true, json: async () => compact }; },
    now: () => time, windowRoot,
  });
  return {
    buyer, list, section, events,
    get fetchCount() { return fetchCount; }, get observer() { return observer; },
    setClock(value) { time = value; }, setConsent(value) { consent = value; },
    click(link) { let prevented = false; link.listeners.click({ type: "click", button: 0,
      preventDefault() { prevented = true; }, stopPropagation() {} }); return prevented; },
  };
}

test("solar buyer uses a real submitted result, tracks consented product exposure, and blocks expired links", async () => {
  const h = harness();
  assert.equal(h.fetchCount, 0);
  await h.buyer.update(calc(12, 450));
  assert.equal(h.fetchCount, 1);
  assert.equal(h.list.childElementCount, 2);
  const link = h.list.children[0].children.find(p => p.tag === "a");
  const url = new URL(link.href);
  assert.equal(url.searchParams.get("a_aid"), "f34c86c8");
  assert.equal(url.searchParams.get("a_bid"), "35cb7fb0");
  assert.equal(url.searchParams.get("data1"), "mps_cz_solar_panel");
  assert.equal(link.dataset.source, "solar-calculator-match");
  assert.equal(link.rel, "sponsored noopener noreferrer");
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
  await h.buyer.update(calc(12, 450));
  const refreshed = h.list.children[0].children.find(p => p.tag === "a");
  h.setClock(solarOfferExpiresAt(compact) + 1);
  assert.equal(h.click(refreshed), true);
  assert.equal(h.list.childElementCount, 0);
});

test("solar page and nightly feed projection are wired with buyer-first ordering", async () => {
  const [page, browser, sync, workflow, checker] = await Promise.all([
    readFile("kalkulacky/solarni-panely/index.html", "utf8"),
    readFile("src/calculator-landing-browser.js", "utf8"),
    readFile("scripts/sync-products.mjs", "utf8"),
    readFile(".github/workflows/sync-products.yml", "utf8"),
    readFile("scripts/check-solar-calculator-offers-cz.mjs", "utf8"),
  ]);
  assert.ok(page.indexOf("data-solar-buyers") > page.indexOf("data-result-warnings"));
  assert.ok(page.indexOf('class="calculator-actions"') > page.indexOf("data-solar-buyers"));
  assert.match(page, /data-live-offers="0" hidden/);
  assert.match(page, /Před nákupem ověřte rozměry střechy/);
  assert.match(browser, /mountSolarCalculatorBuyers\(root\)/);
  assert.match(browser, /solarBuyers\.update\(result\)/);
  assert.match(browser, /solarBuyers\?\.invalidate\(\)/);
  assert.match(sync, /projectSolarCalculatorOffers\(fullCatalog/);
  assert.match(workflow, /data\/solar-calculator-offers-cz\.json/);
  assert.match(workflow, /check-solar-calculator-offers-cz\.mjs/);
  assert.match(checker, /SOLAR_CATALOG_SOURCE_DRIFT/);
});
