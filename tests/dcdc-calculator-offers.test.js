import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateDcDcCharger } from "../src/dc-dc-charger.js";
import {
  classifyDcdcOfferOutcome, dcdcCalculatorOfferExpiresAt, dcdcReviewedModel, dcdcOfferDriveTime,
  isDcdcOfferStillEligible, selectDcdcCalculatorOffers,
  supportsDcdcBuyerShortlist,
} from "../src/dcdc-calculator-offers.js";
import { mountDcdcCalculatorBuyers } from "../src/dcdc-calculator-offers-browser.js";

const feed = JSON.parse(await readFile(new URL("../data/dcdc-guide-offers-cz.json", import.meta.url), "utf8"));
const now = Date.parse("2026-11-10T13:26:30Z");
const base = calculateDcDcCharger({
  batteryCapacityAh: 200, replenishPercent: 50, targetDriveHours: 3,
  batteryVoltage: 12, sourceVoltage: 14.2, spareAlternatorCurrentA: 50,
  batteryMaxChargeCurrentA: 100, efficiencyPercent: 90,
});
const capture = () => JSON.parse(JSON.stringify(feed));

test("exact approved 12→12 V models can be compared under the real calculated output ceiling", () => {
  assert.equal(base.recommendedChargerCurrentA, 40);
  assert.equal(supportsDcdcBuyerShortlist(base), true);
  const offers = selectDcdcCalculatorOffers(feed, base, now);
  assert.deepEqual(offers.map(offer => offer.id), [
    "vselektro:victron-orion-tr-12-12-30-isolated",
    "vselektro:victron-orion-tr-12-12-30-nonisolated",
    "vselektro:victron-orion-tr-12-12-18-isolated",
  ]);
  for (const offer of offers) {
    assert.ok(dcdcReviewedModel(offer.id).outputA <= base.recommendedChargerCurrentA);
    assert.ok(isDcdcOfferStillEligible(feed, base, offer, now));
    assert.ok(dcdcCalculatorOfferExpiresAt(feed, offer) > now);
  }
  assert.equal(selectDcdcCalculatorOffers(feed, base, now)
    .some(offer => offer.id.includes("50-nonisolated")), false, "50 A must not exceed 40 A recommendation");
});

test("24V service batteries, 24V alternators and ambiguous input voltages never see 12-to-12 affiliate links", () => {
  for (const result of [
    calculateDcDcCharger({ ...base, batteryVoltage: 24, sourceVoltage: 28.4 }),
    calculateDcDcCharger({ ...base, batteryVoltage: 12, sourceVoltage: 28.4 }),
    calculateDcDcCharger({ ...base, batteryVoltage: 12, sourceVoltage: 16.5 }),
    calculateDcDcCharger({ ...base, batteryVoltage: 12, sourceVoltage: 12 }),
    { ...base, recommendedChargerCurrentA: null },
  ]) {
    assert.equal(supportsDcdcBuyerShortlist(result), false);
    assert.deepEqual(selectDcdcCalculatorOffers(feed, result, now), []);
  }
});

test("real current limits, rounded ceilings and zero standard feasible current fail closed", () => {
  const slow = calculateDcDcCharger({
    batteryCapacityAh: 100, replenishPercent: 50, targetDriveHours: 3,
    batteryVoltage: 12, sourceVoltage: 14.2, spareAlternatorCurrentA: 50,
    batteryMaxChargeCurrentA: 100, efficiencyPercent: 90,
  });
  assert.equal(slow.recommendedChargerCurrentA, 20);
  assert.deepEqual(selectDcdcCalculatorOffers(feed, slow, now).map(x => dcdcReviewedModel(x.id).outputA), [18]);

  const impossible = calculateDcDcCharger({
    batteryCapacityAh: 100, replenishPercent: 50, targetDriveHours: 2,
    batteryVoltage: 12, sourceVoltage: 14.2, spareAlternatorCurrentA: 3,
    batteryMaxChargeCurrentA: 100, efficiencyPercent: 90,
  });
  assert.equal(impossible.recommendedChargerCurrentA, null);
  assert.deepEqual(selectDcdcCalculatorOffers(feed, impossible, now), []);

  // A caller's published one-decimal output must never authorize 18 A when
  // actual input-side available output is only 17.96 A.
  const rounded = {
    ...base, feasibleOutputCurrentA: 18.0, recommendedChargerCurrentA: 20,
    spareAlternatorCurrentA: 17.96 * 12 / (14.2 * 0.9),
  };
  assert.deepEqual(selectDcdcCalculatorOffers(feed, rounded, now), []);
});

