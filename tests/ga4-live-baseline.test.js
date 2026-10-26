import test from "node:test";
import assert from "node:assert/strict";

import {
  assertCompleteGa4Report,
  calculatorEventsFromGa4RunReport,
  ga4SummaryRowsFromRunReport,
  ga4CalculatorDimensionFilter,
  ga4MetadataDimensionState,
  normalizeWebHostname,
  selectExactGa4WebStream,
} from "../src/ga4-live-baseline.js";

test("normalizes exact GA4 web hostnames without accepting unrelated properties", () => {
  assert.equal(normalizeWebHostname("https://MyPowerSetup.com/path"), "mypowersetup.com");
  assert.equal(normalizeWebHostname("www.mypowersetup.com"), "www.mypowersetup.com");
  assert.equal(normalizeWebHostname(""), "");
});

test("selects the MyPowerSetup web stream and ignores legacy unrelated streams", () => {
  const selected = selectExactGa4WebStream([
    {
      property: "properties/389307199",
      displayName: "legacy",
      streams: [{
        name: "properties/389307199/dataStreams/1",
        type: "WEB_DATA_STREAM",
        webStreamData: { defaultUri: "https://offroady.eu", measurementId: "G-OLD" },
      }],
    },
    {
      property: "properties/999",
      displayName: "MyPowerSetup",
      streams: [{
        name: "properties/999/dataStreams/2",
        type: "WEB_DATA_STREAM",
        displayName: "mypowersetup.com",
        webStreamData: { defaultUri: "https://mypowersetup.com/", measurementId: "G-NEW" },
      }],
    },
  ]);

  assert.equal(selected.property, "properties/999");
  assert.equal(selected.measurementId, "G-NEW");
  assert.equal(selected.hostname, "mypowersetup.com");
});

test("fails closed if the target stream cannot be identified exactly", () => {
  assert.throws(
    () => selectExactGa4WebStream([{
      property: "properties/1",
      streams: [{ type: "WEB_DATA_STREAM", webStreamData: { defaultUri: "https://bestheadphone.eu" } }],
    }]),
    /GA4_EXACT_HOST_STREAM_NOT_FOUND/,
  );
});

test("fails closed on multiple exact-host stream candidates", () => {
  assert.throws(
    () => selectExactGa4WebStream([
      { property: "properties/1", streams: [{ name: "s1", type: "WEB_DATA_STREAM", webStreamData: { defaultUri: "https://mypowersetup.com" } }] },
      { property: "properties/2", streams: [{ name: "s2", type: "WEB_DATA_STREAM", webStreamData: { defaultUri: "https://www.mypowersetup.com" } }] },
    ]),
    /GA4_EXACT_HOST_STREAM_AMBIGUOUS/,
  );
});

test("requires all canonical route-level calculator custom dimensions", () => {
  const state = ga4MetadataDimensionState({
    dimensions: [
      { apiName: "customEvent:calculator_landing_path" },
      { apiName: "customEvent:calculator_landing_locale" },
    ],
  });

  assert.equal(state.ready, false);
  assert.deepEqual(state.missing, ["customEvent:calculator_landing_intent"]);
});

test("flattens a GA4 Data API report into the existing funnel input shape", () => {
  const events = calculatorEventsFromGa4RunReport({
    dimensionHeaders: [
      { name: "eventName" },
      { name: "customEvent:calculator_landing_path" },
      { name: "customEvent:calculator_landing_locale" },
      { name: "customEvent:calculator_landing_intent" },
      { name: "hostName" },
    ],
    metricHeaders: [{ name: "eventCount" }, { name: "totalUsers" }],
    rows: [{
      dimensionValues: [
        { value: "calculation_completed" },
        { value: "/kalkulacky/kapacita-baterie/" },
        { value: "cs" },
        { value: "battery-capacity" },
        { value: "mypowersetup.com" },
      ],
      metricValues: [{ value: "13" }, { value: "8" }],
    }],
  });

  assert.deepEqual(events, [{
    eventName: "calculation_completed",
    eventCount: 13,
    totalUsers: 8,
    calculatorLandingPath: "/kalkulacky/kapacita-baterie/",
    calculatorLandingLocale: "cs",
    calculatorLandingIntent: "battery-capacity",
    hostName: "mypowersetup.com",
  }]);
});

