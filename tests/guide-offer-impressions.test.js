import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createVerifiedGuideImpressionTracker } from "../src/guide-offer-impressions.js";
import { buildAffiliateClickParameters } from "../src/affiliate-analytics.js";

const PAGE = [
  "pruvodce/kapacita-baterie-do-karavanu/",
  "pruvodce/jak-vybrat-mppt-regulator/",
  "pruvodce/jak-vybrat-dc-dc-nabijecku/",
  "pruvodce/lifepo4-100ah-nebo-200ah-karavan/",
  "pruvodce/victron-mppt-100-20-vs-100-30-vs-100-50/",
  "pruvodce/dc-dc-nabijecka-18a-vs-30a-vs-50a-karavan/",
];

function link(id = "vselektro:victron-smartsolar-100-20", overrides = {}) {
  return {
    isConnected: true,
    dataset: {
      productId: id,
      merchant: "vselektro",
      category: "controller",
      source: "editorial-comparison",
      offerExpiresAt: "1800000",
      ...overrides,
    },
    closest() { return null; },
  };
}

function harness(initialLinks = [link()], opts = {}) {
  const handlers = new Map();
  const doc = {
    hidden: false,
    addEventListener(name, handler) {
      if (!handlers.has(name)) handlers.set(name, []);
      handlers.get(name).push(handler);
    },
    emit(name) { for (const handler of handlers.get(name) || []) handler(); },
  };
  let observer;
  class MockObserver {
    constructor(callback, options) {
      observer = this;
      this.callback = callback;
      this.options = options;
      this.observed = new Set();
    }
    observe(target) { this.observed.add(target); }
    unobserve(target) { this.observed.delete(target); }
    intersect(target, ratio = 0.5) {
      this.callback([{ target, isIntersecting: ratio > 0, intersectionRatio: ratio }]);
    }
  }
  const section = {
    dataset: { liveOffers: "1" },
    hidden: false,
    links: initialLinks,
    querySelectorAll(selector) {
      assert.equal(selector, "a[data-affiliate-click][data-product-id][data-offer-expires-at]");
      return this.links;
    },
  };
  let allowed = Boolean(opts.allowed);
  let time = opts.now ?? 1000;
  const events = [];
  const analytics = {
    track(event, parameters) {
      if (!allowed) return false;
      events.push({ event, parameters });
      return true;
    },
  };
  const tracker = createVerifiedGuideImpressionTracker({
    documentRoot: doc, sections: [section], getAnalytics: () => analytics, Observer: MockObserver, now: () => time,
    ...(opts.allowedSources ? { allowedSources: opts.allowedSources } : {}),
  });
  return {
    tracker, doc, section, events,
    get observer() { return observer; },
    setConsent(value) { allowed = value; doc.emit("mypowersetup:analytics-granted"); },
    setNow(value) { time = value; },
  };
}

test("editorial impression only after 50% actual viewport exposure and consent", () => {
  const target = link();
  const h = harness([target]);
  assert.equal(h.tracker.scan(), 1);
  assert.deepEqual(h.observer.options, { threshold: [0, 0.5] });
  assert.equal(h.observer.observed.has(target), true);
  h.observer.intersect(target, 0.4);
  assert.equal(h.events.length, 0, "merely rendering or 40% visibility is not an impression");
  h.observer.intersect(target, 0.6);
  assert.equal(h.events.length, 0, "without consent no event is sent");
  h.setConsent(true);
  assert.equal(h.events.length, 1);
  assert.equal(h.events[0].event, "product_choice_impression");
  assert.deepEqual(h.events[0].parameters, buildAffiliateClickParameters(target));
  h.doc.emit("mypowersetup:analytics-granted");
  h.observer.intersect(target, 0.7);
  assert.equal(h.events.length, 1, "no repeat impression on additional scroll/consent");
});

