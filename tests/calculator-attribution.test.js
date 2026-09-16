import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  CALCULATOR_ATTRIBUTION_MAX_AGE_MS,
  clearCalculatorAttribution,
  rememberCalculatorAttribution,
  rememberCalculatorResultContext,
  resolveCalculatorAttribution,
} from "../src/calculator-attribution.js";
import { trackAffiliateClick, trackAffiliateImpressions } from "../src/affiliate-analytics.js";

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

test("calculator landing attribution survives the same-origin journey", () => {
  const storage = memoryStorage();
  const now = 1_700_000_000_000;
  assert.deepEqual(
    rememberCalculatorAttribution({
      sourcePath: "/kalkulacky/solarni-panely/",
      intent: "solar-sizing",
      locale: "cs",
      storage,
      now,
    }),
    {
      calculator_landing_path: "/kalkulacky/solarni-panely/",
      calculator_landing_intent: "solar-sizing",
      calculator_landing_locale: "cs",
      calculator_source_context: "seo_landing",
    }
  );
  assert.deepEqual(resolveCalculatorAttribution({ storage, market: "cz", now: now + 60_000 }), {
    calculator_landing_path: "/kalkulacky/solarni-panely/",
    calculator_landing_intent: "solar-sizing",
    calculator_landing_locale: "cs",
    calculator_source_context: "seo_landing",
  });
});

test("all currently published calculator landing families can persist attribution", () => {
  const cases = [
    ["/kalkulacky/mppt-regulator/", "mppt-sizing", "cs"],
    ["/kalkulacky/dc-dc-nabijecka/", "dcdc-sizing", "cs"],
    ["/kalkulacky/jisteni-12v/", "dc-protection", "cs"],
    ["/sk/kalkulacky/kapacita-baterie/", "battery-capacity", "sk"],
    ["/sk/kalkulacky/solarne-panely/", "solar-sizing", "sk"],
    ["/pl/kalkulatory/pojemnosc-akumulatora/", "battery-capacity", "pl"],
    ["/pl/kalkulatory/panele-solarne/", "solar-sizing", "pl"],
    ["/hu/kalkulatorok/akkumulator-kapacitas/", "battery-capacity", "hu"],
    ["/hu/kalkulatorok/napelem-teljesitmeny/", "solar-sizing", "hu"],
  ];

  for (const [sourcePath, intent, locale] of cases) {
    const storage = memoryStorage();
    const attribution = rememberCalculatorAttribution({ sourcePath, intent, locale, storage, now: 1_700_000_000_000 });
    assert.equal(attribution?.calculator_landing_path, sourcePath);
    assert.equal(attribution?.calculator_landing_intent, intent);
    assert.equal(attribution?.calculator_landing_locale, locale);
    assert.equal(resolveCalculatorAttribution({ storage, market: locale, now: 1_700_000_001_000 })?.calculator_landing_path, sourcePath);
  }
});

test("calculator attribution rejects mismatched route, intent and locale", () => {
  const storage = memoryStorage();
  assert.equal(rememberCalculatorAttribution({ sourcePath: "/kalkulacky/solarni-panely/", intent: "battery-capacity", locale: "cs", storage }), null);
  assert.equal(rememberCalculatorAttribution({ sourcePath: "/kalkulacky/solarni-panely/", intent: "solar-sizing", locale: "pl", storage }), null);
  assert.equal(rememberCalculatorAttribution({ sourcePath: "/pl/kalkulatory/panele-solarne/", intent: "solar-sizing", locale: "cs", storage }), null);
  assert.equal(storage.values.size, 0);
});

test("calculator attribution expires, clears corrupt values and does not cross markets", () => {
  const storage = memoryStorage();
  const now = 1_700_000_000_000;
  rememberCalculatorAttribution({ sourcePath: "/kalkulacky/vykon-menice/", intent: "inverter-sizing", locale: "cs", storage, now });
  assert.equal(resolveCalculatorAttribution({ storage, market: "pl", now: now + 1 }), null);
  assert.equal(resolveCalculatorAttribution({ storage, market: "cz", now: now + CALCULATOR_ATTRIBUTION_MAX_AGE_MS + 1 }), null);
  assert.equal(storage.values.size, 0);

  storage.setItem("mypowersetup_calculator_attribution", "not-json");
  assert.equal(resolveCalculatorAttribution({ storage, market: "cz", now }), null);
  assert.equal(storage.values.size, 0);
  assert.equal(clearCalculatorAttribution(storage), true);
});

test("landing browser loads consent analytics and exposes the required funnel events", async () => {
  const browser = await readFile(new URL("../src/calculator-landing-browser.js", import.meta.url), "utf8");
  assert.match(browser, /import "\.\/analytics\.js"/);
  assert.match(browser, /calculator_landing_view/);
  assert.match(browser, /calculator_started/);
  assert.match(browser, /calculation_completed/);
  assert.match(browser, /calculator_landing_continue/);
  assert.match(browser, /mypowersetup:analytics-granted/);
  assert.match(browser, /rememberCalculatorAttribution/);
});