test("GA4 missing or malformed eventCount fails closed instead of becoming measured zero", () => {
  const report = (value) => ({
    dimensionHeaders: [{ name: "eventName" }],
    metricHeaders: [{ name: "eventCount" }, { name: "totalUsers" }],
    rows: [{ dimensionValues: [{ value: "affiliate_click" }], metricValues: [{ value }, { value: "1" }] }],
  });
  for (const value of ["", "  ", null, undefined]) {
    assert.throws(() => calculatorEventsFromGa4RunReport(report(value)), /GA4_CALCULATOR_EVENT_COUNT_MISSING/);
  }
  for (const value of ["not-a-number", "-1", "1.5", "9007199254740992"]) {
    assert.throws(() => calculatorEventsFromGa4RunReport(report(value)), /GA4_CALCULATOR_EVENT_COUNT_INVALID/);
  }
  const zero = calculatorEventsFromGa4RunReport(report("0"));
  assert.equal(zero[0].eventCount, 0, "observed numeric zero must stay zero");
  assert.equal(zero[0].totalUsers, 1);
  const missingUsers = report("2");
  missingUsers.rows[0].metricValues[1] = { value: "" };
  assert.equal(calculatorEventsFromGa4RunReport(missingUsers)[0].totalUsers, null, "unknown users are not zero");
});

test("builds an exact target-host and calculator-event filter", () => {
  const filter = ga4CalculatorDimensionFilter("mypowersetup.com");
  const [hostExpression, eventExpression] = filter.andGroup.expressions;
  assert.deepEqual(hostExpression.filter.inListFilter.values, ["mypowersetup.com", "www.mypowersetup.com"]);
  assert.ok(eventExpression.filter.inListFilter.values.includes("affiliate_click"));
});


test("GA4 report completeness rejects silent 10000-row truncation and missing rowCount", () => {
  const report = { rowCount: 2, rows: [{ dimensionValues: [{ value: "affiliate_click" }] }] };
  assert.throws(() => assertCompleteGa4Report(report), /GA4_REPORT_ROWS_INCOMPLETE:1\\/2/);
  assert.throws(() => assertCompleteGa4Report({ rows: [] }), /GA4_REPORT_ROW_COUNT_MISSING_OR_INVALID/);
  assert.deepEqual(assertCompleteGa4Report({ rowCount: 0, rows: [] }).rows, []);
});

test("GA4 summary keeps genuine zero but never invents missing affiliate-click counts", () => {
  const report = (count, users = "") => ({
    rowCount: 1,
    dimensionHeaders: [{ name: "eventName" }, { name: "hostName" }],
    metricHeaders: [{ name: "eventCount" }, { name: "totalUsers" }],
    rows: [{
      dimensionValues: [{ value: "affiliate_click" }, { value: "mypowersetup.com" }],
      metricValues: [{ value: count }, { value: users }],
    }],
  });
  assert.deepEqual(ga4SummaryRowsFromRunReport(report("0")), [{
    eventName: "affiliate_click", hostName: "mypowersetup.com", eventCount: 0, totalUsers: null,
  }]);
  assert.deepEqual(ga4SummaryRowsFromRunReport(report("2", "1"))[0].totalUsers, 1);
  for (const count of ["", "  ", null, undefined]) {
    assert.throws(() => ga4SummaryRowsFromRunReport(report(count)), /GA4_CALCULATOR_EVENT_COUNT_MISSING/);
  }
  assert.throws(() => ga4SummaryRowsFromRunReport(report("-1")), /GA4_CALCULATOR_EVENT_COUNT_INVALID/);
});
