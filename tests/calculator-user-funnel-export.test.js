import test from "node:test";
import assert from "node:assert/strict";
import { buildCalculatorFunnelSummary } from "../src/calculator-funnel-report.js";
import { normalizeGa4CalculatorEventRows, parseDelimitedText } from "../src/calculator-growth-input.js";

test("GA4 Total users drives funnel rates when repeat event counts are higher", () => {
  const csv = [
    "Event name,Event count,Total users,Calculator landing path,Calculator landing locale,Calculator landing intent",
    "calculator_landing_view,50,40,/kalkulacky/kapacita-baterie/,cs,battery-capacity",
    "calculator_started,25,25,/kalkulacky/kapacita-baterie/,cs,battery-capacity",
    "calculation_completed,40,20,/kalkulacky/kapacita-baterie/,cs,battery-capacity",
    "calculator_landing_continue,12,8,/kalkulacky/kapacita-baterie/,cs,battery-capacity",
    "product_choice_impression,30,12,/kalkulacky/kapacita-baterie/,cs,battery-capacity",
    "affiliate_click,5,3,/kalkulacky/kapacita-baterie/,cs,battery-capacity",
  ].join("\n");

  const events = normalizeGa4CalculatorEventRows(parseDelimitedText(csv));
  const [row] = buildCalculatorFunnelSummary(events);

  assert.equal(events[2].event_count, 40);
  assert.equal(events[2].total_users, 20);
  assert.equal(events[2].funnel_count, 20);
  assert.equal(row.views, 40);
  assert.equal(row.starts, 25);
  assert.equal(row.completes, 20);
  assert.equal(row.continues, 8);
  assert.equal(row.impressions, 12);
  assert.equal(row.clicks, 3);
  assert.equal(row.startRate, 0.625);
  assert.equal(row.completionRate, 0.8);
  assert.equal(row.continuationRate, 0.4);
  assert.equal(row.productClickRate, 0.25);
});

test("camelCase GA4 export keys normalize without a manual rename step", () => {
  const [event] = normalizeGa4CalculatorEventRows([{
    eventName: "affiliate_click",
    eventCount: 7,
    totalUsers: 4,
    calculatorLandingPath: "/pl/kalkulatory/panele-solarne/",
    calculatorLandingLocale: "pl",
    calculatorLandingIntent: "solar-sizing",
  }]);

  assert.deepEqual(event, {
    event_name: "affiliate_click",
    event_count: 7,
    total_users: 4,
    funnel_count: 4,
    calculator_landing_path: "/pl/kalkulatory/panele-solarne/",
    calculator_landing_locale: "pl",
    calculator_landing_intent: "solar-sizing",
  });
});
