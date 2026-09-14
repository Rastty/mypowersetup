import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  CALCULATOR_ATTRIBUTION_MAX_AGE_MS,
  clearCalculatorAttribution,
  rememberCalculatorAttribution,
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

test("calculator attribution rejects mismatched route, intent and locale", () => {
  const storage = memoryStorage();
  assert.equal(rememberCalculatorAttribution({ sourcePath: "/kalkulacky/solarni-panely/", intent: "battery-capacity", locale: "cs", storage }), null);
  assert.equal(rememberCalculatorAttribution({ sourcePath: "/kalkulacky/solarni-panely/", intent: "solar-sizing", locale: "pl", storage }), null);
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
