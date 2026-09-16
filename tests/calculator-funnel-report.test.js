import test from "node:test";
import assert from "node:assert/strict";
import { buildCalculatorFunnelSummary, renderCalculatorFunnelMarkdown } from "../src/calculator-funnel-report.js";

test("calculator funnel groups events by locale, intent and landing path", () => {
  const common = {
    calculator_landing_path: "/kalkulacky/solarni-panely/",
    calculator_landing_intent: "solar-sizing",
    calculator_landing_locale: "cs",
  };
  const rows = buildCalculatorFunnelSummary([
    { name: "calculator_landing_view", parameters: common },
    { name: "calculator_started", parameters: common },
    { name: "calculation_completed", parameters: common },
    { name: "calculator_landing_continue", parameters: common },
    { name: "product_choice_impression", parameters: common },
    { name: "affiliate_click", parameters: common },
  ]);

  assert.deepEqual(rows, [{
    locale: "cs",
    intent: "solar-sizing",
    path: "/kalkulacky/solarni-panely/",
    views: 1,
    starts: 1,
    completes: 1,
    continues: 1,
    impressions: 1,
    clicks: 1,
    startRate: 1,
    completionRate: 1,
    continuationRate: 1,
    productClickRate: 1,
    clickThroughRate: 1,
  }]);
});

test("calculator funnel ignores events without validated landing dimensions", () => {
  assert.deepEqual(buildCalculatorFunnelSummary([
    { name: "affiliate_click", parameters: { calculator_landing_path: "/", calculator_landing_locale: "cs", calculator_landing_intent: "battery-capacity" } },
    { name: "page_view", parameters: { calculator_landing_path: "/kalkulacky/kapacita-baterie/", calculator_landing_locale: "cs", calculator_landing_intent: "battery-capacity" } },
  ]), []);
});

test("calculator funnel renders a GA/GSC-friendly markdown table", () => {
  const markdown = renderCalculatorFunnelMarkdown([{
    locale: "cs", intent: "battery-capacity", path: "/kalkulacky/kapacita-baterie/",
    views: 10, starts: 8, completes: 7, continues: 5, impressions: 4, clicks: 2, clickThroughRate: 0.2,
  }]);
  assert.match(markdown, /Landing \| Views \| Starts/);
  assert.match(markdown, /\/kalkulacky\/kapacita-baterie\//);
  assert.match(markdown, /20\.0%/);
});