test("catalog refresh cannot duplicate impressions for already seen SKU or detached link", () => {
  const first = link();
  const h = harness([first], { allowed: true });
  h.tracker.scan();
  h.observer.intersect(first);
  assert.equal(h.events.length, 1);
  first.isConnected = false;
  const replacement = link();
  h.section.links = [replacement];
  h.tracker.scan();
  assert.equal(h.observer.observed.has(first), false);
  h.observer.intersect(first);
  h.observer.intersect(replacement);
  assert.equal(h.events.length, 1, "same merchant/category/SKU counted once per page");
  const different = link("vselektro:victron-smartsolar-100-30");
  h.section.links = [different];
  h.tracker.scan();
  h.observer.intersect(different);
  assert.equal(h.events.length, 2, "different verified SKU has its own impression");
});

test("expired evidence, unknown affiliate identity and hidden pages fail closed", () => {
  const expired = link(undefined, { offerExpiresAt: "999" });
  const wrongMerchant = link("unapproved", { merchant: "unapproved" });
  const wrongSource = link("unapproved2", { source: "unknown" });
  const missingExpiry = link("unapproved3", { offerExpiresAt: "unknown" });
  const h = harness([expired, wrongMerchant, wrongSource, missingExpiry], { allowed: true });
  h.tracker.scan();
  for (const item of h.section.links) h.observer.intersect(item);
  assert.equal(h.events.length, 0);
  const fresh = link();
  h.section.links = [fresh];
  h.tracker.scan();
  h.doc.hidden = true;
  h.observer.intersect(fresh);
  assert.equal(h.events.length, 0, "background tab does not count visible impression");
  h.doc.hidden = false;
  h.doc.emit("visibilitychange");
  assert.equal(h.events.length, 1);
  h.setNow(2_000_000);
  const later = link("vselektro:victron-smartsolar-100-30");
  h.section.links = [later];
  h.tracker.scan();
  h.observer.intersect(later);
  assert.equal(h.events.length, 1, "a later expired offer cannot be counted");
});

test("hidden, empty catalog, and unsupported observers do not fabricate exposures", () => {
  const hidden = harness([], { allowed: true });
  hidden.section.dataset.liveOffers = "0";
  assert.equal(hidden.tracker.scan(), 0);
  assert.equal(hidden.observer.observed.size, 0);
  assert.equal(createVerifiedGuideImpressionTracker({ documentRoot: hidden.doc, sections: [], Observer: undefined }), null);
});

test("all six CZ offer-bearing pages load the refreshed impression-capable script", async () => {
  for (const route of PAGE) {
    const html = await readFile(new URL("../" + route + "index.html", import.meta.url), "utf8");
    assert.match(html, /data-guide-category="(battery|controller|dc_charger)"/, route);
    assert.match(html, /src="\/src\/guide-verified-offers\.js\?v=20261110-attributed-offers1"/, route);
  }
  const source = await readFile(new URL("../src/guide-verified-offers.js", import.meta.url), "utf8");
  assert.match(source, /impressionTracker\?\.scan\(\)/);
  assert.match(source, /dataset\.offerExpiresAt/);
});

test("calculator MPPT matches reuse viewport impression rules without altering editorial source defaults", () => {
  const matched = link("vselektro:victron-smartsolar-100-50", {
    source: "mppt-calculator-match", offerExpiresAt: "5000",
  });
  const editorial = harness([matched], { allowed: true, now: 1000 });
  editorial.tracker.scan();
  editorial.observer.intersect(matched, 0.75);
  assert.equal(editorial.events.length, 0, "editorial tracker refuses calculator-only source by default");

  const actual = link("vselektro:victron-smartsolar-100-50", {
    source: "mppt-calculator-match", offerExpiresAt: "5000",
  });
  const calculator = harness([actual], {
    allowed: false, now: 1000, allowedSources: ["mppt-calculator-match"],
  });
  calculator.tracker.scan();
  calculator.observer.intersect(actual, 0.4);
  assert.equal(calculator.events.length, 0, "40% visible does not count");
  calculator.observer.intersect(actual, 0.7);
  assert.equal(calculator.events.length, 0, "no consent means no recorded event");
  calculator.setConsent(true);
  assert.equal(calculator.events.length, 1);
  assert.equal(calculator.events[0].event, "product_choice_impression");
  assert.equal(calculator.events[0].parameters.source, "mppt-calculator-match");
  calculator.doc.emit("visibilitychange");
  assert.equal(calculator.events.length, 1, "one SKU counted once");
  calculator.setNow(5001);
  const another = link("vselektro:victron-smartsolar-100-30", {
    source: "mppt-calculator-match", offerExpiresAt: "5000",
  });
  calculator.section.links = [another];
  calculator.tracker.scan();
  calculator.observer.intersect(another, 0.8);
  assert.equal(calculator.events.length, 1, "expired visible product must never count");
});


