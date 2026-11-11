import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  EXPANSION_SUPPLY_EVENTS, classifyExpansionSupplyOutcome, expansionSupplyEventName,
} from "../src/expansion-supply-evidence.js";
import {
  EXPANSION_SUPPLY_PAGES, ga4ExpansionSupplyDimensionState,
  ga4ExpansionSupplyFilter, expansionSupplyFromGa4RunReport,
} from "../src/ga4-expansion-supply-evidence.js";

const metadata = { dimensions: ["eventName", "pagePath", "hostName"].map(apiName => ({ apiName })) };
const state = ga4ExpansionSupplyDimensionState(metadata);
const dimensions = ["eventName", "pagePath", "hostName"];
function event(path, name, count, hostName = "mypowersetup.com") {
  return { eventName: name, pagePath: path, hostName, eventCount: String(count) };
}
function report(events) {
  return {
    rowCount: events.length,
    dimensionHeaders: dimensions.map(name => ({ name })),
    metricHeaders: [{ name: "eventCount" }],
    rows: events.map(item => ({
      dimensionValues: dimensions.map(key => ({ value: item[key] })),
      metricValues: [{ value: item.eventCount }],
    })),
  };
}

test("only verified catalog calculations identify a technical inverter supply gap", () => {
  assert.equal(classifyExpansionSupplyOutcome({ coverage: { complete: true, missing: [] } }), "complete");
  assert.equal(classifyExpansionSupplyOutcome({ coverage: { complete: false, missing: ["inverter", "battery"] } }), "inverterMissing");
  assert.equal(classifyExpansionSupplyOutcome({ coverage: { complete: false, missing: ["controller"] } }), "otherMissing");
  assert.throws(() => classifyExpansionSupplyOutcome({}), /COVERAGE_NOT_VERIFIED/);
  assert.equal(expansionSupplyEventName("unavailable"), "expansion_supply_unavailable");
  assert.throws(() => expansionSupplyEventName("sale"), /OUTCOME_UNKNOWN/);
  assert.equal(new Set(Object.values(EXPANSION_SUPPLY_EVENTS)).size, 4);
});

test("GA4 uses only exact standard built-in dimensions, pages, host and classified event names", () => {
  assert.deepEqual(EXPANSION_SUPPLY_PAGES, { pt: "/pt/", ro: "/ro/", si: "/si/" });
  assert.equal(state.ready, true);
  assert.deepEqual(state.dimensions, ["eventName", "pagePath", "hostName"]);
  assert.equal(ga4ExpansionSupplyDimensionState({}).ready, false);
  const rules = ga4ExpansionSupplyFilter().andGroup.expressions;
  assert.deepEqual(rules[0].filter.inListFilter.values, ["mypowersetup.com", "www.mypowersetup.com"]);
  assert.deepEqual(rules[1].filter.inListFilter.values, ["/pt/", "/ro/", "/si/"]);
  assert.deepEqual(rules[2].filter.inListFilter.values, Object.values(EXPANSION_SUPPLY_EVENTS));
  assert.throws(() => ga4ExpansionSupplyFilter("evil.example"), /HOST_INVALID/);
  assert.doesNotThrow(() => ga4ExpansionSupplyFilter("https://www.mypowersetup.com/"));
});