test("phase-2 landing browser uses the same consent analytics and attribution contract", async () => {
  const browser = await readFile(new URL("../src/phase2-calculator-browser.js", import.meta.url), "utf8");
  assert.match(browser, /import "\.\/analytics\.js"/);
  assert.match(browser, /calculator_landing_view/);
  assert.match(browser, /calculator_started/);
  assert.match(browser, /calculation_completed/);
  assert.match(browser, /calculator_landing_continue/);
  assert.match(browser, /mypowersetup:analytics-granted/);
  assert.match(browser, /rememberCalculatorAttribution/);
  assert.match(browser, /rememberCalculatorResultContext/);
});

test("affiliate clicks and impressions receive the stored calculator landing context", () => {
  const storage = memoryStorage();
  rememberCalculatorAttribution({
    sourcePath: "/kalkulacky/kapacita-baterie/",
    intent: "battery-capacity",
    locale: "cs",
    storage,
  });

  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  globalThis.window = { sessionStorage: storage };
  globalThis.document = { documentElement: { lang: "cs" } };

  try {
    const link = { dataset: { productId: "battery-100", merchant: "example", category: "battery", source: "recommendation" } };
    const events = [];
    const tracker = (name, parameters) => { events.push({ name, parameters }); return true; };

    assert.equal(trackAffiliateClick(link, tracker), true);
    assert.equal(trackAffiliateImpressions([link], tracker), true);

    const affiliate = events.find((event) => event.name === "affiliate_click");
    const impression = events.find((event) => event.name === "product_choice_impression");
    for (const event of [affiliate, impression]) {
      assert.equal(event.parameters.calculator_landing_path, "/kalkulacky/kapacita-baterie/");
      assert.equal(event.parameters.calculator_landing_intent, "battery-capacity");
      assert.equal(event.parameters.calculator_landing_locale, "cs");
      assert.equal(event.parameters.calculator_source_context, "seo_landing");
    }
  } finally {
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument;
  }
});

test("validated DC-DC result context reaches product impressions and affiliate clicks", () => {
  const storage = memoryStorage();
  const now = 1_700_000_000_000;
  rememberCalculatorAttribution({
    sourcePath: "/kalkulacky/dc-dc-nabijecka/",
    intent: "dcdc-sizing",
    locale: "cs",
    storage,
    now,
  });
  const stored = rememberCalculatorResultContext({
    sourcePath: "/kalkulacky/dc-dc-nabijecka/",
    intent: "dcdc-sizing",
    locale: "cs",
    storage,
    now: now + 1_000,
    result: {
      recommendedChargerCurrentA: 30,
      requiredOutputCurrentA: 34.6,
      feasibleOutputCurrentA: 30,
      batteryVoltage: 12,
      sourceVoltage: 14.4,
      targetMet: false,
      ignoredFreeText: "must not escape",
    },
  });
  assert.equal(stored.calculator_recommended_current_a, 30);
  assert.equal(stored.calculator_system_voltage, 12);
  assert.equal(stored.calculator_target_met, false);
  assert.equal("ignoredFreeText" in stored, false);
  assert.equal(resolveCalculatorAttribution({ storage, market: "sk", now: now + 2_000 }), null);

  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  globalThis.window = { sessionStorage: storage };
  globalThis.document = { documentElement: { lang: "cs" } };
  try {
    const link = { dataset: { productId: "ampul_cz:6195", merchant: "ampul_cz", category: "dc_charger", source: "recommendation" } };
    const events = [];
    const tracker = (name, parameters) => { events.push({ name, parameters }); return true; };
    assert.equal(trackAffiliateClick(link, tracker), true);
    assert.equal(trackAffiliateImpressions([link], tracker), true);
    for (const event of events.filter((item) => ["affiliate_click", "product_choice_impression"].includes(item.name))) {
      assert.equal(event.parameters.calculator_landing_intent, "dcdc-sizing");
      assert.equal(event.parameters.calculator_recommended_current_a, 30);
      assert.equal(event.parameters.calculator_required_current_a, 34.6);
      assert.equal(event.parameters.calculator_feasible_current_a, 30);
      assert.equal(event.parameters.calculator_system_voltage, 12);
      assert.equal(event.parameters.calculator_source_voltage, 14.4);
      assert.equal(event.parameters.calculator_target_met, false);
      assert.equal("ignoredFreeText" in event.parameters, false);
    }
  } finally {
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument;
  }
});

test("invalid DC-DC result values are dropped rather than persisted", () => {
  const storage = memoryStorage();
  rememberCalculatorResultContext({
    sourcePath: "/kalkulacky/dc-dc-nabijecka/",
    intent: "dcdc-sizing",
    locale: "cs",
    storage,
    result: {
      recommendedChargerCurrentA: 9999,
      requiredOutputCurrentA: "not-a-number",
      feasibleOutputCurrentA: -10,
      batteryVoltage: 48,
      sourceVoltage: 100,
      targetMet: "yes",
    },
  });
  const resolved = resolveCalculatorAttribution({ storage, market: "cs" });
  assert.equal(resolved.calculator_landing_intent, "dcdc-sizing");
  assert.equal("calculator_recommended_current_a" in resolved, false);
  assert.equal("calculator_required_current_a" in resolved, false);
  assert.equal("calculator_feasible_current_a" in resolved, false);
  assert.equal("calculator_system_voltage" in resolved, false);
  assert.equal("calculator_source_voltage" in resolved, false);
  assert.equal("calculator_target_met" in resolved, false);
});