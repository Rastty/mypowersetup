import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  CALCULATOR_ATTRIBUTION_MAX_AGE_MS,
  clearCalculatorAttribution,
  rememberCalculatorAttribution,
  resolveCalculatorAttribution,
} from "../src/calculator-attribution.js";

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

test("affiliate events append calculator landing attribution before sending", async () => {
  const affiliateAnalytics = await readFile(new URL("../src/affiliate-analytics.js", import.meta.url), "utf8");
  assert.match(affiliateAnalytics, /resolveCalculatorAttribution/);
  assert.match(affiliateAnalytics, /affiliate_click/);
  assert.match(affiliateAnalytics, /product_choice_impression/);
  assert.match(affiliateAnalytics, /product_choices_rendered/);
});
