import test from "node:test";
import assert from "node:assert/strict";
import { rememberCalculatorAttribution, rememberCalculatorResultContext } from "../src/calculator-attribution.js";
import { buildAttributedAffiliateParameters } from "../src/affiliate-analytics.js";
import { createVerifiedGuideImpressionTracker } from "../src/guide-offer-impressions.js";
import { trackGuideAffiliateClick } from "../src/guide-verified-offers.js";

function storage() {
  const data = new Map();
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
  };
}

function browserContext(lang, sessionStorage) {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const listeners = new Map();
  const doc = {
    documentElement: { lang },
    hidden: false,
    addEventListener(name, listener) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(listener);
    },
    emit(name) { for (const listener of listeners.get(name) || []) listener(); },
  };
  globalThis.window = { sessionStorage };
  globalThis.document = doc;
  return {
    doc,
    restore() {
      if (originalWindow === undefined) delete globalThis.window;
      else globalThis.window = originalWindow;
      if (originalDocument === undefined) delete globalThis.document;
      else globalThis.document = originalDocument;
    },
  };
}

function verifiedLink() {
  return {
    isConnected: true,
    dataset: {
      productId: "vselektro:victron-orion-tr-12-12-30-isolated",
      category: "dc_charger",
      merchant: "vselektro",
      source: "editorial-comparison",
      offerExpiresAt: String(Date.now() + 60_000),
    },
    closest(selector) {
      return selector === "[data-guide-category] a[data-affiliate-click]" ? this : null;
    },
  };
}

function trackClick(link, analytics, overrides = {}) {
  return trackGuideAffiliateClick({
    type: "click", button: 0, target: link,
    defaultPrevented: false, ...overrides,
  }, analytics);
}

test("DC-DC calculator to reviewed guide preserves the same valid attribution for impressions and clicks", () => {
  const sessionStorage = storage();
  const ctx = browserContext("cs", sessionStorage);
  try {
    rememberCalculatorResultContext({
      sourcePath: "/kalkulacky/dc-dc-nabijecka/",
      intent: "dcdc-sizing", locale: "cs", storage: sessionStorage,
      result: {
        recommendedChargerCurrentA: 30,
        requiredOutputCurrentA: 25,
        feasibleOutputCurrentA: 35,
        batteryVoltage: 12, sourceVoltage: 14.2,
        targetMet: true,
        freeText: "should not escape",
      },
    });
    const link = verifiedLink();
    let consent = false;
    const events = [];
    const analytics = { track(name, params) {
      if (!consent) return false;
      events.push({ name, params });
      return true;
    } };

    const attrs = buildAttributedAffiliateParameters(link);
    assert.equal(attrs.calculator_landing_path, "/kalkulacky/dc-dc-nabijecka/");
    assert.equal(attrs.calculator_landing_locale, "cs");
    assert.equal(attrs.calculator_landing_intent, "dcdc-sizing");
    assert.equal(attrs.calculator_recommended_current_a, 30);
    assert.equal(attrs.calculator_target_met, true);
    assert.equal(attrs.freeText, undefined);

    let observer;
    class Observer {
      constructor(callback) { this.callback = callback; observer = this; }
      observe() {}
      unobserve() {}
      intersect(target) { this.callback([{ target, isIntersecting: true, intersectionRatio: 0.6 }]); }
    }
    const section = {
      dataset: { liveOffers: "1" },
      hidden: false,
      querySelectorAll: () => [link],
    };
    const impressions = createVerifiedGuideImpressionTracker({
      documentRoot: ctx.doc, sections: [section],
      getAnalytics: () => analytics, Observer, now: Date.now,
    });
    assert.equal(impressions.scan(), 1);
    observer.intersect(link);
    trackClick(link, analytics);
    assert.equal(events.length, 0, "consent denied: no recorded impression or outbound event");

    consent = true;
    ctx.doc.emit("mypowersetup:analytics-granted");
    trackClick(link, analytics);
    assert.deepEqual(events.map(x => x.name), ["product_choice_impression", "affiliate_click"]);
    assert.deepEqual(events[0].params, attrs, "impression must use the exact click attribution contract");
    assert.deepEqual(events[1].params, attrs);
    observer.intersect(link);
    assert.equal(events.length, 2, "impression remains once per SKU");
  } finally {
    ctx.restore();
  }
});

test("reviewed guide events stay un-attributed on unrelated market, expired session or inaccessible storage", () => {
  const sessionStorage = storage();
  rememberCalculatorAttribution({
    sourcePath: "/kalkulacky/dc-dc-nabijecka/",
    intent: "dcdc-sizing", locale: "cs", storage: sessionStorage,
  });
  const ctx = browserContext("pl", sessionStorage);
  try {
    const params = [];
    const analytics = { track(name, p) { params.push(p); return true; } };
    const link = verifiedLink();
    trackClick(link, analytics);
    assert.equal(params.length, 1);
    assert.equal(params[0].productId, link.dataset.productId);
    assert.equal(params[0].calculator_landing_path, undefined, "cross-market context fails closed");

    ctx.doc.documentElement.lang = "cs";
    rememberCalculatorAttribution({
      sourcePath: "/kalkulacky/dc-dc-nabijecka/",
      intent: "dcdc-sizing", locale: "cs", storage: sessionStorage,
      now: Date.now() - 31 * 60_000,
    });
    trackClick(link, analytics);
    assert.equal(params[1].calculator_landing_path, undefined, "expired context is not reused");

    globalThis.window = {
      get sessionStorage() { throw new Error("access denied"); },
    };
    assert.doesNotThrow(() => trackClick(link, analytics));
    assert.equal(params[2].calculator_landing_path, undefined);
  } finally {
    ctx.restore();
  }
});

test("blocked, unapproved, context-menu and unsupported outbound interactions are never counted", () => {
  const ctx = browserContext("cs", storage());
  try {
    const calls = [];
    const analytics = { track: (...args) => { calls.push(args); return true; } };
    const verified = verifiedLink();
    trackClick(verified, analytics, { defaultPrevented: true });
    trackClick(verified, analytics, { button: 2 });
    trackClick(verified, analytics, { type: "auxclick", button: 2 });
    trackClick({ ...verified, dataset: { ...verified.dataset, merchant: "unapproved" } }, analytics);
    trackClick({ ...verified, dataset: { ...verified.dataset, source: "unapproved" } }, analytics);
    assert.equal(calls.length, 0);
    trackGuideAffiliateClick({ type: "auxclick", button: 1, target: verified, defaultPrevented: false }, analytics);
    assert.equal(calls.length, 1, "real middle-button purchase opening is counted");
  } finally {
    ctx.restore();
  }
});