test("DC-DC impressions count one real exposure per reviewed SKU and drive-time variant", () => {
  const initial = link("vselektro:victron-orion-tr-12-12-30-isolated", {
    category: "dc_charger", source: "dcdc-calculator-compare",
    ctaVariant: "dcdc-longer-drive", offerExpiresAt: "5000",
  });
  const h = harness([initial], {
    allowed: true, now: 1000, allowedSources: ["dcdc-calculator-compare"],
  });
  h.tracker.scan();
  h.observer.intersect(initial, 0.75);
  assert.equal(h.events.length, 1);
  assert.equal(h.events[0].parameters.ctaVariant, "dcdc-longer-drive");

  // Scrolls, focus events and a refreshed catalog with the same comparison
  // must not generate synthetic additional impressions.
  h.doc.emit("visibilitychange");
  h.observer.intersect(initial, 0.8);
  const same = link(initial.dataset.productId, { ...initial.dataset });
  h.section.links = [same];
  h.tracker.scan();
  h.observer.intersect(same, 0.8);
  assert.equal(h.events.length, 1);

  // A new explicit calculation changes the same SKU from "too slow" to
  // "ideal only"; the user now actually sees a distinct commercial claim.
  const changed = link(initial.dataset.productId, {
    ...initial.dataset, ctaVariant: "dcdc-ideal-target-only",
  });
  h.section.links = [changed];
  h.tracker.scan();
  h.observer.intersect(changed, 0.4);
  assert.equal(h.events.length, 1);
  h.observer.intersect(changed, 0.7);
  assert.equal(h.events.length, 2);
  assert.deepEqual(h.events.map(item => item.parameters.ctaVariant),
    ["dcdc-longer-drive", "dcdc-ideal-target-only"]);
  h.doc.emit("mypowersetup:analytics-granted");
  h.observer.intersect(changed, 0.9);
  assert.equal(h.events.length, 2, "same SKU + same variant only once");

  // The original combination was already seen and must not be counted a
  // second time when a later explicit recalculation returns to that state.
  const again = link(initial.dataset.productId, { ...initial.dataset });
  h.section.links = [again];
  h.tracker.scan();
  h.observer.intersect(again, 0.8);
  assert.equal(h.events.length, 2);
});

test("missing or unreviewed DC-DC variant cannot create a new impression denominator", () => {
  const bad = link("vselektro:victron-orion-tr-12-12-30-isolated", {
    category: "dc_charger", source: "dcdc-calculator-compare",
    offerExpiresAt: "5000",
  });
  const h = harness([bad], {
    allowed: true, now: 1000, allowedSources: ["dcdc-calculator-compare"],
  });
  h.tracker.scan();
  h.observer.intersect(bad, 0.9);
  assert.equal(h.events.length, 0);
  for (const variant of ["unreviewed", "", "dcdc-ideal-target-only-copy"]) {
    const next = link(bad.dataset.productId, { ...bad.dataset, ctaVariant: variant });
    h.section.links = [next];
    h.tracker.scan();
    h.observer.intersect(next, 0.9);
  }
  assert.equal(h.events.length, 0);
});
