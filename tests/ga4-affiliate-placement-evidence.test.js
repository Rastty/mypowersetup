import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CALCULATOR_NETWORK_PLACEMENTS, ga4AffiliatePlacementDimensionState,
  ga4AffiliatePlacementFilter, affiliatePlacementsFromGa4RunReport,
} from "../src/ga4-affiliate-placement-evidence.js";

const names = ["eventName", "pagePath", "hostName", "customEvent:affiliatePlacement"];
const metadata = (fields = names) => ({ dimensions: fields.map(apiName => ({ apiName })) });
const state = ga4AffiliatePlacementDimensionState(metadata());
const observed = (eventName, path, label, eventCount) => ({
  eventName, pagePath: path, hostName: "mypowersetup.com", "customEvent:affiliatePlacement": label,
  eventCount: String(eventCount),
});
function report(rows, headers = names) {
  return {
    rowCount: rows.length,
    dimensionHeaders: headers.map(name => ({ name })),
    metricHeaders: [{ name: "eventCount" }],
    rows: rows.map(row => ({
      dimensionValues: headers.map(name => ({ value: row[name] ?? "(not set)" })),
      metricValues: [{ value: row.eventCount }],
    })),
  };
}

test("placement readback is scoped to the exact calculator routes and hostname", () => {
  assert.equal(Object.keys(CALCULATOR_NETWORK_PLACEMENTS).length, 6);
  const filters = ga4AffiliatePlacementFilter().andGroup.expressions;
  assert.deepEqual(filters[1].filter.inListFilter.values, Object.keys(CALCULATOR_NETWORK_PLACEMENTS));
  assert.deepEqual(filters[2].filter.inListFilter.values, ["product_choice_impression", "affiliate_click"]);
  assert.throws(() => ga4AffiliatePlacementFilter("another.example"), /GA4_PLACEMENT_TARGET_HOST_INVALID/);
  assert.equal(ga4AffiliatePlacementFilter("www.mypowersetup.com").andGroup.expressions.length, 3);
});

test("missing event-scoped custom dimension does not fabricate a placement report", () => {
  const missing = ga4AffiliatePlacementDimensionState(metadata(names.slice(0, 3)));
  assert.equal(missing.ready, false);
  assert.deepEqual(missing.missing, ["customEvent:affiliatePlacement"]);
  assert.throws(() => affiliatePlacementsFromGa4RunReport(report([]), missing),
    /GA4_PLACEMENT_DIMENSION_NOT_REGISTERED/);
});

test("observed static labels group GA4 events by exact path, never claim paid affiliate results", () => {
  const czSolar = "/kalkulacky/solarni-panely/";
  const skSolar = "/sk/kalkulacky/solarne-panely/";
  const battery = "/kalkulacky/kapacita-baterie/";
  const rows = [
    observed("product_choice_impression", czSolar, "solar_calculator", 10),
    observed("affiliate_click", czSolar, "solar_calculator", 3),
    observed("affiliate_click", skSolar, "solar_calculator", 4),
    observed("affiliate_click", battery, "battery_calculator", 1),
  ];
  const result = affiliatePlacementsFromGa4RunReport(report(rows), state);
  assert.equal(result.routes.length, 6);
  assert.deepEqual(result.routes.find(x => x.path === czSolar), {
    path: czSolar, placement: "solar_calculator", impressionEvents: 10, clickEvents: 3,
    clickPerImpression: 0.3,
  });
  assert.equal(result.routes.find(x => x.path === skSolar).clickPerImpression, null);
  assert.equal(result.routes.find(x => x.path === battery).clickEvents, 1);
  assert.deepEqual(result.unclassified, { impressionEvents: 0, clickEvents: 0 });
  assert.equal(result.metricUnit, "consented_event_count");
  assert.equal(result.affiliateNetworkClicksVerified, false);
  assert.equal(result.merchantConversionsMeasured, false);
  assert.equal(result.revenueMeasured, false);
});

test("unknown or cross-route labels are unclassified, not attributed to another calculator", () => {
  const battery = "/kalkulacky/kapacita-baterie/";
  const result = affiliatePlacementsFromGa4RunReport(report([
    observed("affiliate_click", battery, "solar_calculator", 8),
    observed("affiliate_click", battery, "(not set)", 2),
    observed("product_choice_impression", battery, "placement_battery_calculator", 3),
    observed("affiliate_click", battery, "battery_calculator", 1),
  ]), state);
  assert.deepEqual(result.unclassified, { impressionEvents: 3, clickEvents: 10 });
  assert.equal(result.routes.find(x => x.path === battery).clickEvents, 1);
  assert.deepEqual(affiliatePlacementsFromGa4RunReport(report([]), state).unclassified,
    { impressionEvents: 0, clickEvents: 0 });
});

test("truncated, wrong source or malformed counts fail closed", () => {
  const path = "/kalkulacky/dc-dc-nabijecka/";
  const valid = observed("affiliate_click", path, "dcdc_calculator", 2);
  assert.throws(() => affiliatePlacementsFromGa4RunReport({ ...report([valid]), rowCount: 2 }, state),
    /GA4_REPORT_ROWS_INCOMPLETE/);
  assert.throws(() => affiliatePlacementsFromGa4RunReport(report([valid], names.slice(0, 3)), state),
    /GA4_PLACEMENT_REPORT_HEADERS_INCOMPLETE/);
  for (const change of [{ pagePath: "/unrelated/" }, { hostName: "shop.example" },
    { eventName: "purchase" }]) {
    assert.throws(() => affiliatePlacementsFromGa4RunReport(report([{ ...valid, ...change }]), state),
      /GA4_PLACEMENT_UNEXPECTED_HOST_PAGE_OR_EVENT/);
  }
  for (const bad of ["", null, undefined, "-1", "1.25", "9007199254740993", "Infinity"]) {
    const sample = report([valid]);
    sample.rows[0].metricValues[0].value = bad;
    assert.throws(() => affiliatePlacementsFromGa4RunReport(sample, state),
      /GA4_PLACEMENT_EVENT_COUNT_(?:MISSING|INVALID)/);
  }
});

test("existing live GA4 exporter gates optional placement data on actual registered dimension", async () => {
  const cli = await readFile(new URL("../scripts/report-ga4-calculator-live.mjs", import.meta.url), "utf8");
  assert.match(cli, /ga4AffiliatePlacementDimensionState\(metadata\)/);
  assert.match(cli, /ga4AffiliatePlacementFilter\(targetHostname\)/);
  assert.match(cli, /affiliatePlacementsFromGa4RunReport\(placementReport, placementDimensions\)/);
  assert.match(cli, /affiliatePlacementEvidence,/);
});
