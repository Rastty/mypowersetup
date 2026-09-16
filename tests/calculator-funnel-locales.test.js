import test from "node:test";
import assert from "node:assert/strict";
import { buildCalculatorFunnelSummary, isCalculatorLandingPath } from "../src/calculator-funnel-report.js";

const routes = [
  ["cs-CZ", "/kalkulacky/kapacita-baterie/", "battery"],
  ["sk-SK", "/sk/kalkulacky/kapacita-baterie/", "battery"],
  ["pl-PL", "/pl/kalkulatory/pojemnosc-akumulatora/", "battery"],
  ["hu-HU", "/hu/kalkulatorok/akkumulator-kapacitas/", "battery"],
];

function event(name, locale, path, intent) {
  return { event_name: name, parameters: { calculator_landing_locale: locale, calculator_landing_path: path, calculator_landing_intent: intent } };
}

test("calculator funnel accepts the four supported localized calculator roots", () => {
  const events = routes.flatMap(([locale, path, intent]) => [event("calculator_landing_view", locale, path, intent), event("calculator_started", locale, path, intent)]);
  events.push(event("calculator_landing_view", "pt-PT", "/pt/calculadoras/bateria/", "battery"));
  events.push(event("calculator_landing_view", "sk-SK", "/kalkulacky/kapacita-baterie/", "battery"));

  const rows = buildCalculatorFunnelSummary(events);
  assert.equal(rows.length, 4);
  assert.deepEqual(new Set(rows.map((row) => row.locale)), new Set(["cs", "sk", "pl", "hu"]));
  assert.ok(rows.every((row) => row.views === 1 && row.starts === 1));
});

test("calculator root validation keeps locale and path aligned", () => {
  assert.equal(isCalculatorLandingPath("/kalkulacky/dc-dc-nabijecka/", "cs-CZ"), true);
  assert.equal(isCalculatorLandingPath("/sk/kalkulacky/dc-dc-nabijacka/", "sk"), true);
  assert.equal(isCalculatorLandingPath("/pl/kalkulatory/dc-dc/", "pl-PL"), true);
  assert.equal(isCalculatorLandingPath("/hu/kalkulatorok/dc-dc/", "hu-HU"), true);
  assert.equal(isCalculatorLandingPath("/kalkulacky/dc-dc-nabijecka/", "sk-SK"), false);
  assert.equal(isCalculatorLandingPath("/pt/calculadoras/dc-dc/", "pt-PT"), false);
});

test("product click rate is measured against product impressions", () => {
  const [locale, path, intent] = routes[0];
  const rows = buildCalculatorFunnelSummary([
    event("calculator_landing_view", locale, path, intent),
    event("product_choice_impression", locale, path, intent),
    event("product_choice_impression", locale, path, intent),
    event("affiliate_click", locale, path, intent),
  ]);
  assert.equal(rows[0].productClickRate, 0.5);
  assert.equal(rows[0].clickThroughRate, 1);
});