test("successful verified inverter gaps are separate from network/catalog failures", () => {
  const reportData = report([
    event("/pt/", EXPANSION_SUPPLY_EVENTS.inverterMissing, 7),
    event("/pt/", EXPANSION_SUPPLY_EVENTS.unavailable, 3),
    event("/pt/", EXPANSION_SUPPLY_EVENTS.complete, 2),
    event("/ro/", EXPANSION_SUPPLY_EVENTS.otherMissing, 4, "www.mypowersetup.com"),
    event("/si/", EXPANSION_SUPPLY_EVENTS.inverterMissing, 1),
  ]);
  const evidence = expansionSupplyFromGa4RunReport(reportData, state);
  assert.equal(evidence.status, "ready");
  assert.equal(evidence.attribution, "exact_host_page_event");
  assert.equal(evidence.metricUnit, "consented_calculation_event_count");
  assert.deepEqual(evidence.rows[0], {
    market: "pt", path: "/pt/", complete: 2, inverterMissing: 7, otherMissing: 0,
    unavailable: 3, verifiedCatalogCalculations: 9, observedCalculations: 12,
  });
  assert.deepEqual(evidence.rows[1], {
    market: "ro", path: "/ro/", complete: 0, inverterMissing: 0, otherMissing: 4,
    unavailable: 0, verifiedCatalogCalculations: 4, observedCalculations: 4,
  });
  assert.equal(evidence.rows[2].inverterMissing, 1);
  assert.equal(evidence.revenueMeasured, false);
  assert.equal(evidence.merchantConversionsMeasured, false);
});

test("empty complete GA4 report represents an observed period with zero event counts, not revenue", () => {
  const evidence = expansionSupplyFromGa4RunReport(report([]), state);
  assert.equal(evidence.rows.length, 3);
  assert.ok(evidence.rows.every(row => row.observedCalculations === 0));
  assert.equal(evidence.revenueMeasured, false);
});

test("wrong page/host/event, truncated report and missing metrics fail closed", () => {
  assert.throws(() => expansionSupplyFromGa4RunReport(report([]), ga4ExpansionSupplyDimensionState({})), /DIMENSIONS_MISSING/);
  for (const bad of [
    event("/sk/", EXPANSION_SUPPLY_EVENTS.inverterMissing, 3),
    event("/pt/", "affiliate_click", 3),
    event("/pt/", EXPANSION_SUPPLY_EVENTS.inverterMissing, 3, "other.example"),
  ]) {
    assert.throws(() => expansionSupplyFromGa4RunReport(report([bad]), state), /UNEXPECTED_HOST_PAGE_OR_EVENT/);
  }
  assert.throws(() => expansionSupplyFromGa4RunReport({ ...report([]), rowCount: 2 }, state), /GA4_REPORT_ROWS_INCOMPLETE/);
  assert.throws(() => expansionSupplyFromGa4RunReport({ ...report([]), dimensionHeaders: [] }, state), /HEADERS_INCOMPLETE/);
  for (const value of [null, undefined, "", " ", "-1", "2.5", "NaN", "9007199254740992"]) {
    const sample = report([event("/pt/", EXPANSION_SUPPLY_EVENTS.inverterMissing, 1)]);
    sample.rows[0].metricValues[0].value = value;
    assert.throws(() => expansionSupplyFromGa4RunReport(sample, state), /COUNT_(MISSING|INVALID)/);
  }
});

test("buyer and reporter keep fail-closed outcome semantics without new tracking consent", async () => {
  const browser = await readFile(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");
  assert.match(browser, /track\(expansionSupplyEventName\(classifyExpansionSupplyOutcome\(priority\)\), \{ market: locale \}\)/);
  assert.equal((browser.match(/trackCatalogUnavailable\(\);/g) || []).length, 3);
  assert.doesNotMatch(browser, /trackProductCoverage\(\{\}, calculation\)/);
  assert.match(browser, /data-recommendation-unavailable/);
  for (const value of [
    "Não conseguimos carregar agora as ofertas verificadas",
    "Nu putem încărca momentan ofertele verificate",
    "Trenutno ni mogoče naložiti preverjenih ponudb",
  ]) assert.ok(browser.includes(value), value);
  const cli = await readFile(new URL("../scripts/report-ga4-calculator-live.mjs", import.meta.url), "utf8");
  assert.match(cli, /ga4ExpansionSupplyDimensionState\(metadata\)/);
  assert.match(cli, /ga4ExpansionSupplyFilter\(targetHostname\)/);
  assert.match(cli, /expansionSupplyFromGa4RunReport\(expansionSupplyReport, expansionSupplyDimensions\)/);
  assert.match(cli, /expansionSupply,/);
});
