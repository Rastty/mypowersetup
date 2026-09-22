import test from "node:test";
import assert from "node:assert/strict";

import {
  calculatorEventsFromGa4RunReport,
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

test("builds an exact target-host and calculator-event filter", () => {
  const filter = ga4CalculatorDimensionFilter("mypowersetup.com");
  const [hostExpression, eventExpression] = filter.andGroup.expressions;
  assert.deepEqual(hostExpression.filter.inListFilter.values, ["mypowersetup.com", "www.mypowersetup.com"]);
  assert.ok(eventExpression.filter.inListFilter.values.includes("affiliate_click"));
});