test("expired merchant evidence, duplicate SKUs, unchecked URLs and unavailable stock never appear", () => {
  const latest = feed.products.find(x => x.id.includes("12-12-18"));
  const expiry = dcdcCalculatorOfferExpiresAt(feed, latest);
  assert.deepEqual(selectDcdcCalculatorOffers(feed, base, expiry + 1), []);
  assert.equal(isDcdcOfferStillEligible(feed, base, latest, expiry + 1), false);
  assert.deepEqual(selectDcdcCalculatorOffers({ ...capture(), sources: { vselektro: { status: "stale" } } }, base, now), []);
  const duplicate = capture();
  duplicate.products.push({ ...duplicate.products[0] });
  assert.equal(selectDcdcCalculatorOffers(duplicate, base, now).some(x => x.id === duplicate.products[0].id), false);
  const wrongUrl = capture();
  wrongUrl.products[0].productUrl = "https://www.vselektro.eu/other/";
  assert.equal(selectDcdcCalculatorOffers(wrongUrl, base, now).some(x => x.id === wrongUrl.products[0].id), false);
  const out = capture();
  out.products[0].available = false;
  assert.equal(selectDcdcCalculatorOffers(out, base, now).some(x => x.id === out.products[0].id), false);
});

function harness({ consent = true, fetchImpl = null } = {}) {
  const events = [];
  const coverageEvents = [];
  const listeners = {};
  let observer = null;
  class Observer {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.targets = new Set();
      observer = this;
    }
    observe(item) { this.targets.add(item); }
    unobserve(item) { this.targets.delete(item); }
    intersect(item, ratio = 0.7) {
      this.callback([{ target: item, isIntersecting: ratio > 0, intersectionRatio: ratio }]);
    }
  }
  const doc = {
    hidden: false,
    addEventListener(type, callback) { (listeners[type] ||= []).push(callback); },
    createElement(tag) {
      return {
        tag, ownerDocument: doc, isConnected: true, dataset: {}, children: [],
        listeners: {},
        append(child) { this.children.push(child); },
        replaceChildren() { this.children = []; },
        get childElementCount() { return this.children.length; },
        addEventListener(type, callback) { this.listeners[type] = callback; },
        closest() { return null; },
      };
    },
  };
  const list = doc.createElement("ul");
  const fallback = doc.createElement("p");
  const section = {
    ownerDocument: doc, dataset: { liveOffers: "0" }, hidden: true,
    querySelector(selector) {
      return selector === "[data-dcdc-offer-list]" ? list : selector === "[data-dcdc-offer-fallback]" ? fallback : null;
    },
    querySelectorAll() { return list.children.flatMap(row => row.children.filter(x => x.tag === "a")); },
  };
  const root = {
    dataset: { calculatorIntent: "dcdc-sizing" },
    querySelector(selector) { return selector === "[data-dcdc-buyers]" ? section : null; },
  };
  let fetches = 0;
  let clock = now;
  const win = {
    IntersectionObserver: Observer,
    MyPowerSetupAnalytics: { track(name, params) {
      if (!consent) return false;
      const target = name.startsWith("dcdc_offers_") ? coverageEvents : events;
      target.push({ name, params });
      return true;
    } },
    addEventListener(type, callback) { (listeners[type] ||= []).push(callback); },
    clearTimeout() {},
    setTimeout() { return 1; },
  };
  const fetcher = fetchImpl || (async () => {
    fetches++;
    return { ok: true, json: async () => feed };
  });
  const buyer = mountDcdcCalculatorBuyers(root, {
    fetchImpl: fetcher, now: () => clock, windowRoot: win,
  });
  const click = (link, overrides = {}) => {
    let prevented = false;
    const event = {
      type: "click", button: 0, defaultPrevented: false,
      preventDefault() { prevented = true; },
      stopPropagation() {},
      ...overrides,
    };
    link.listeners[event.type](event);
    return prevented;
  };
  return {
    buyer, doc, list, section, fallback, win, events, coverageEvents, click,
    get observer() { return observer; },
    get fetches() { return fetches; },
    setClock(value) { clock = value; },
    setConsent(value) { consent = value; for (const cb of listeners["mypowersetup:analytics-granted"] || []) cb(); },
  };
}

