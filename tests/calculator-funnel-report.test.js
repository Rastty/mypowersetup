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

test("real GA4 Data API rows retain route attribution and count actions, not distinct users", async () => {
  const { calculatorEventsFromGa4RunReport } = await import("../src/ga4-live-baseline.js");
  const dimensionHeaders = [
    "eventName", "customEvent:calculator_landing_path",
    "customEvent:calculator_landing_locale", "customEvent:calculator_landing_intent", "hostName",
  ].map((name) => ({ name }));
  const dimensionValues = (name) => [
    name, "/kalkulacky/kapacita-baterie/", "cs", "battery-capacity", "mypowersetup.com",
  ].map((value) => ({ value }));
  const raw = {
    dimensionHeaders,
    metricHeaders: [{ name: "eventCount" }, { name: "totalUsers" }],
    rows: [
      { dimensionValues: dimensionValues("calculation_completed"), metricValues: [{ value: "13" }, { value: "8" }] },
      { dimensionValues: dimensionValues("affiliate_click"), metricValues: [{ value: "4" }, { value: "2" }] },
    ],
  };
  const rows = buildCalculatorFunnelSummary(calculatorEventsFromGa4RunReport(raw));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].path, "/kalkulacky/kapacita-baterie/");
  assert.equal(rows[0].completes, 13);
  assert.equal(rows[0].clicks, 4);
  assert.equal(rows[0].views, 0);
  assert.equal(rows[0].clickThroughRate, null); // missing denominator is not measured zero
  assert.match(renderCalculatorFunnelMarkdown(rows), /n\/a/);
});

test("snake-case aggregated GA4 event count wins over distinct users", () => {
  const rows = buildCalculatorFunnelSummary([{
    event_name: "calculator_started",
    event_count: 7,
    total_users: 3,
    parameters: {
      calculator_landing_path: "/kalkulacky/solarni-panely/",
      calculator_landing_locale: "cs",
      calculator_landing_intent: "solar-sizing",
    },
  }]);
  assert.equal(rows[0].starts, 7);
});


test("malformed explicit GA4 counts fail closed instead of inventing one affiliate click", () => {
  const common = {
    calculator_landing_path: "/kalkulacky/kapacita-baterie/",
    calculator_landing_locale: "cs",
    calculator_landing_intent: "battery-capacity",
  };
  for (const bad of ["not-a-number", -1, 1.5, " ", Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => buildCalculatorFunnelSummary([{
      eventName: "affiliate_click", eventCount: bad, totalUsers: 7, ...common,
    }]), /CALCULATOR_FUNNEL_INVALID_EVENT_COUNT/, String(bad));
  }
  const zero = buildCalculatorFunnelSummary([{
    eventName: "affiliate_click", eventCount: 0, ...common,
  }]);
  assert.equal(zero[0].clicks, 0, "a genuine observed zero remains zero");
});