test("direct purchase cards render only after a deliberate calculation, preserve verified URLs, and track real clicks", async () => {
  const h = harness({ consent: false });
  assert.equal(h.section.hidden, true, "initial search preview must not expose offers");
  assert.equal(h.fetches, 0);
  await h.buyer.update(base);
  assert.equal(h.fetches, 1);
  assert.equal(h.section.hidden, false);
  assert.equal(h.section.dataset.liveOffers, "3");
  assert.equal(h.list.childElementCount, 3);
  const link = h.list.children[0].children.find(x => x.tag === "a");
  assert.ok(link.href.startsWith("https://ehub.cz/system/scripts/click.php?"));
  assert.equal(link.rel, "sponsored noopener noreferrer");
  assert.equal(link.dataset.source, "dcdc-calculator-compare");
  assert.equal(link.dataset.category, "dc_charger");
  assert.equal(h.observer.targets.has(link), true);
  h.observer.intersect(link);
  assert.equal(h.events.length, 0, "no event without analytics consent");
  h.setConsent(true);
  assert.equal(h.events.length, 1);
  assert.equal(h.events[0].name, "product_choice_impression");
  assert.equal(h.events[0].params.productId, link.dataset.productId);
  assert.equal(h.click(link), false);
  assert.equal(h.events.length, 2);
  assert.equal(h.events[1].name, "affiliate_click");
  assert.equal(h.events[1].params.productId, link.dataset.productId);
  assert.equal(h.events[1].params.source, "dcdc-calculator-compare");
  assert.equal(h.events[1].params.ctaVariant, "dcdc-longer-drive");
  assert.equal(h.click(link, { type: "auxclick", button: 2 }), false);
  assert.equal(h.events.length, 2, "context menu must not invent a commercial click");
  h.buyer.invalidate();
  assert.equal(h.section.hidden, true);
  assert.equal(h.list.childElementCount, 0);
  assert.equal(h.click(link), true, "stale previously referenced links fail closed after input change");
  assert.equal(h.events.length, 2, "stale click is not an affiliate conversion");
});

test("24V result never fetches or displays 12V merchants; expired link cancels navigation", async () => {
  const h = harness();
  await h.buyer.update(calculateDcDcCharger({ ...base, batteryVoltage: 24, sourceVoltage: 28.4 }));
  assert.equal(h.fetches, 0);
  assert.equal(h.list.childElementCount, 0);
  assert.equal(h.section.dataset.liveOffers, "0");
  assert.match(h.fallback.textContent, /24V/);

  await h.buyer.update(base);
  const link = h.list.children[0].children.find(x => x.tag === "a");
  h.setClock(dcdcCalculatorOfferExpiresAt(feed, feed.products[0]) + 1);
  assert.equal(h.click(link), true);
  assert.equal(h.events.length, 0, "expired offer cannot record a click");
  assert.equal(h.list.childElementCount, 0);
});

test("superseded slow fetch cannot revive an old product list", async () => {
  let complete;
  const pending = new Promise(resolve => { complete = resolve; });
  const h = harness({ fetchImpl: () => pending });
  const first = h.buyer.update(base);
  h.buyer.invalidate();
  complete({ ok: true, json: async () => feed });
  await first;
  assert.equal(h.list.childElementCount, 0);
  assert.equal(h.section.hidden, true);
});

test("public wiring isolates comparisons to the 12V DC-DC route and never hardcodes affiliate URLs", async () => {
  const [calc, protection, browser] = await Promise.all([
    readFile(new URL("../kalkulacky/dc-dc-nabijecka/index.html", import.meta.url), "utf8"),
    readFile(new URL("../kalkulacky/jisteni-12v/index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/phase2-calculator-browser.js", import.meta.url), "utf8"),
  ]);
  assert.match(calc, /data-dcdc-buyers/);
  assert.match(calc, /data-dcdc-offer-list/);
  assert.match(calc, /nikoli potvrzení kompatibility/);
  assert.match(calc, /phase2-calculator-browser\.js\?v=20261110-coverage1/);
  assert.match(protection, /phase2-calculator-browser\.js\?v=20261110-coverage1/);
  assert.doesNotMatch(protection, /data-dcdc-buyers/);
  assert.doesNotMatch(calc, /ehub\.cz\/system\/scripts\/click/);
  assert.match(browser, /if \(intent === "dcdc-sizing"\) void dcdcBuyers\?\.update\(result\)/);
  assert.match(browser, /function invalidateResult\(\) \{\s*dcdcBuyers\?\.invalidate\(\)/);
});


test("each reviewed SKU truthfully states whether ideal constant-current charging fits the requested drive", async () => {
  const full = selectDcdcCalculatorOffers(feed, base, now);
  assert.deepEqual(full.map(o => dcdcOfferDriveTime(base, o).displayedMinimumHours),
    [3.4, 3.4, 5.6]);
  assert.deepEqual(full.map(o => dcdcOfferDriveTime(base, o).meetsIdealTarget),
    [false, false, false], "a safe current ceiling is not evidence the desired 3h charge finishes");

  const h = harness();
  await h.buyer.update(base);
  const timingLines = h.list.children.map(row => row.children.find(node => node.dataset.dcdcTimeFit));
  assert.deepEqual(timingLines.map(node => node.dataset.dcdcTimeFit),
    ["too-slow", "too-slow", "too-slow"]);
  assert.match(timingLines[0].textContent, /nestihne ani při stálém plném proudu/);
  assert.match(timingLines[0].textContent, /nejméně 3,4 h/);
  const link = h.list.children[0].children.find(node => node.tag === "a");
  assert.equal(link.dataset.ctaVariant, "dcdc-longer-drive");
});

test("smaller charge requirement can fit while remaining an ideal-only estimate, not a promise", async () => {
  const smaller = calculateDcDcCharger({
    batteryCapacityAh: 100, replenishPercent: 50, targetDriveHours: 3,
    batteryVoltage: 12, sourceVoltage: 14.2, spareAlternatorCurrentA: 50,
    batteryMaxChargeCurrentA: 100, efficiencyPercent: 90,
  });
  const [offer] = selectDcdcCalculatorOffers(feed, smaller, now);
  const timing = dcdcOfferDriveTime(smaller, offer);
  assert.deepEqual({ outputA: timing.outputA, minimum: timing.displayedMinimumHours, fits: timing.meetsIdealTarget },
    { outputA: 18, minimum: 2.8, fits: true });
  const h = harness();
  await h.buyer.update(smaller);
  const line = h.list.children[0].children.find(node => node.dataset.dcdcTimeFit);
  assert.equal(line.dataset.dcdcTimeFit, "ideal-only");
  assert.match(line.textContent, /reálně to může trvat déle/);
  assert.match(line.textContent, /nejméně 2,8 h/);
  assert.equal(h.list.children[0].children.find(node => node.tag === "a").dataset.ctaVariant,
    "dcdc-ideal-target-only");
});

test("drive-time fit uses exact charge fraction and rejects corrupt input instead of rounded calculated current", () => {
  const offer = feed.products.find(item => item.id.includes("30-isolated"));
  const fits = { ...base, batteryCapacityAh: 120, replenishPercent: 50, targetDriveHours: 2 };
  const needsLonger = { ...fits, batteryCapacityAh: 120.00002 };
  const exact = dcdcOfferDriveTime(fits, offer);
  assert.equal(exact.minimumHours, 2);
  assert.equal(exact.meetsIdealTarget, true);
  const longer = dcdcOfferDriveTime(needsLonger, offer);
  assert.equal(longer.meetsIdealTarget, false);
  assert.equal(longer.displayedMinimumHours, 2.1,
    "the display must never round the ideal minimum down to the requested time");
  for(const candidate of [{...fits, targetDriveHours: 0}, {...fits, batteryCapacityAh: NaN},
      {...fits, replenishPercent: 101}, {...fits, targetDriveHours: Infinity}, null]) {
    assert.equal(dcdcOfferDriveTime(candidate, offer), null);
  }
  assert.equal(dcdcOfferDriveTime(fits, { id: "vselektro:unapproved" }), null);
});


test("recalculating the same 30A SKU from too slow to ideal fit records distinct visible GA4 impression variants", async () => {
  const h = harness();
  await h.buyer.update(base); // 100 Ah / 30 A = 3.33 h, 3 h target cannot be met.
  const first = h.list.children[0].children.find(x => x.tag === "a");
  assert.equal(first.dataset.ctaVariant, "dcdc-longer-drive");
  h.observer.intersect(first);
  assert.equal(h.events.length, 1);
  assert.equal(h.events[0].params.ctaVariant, "dcdc-longer-drive");

  const longerDrive = calculateDcDcCharger({
    batteryCapacityAh: 200, replenishPercent: 50, targetDriveHours: 4,
    batteryVoltage: 12, sourceVoltage: 14.2, spareAlternatorCurrentA: 50,
    batteryMaxChargeCurrentA: 100, efficiencyPercent: 90,
  });
  assert.equal(longerDrive.recommendedChargerCurrentA, 30);
  await h.buyer.update(longerDrive);
  const second = h.list.children[0].children.find(x => x.tag === "a");
  assert.equal(second.dataset.productId, first.dataset.productId);
  assert.equal(second.dataset.ctaVariant, "dcdc-ideal-target-only");
  h.observer.intersect(second);
  assert.equal(h.events.length, 2);
  assert.equal(h.events[1].params.ctaVariant, "dcdc-ideal-target-only");
  assert.equal(h.events[1].params.productId, first.dataset.productId);
  h.observer.intersect(second);
  assert.equal(h.events.length, 2, "visibility never inflates the same variant denominator");

  // A third recalculation with the first time constraint must NOT count a
  // previously exposed identical SKU+variant combination again.
  await h.buyer.update(base);
  const third = h.list.children[0].children.find(x => x.tag === "a");
  h.observer.intersect(third);
  assert.equal(h.events.length, 2);
});


test("safe buyer coverage classifier distinguishes unsupported hardware, failed/stale feeds and below-ceiling absence", () => {
  assert.equal(classifyDcdcOfferOutcome(feed, base, now), "shown");
  const unsupported = calculateDcDcCharger({ ...base, batteryVoltage: 24, sourceVoltage: 28.4 });
  assert.equal(classifyDcdcOfferOutcome(feed, unsupported, now), "unsupported");
  assert.equal(classifyDcdcOfferOutcome(null, base, now), "unavailable");
  assert.equal(classifyDcdcOfferOutcome({ ...capture(), sources: { vselektro: { status: "stale" } } }, base, now), "unavailable");
  assert.equal(classifyDcdcOfferOutcome(feed, base, Date.parse("2026-11-15T12:26:30Z")), "unavailable");
  const unavailable = capture();
  unavailable.products.forEach(p => { p.available = false; });
  assert.equal(classifyDcdcOfferOutcome(unavailable, base, now), "unavailable");

  // Approved stock exists, but the only safe recommendation is under 18 A.
  const restricted = { ...base, batteryMaxChargeCurrentA: 14, recommendedChargerCurrentA: 10 };
  assert.equal(classifyDcdcOfferOutcome(feed, restricted, now), "no_safe_match");
  assert.deepEqual(selectDcdcCalculatorOffers(feed, restricted, now), []);
});

test("one consented coverage event per deliberate submit, including missing/unsupported merchant outcome", async () => {
  const h = harness();
  assert.equal(h.coverageEvents.length, 0, "the SEO preview cannot create an outcome event");
  await h.buyer.update(base);
  assert.deepEqual(h.coverageEvents.map(e => e.name), ["dcdc_offers_shown"]);
  assert.equal(h.coverageEvents[0].params, undefined, "no electrical inputs, SKU or session data in outcome");
  const unsupported = calculateDcDcCharger({ ...base, batteryVoltage: 24, sourceVoltage: 28.4 });
  await h.buyer.update(unsupported);
  assert.deepEqual(h.coverageEvents.map(e => e.name), ["dcdc_offers_shown", "dcdc_offers_unsupported"]);
  assert.equal(h.section.dataset.liveOffers, "0");
  assert.equal(h.coverageEvents.at(-1).params, undefined);

  await h.buyer.update(base, { explicit: false });
  assert.equal(h.coverageEvents.length, 2, "a focus/tab refresh must not count as a new calculation");
  await h.buyer.update({ ...base, batteryMaxChargeCurrentA: 14, recommendedChargerCurrentA: 10 });
  assert.equal(h.coverageEvents.at(-1).name, "dcdc_offers_no_safe_match");
  assert.equal(h.coverageEvents.length, 3);
});

test("failed feed outcome has no links; consent denial and superseded requests never report phantom results", async () => {
  const unavailable = harness({ fetchImpl: async () => ({ ok: false, status: 503 }) });
  await unavailable.buyer.update(base);
  assert.deepEqual(unavailable.coverageEvents.map(e => e.name), ["dcdc_offers_unavailable"]);
  assert.equal(unavailable.section.dataset.liveOffers, "0");
  assert.equal(unavailable.events.length, 0);

  const denied = harness({ consent: false });
  await denied.buyer.update(base);
  assert.equal(denied.coverageEvents.length, 0);
  denied.setConsent(true);
  assert.equal(denied.coverageEvents.length, 0, "consent after submission must not backfill prior actions");
  await denied.buyer.update(base);
  assert.deepEqual(denied.coverageEvents.map(e => e.name), ["dcdc_offers_shown"]);

  let resolveFetch;
  const pending = new Promise(resolve => { resolveFetch = resolve; });
  const race = harness({ fetchImpl: () => pending });
  const first = race.buyer.update(base);
  race.buyer.invalidate();
  resolveFetch({ ok: true, json: async () => feed });
  await first;
  assert.equal(race.coverageEvents.length, 0, "cancelled fetch cannot emit obsolete result");
});

test("no-SKU reasons tell shoppers whether safe limits or merchant evidence block an offer", async () => {
  const h = harness();
  await h.buyer.update({ ...base, batteryMaxChargeCurrentA: 14, recommendedChargerCurrentA: 10 });
  assert.equal(h.section.dataset.liveOffers, "0");
  assert.match(h.fallback.textContent, /žádný se nevejde do bezpečného proudového limitu/);
  assert.match(h.fallback.textContent, /Nezvyšujte limit jen kvůli nákupu/);
  assert.doesNotMatch(h.fallback.textContent, /Aktuální ceny a dostupnost nelze bezpečně ověřit/);
  assert.deepEqual(h.coverageEvents.map(e => e.name), ["dcdc_offers_no_safe_match"]);

  const unavailable = harness({ fetchImpl: async () => ({ ok: false, status: 503 }) });
  await unavailable.buyer.update(base);
  assert.equal(unavailable.section.dataset.liveOffers, "0");
  assert.match(unavailable.fallback.textContent, /Aktuální ceny a dostupnost nelze bezpečně ověřit/);
  assert.doesNotMatch(unavailable.fallback.textContent, /žádný se nevejde do bezpečného proudového limitu/);
  assert.deepEqual(unavailable.coverageEvents.map(e => e.name), ["dcdc_offers_unavailable"]);

  const unsupported = harness();
  await unsupported.buyer.update(calculateDcDcCharger({ ...base, batteryVoltage: 24, sourceVoltage: 28.4 }));
  assert.match(unsupported.fallback.textContent, /Pro 24V nebo neurčité vstupní napětí/);
  assert.equal(unsupported.fetches, 0);
  assert.deepEqual(unsupported.coverageEvents.map(e => e.name), ["dcdc_offers_unsupported"]);
});
