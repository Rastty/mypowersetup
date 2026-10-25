import test from "node:test";
import assert from "node:assert/strict";
import { aggregateGscCalculatorRows, buildCalculatorGrowthPriorities, renderCalculatorGrowthMarkdown } from "../src/calculator-growth-priority.js";

test("GSC rows aggregate page/query evidence from Search Console style keys", () => {
  const rows = aggregateGscCalculatorRows([
    { keys: ["https://mypowersetup.com/kalkulacky/dc-dc-nabijecka/", "dc dc nabijecka karavan"], clicks: 6, impressions: 600, position: 5 },
    { keys: ["https://mypowersetup.com/kalkulacky/dc-dc-nabijecka/", "dc dc 30a"], clicks: 4, impressions: 400, position: 7 },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].path, "/kalkulacky/dc-dc-nabijecka/");
  assert.equal(rows[0].clicks, 10);
  assert.equal(rows[0].impressions, 1000);
  assert.equal(rows[0].ctr, 0.01);
  assert.equal(rows[0].position, 5.8);
  assert.equal(rows[0].topQuery.query, "dc dc nabijecka karavan");
});

test("growth report ranks indexing and search CTR evidence ahead of weaker funnel issues", () => {
  const rows = buildCalculatorGrowthPriorities({
    gscRows: [
      { page: "https://mypowersetup.com/kalkulacky/solarni-panely/", query: "solarni panely karavan", clicks: 0, impressions: 50, position: 11 },
      { page: "https://mypowersetup.com/kalkulacky/dc-dc-nabijecka/", query: "dc dc nabijecka karavan", clicks: 10, impressions: 1000, position: 6 },
      { page: "https://mypowersetup.com/kalkulacky/vykon-menice/", query: "menic karavan", clicks: 2, impressions: 30, position: 25 },
    ],
    indexingRows: [
      { url: "https://mypowersetup.com/kalkulacky/solarni-panely/", coverageState: "URL is not on Google" },
    ],
    funnelRows: [
      { locale: "cs", intent: "dcdc-sizing", path: "/kalkulacky/dc-dc-nabijecka/", views: 100, starts: 80, completes: 70, continues: 40, impressions: 30, clicks: 8 },
      { locale: "cs", intent: "inverter-sizing", path: "/kalkulacky/vykon-menice/", views: 30, starts: 20, completes: 5, continues: 2, impressions: 4, clicks: 0 },
    ],
  });

  assert.equal(rows[0].path, "/kalkulacky/solarni-panely/");
  assert.equal(rows[0].primaryOpportunity, "indexing");
  assert.equal(rows[1].path, "/kalkulacky/dc-dc-nabijecka/");
  assert.equal(rows[1].primaryOpportunity, "search_ctr");
  const inverter = rows.find((row) => row.path === "/kalkulacky/vykon-menice/");
  assert.equal(inverter.primaryOpportunity, "calculator_completion");
  assert.equal(inverter.evidenceStatus, "measurable");
});

test("low-volume rows stay observational instead of creating fake optimization work", () => {
  const [row] = buildCalculatorGrowthPriorities({
    gscRows: [{ page: "https://mypowersetup.com/kalkulacky/12v-nebo-24v/", query: "12v 24v", clicks: 0, impressions: 5, position: 8 }],
    funnelRows: [],
  });
  assert.equal(row.evidenceStatus, "insufficient");
  assert.equal(row.primaryOpportunity, null);
  assert.match(row.rationale, /Collect more GSC\/GA evidence/);
});

test("missing GA4 route evidence is unavailable, not a measured zero-percent funnel", () => {
  const path = "/kalkulacky/solarni-panely/";
  const [unknown] = buildCalculatorGrowthPriorities({
    gscRows: [{ page: "https://mypowersetup.com" + path, query: "solarni panely", clicks: 1, impressions: 100, position: 8 }],
    funnelRows: [],
  });
  assert.equal(unknown.funnelEvidenceStatus, "unavailable");
  assert.equal(unknown.startRate, null);
  assert.equal(unknown.productClickRate, null);
  assert.equal(unknown.viewToClickRate, null);
  const markdown = renderCalculatorGrowthMarkdown([unknown]);
  assert.match(markdown, /n\/a/);
  assert.doesNotMatch(markdown, /0\.0%/);

  const [observed] = buildCalculatorGrowthPriorities({
    funnelRows: [{ path, locale: "cs", intent: "solar-sizing", views: 10, starts: 0, completes: 0, continues: 0, impressions: 0, clicks: 0 }],
  });
  assert.equal(observed.funnelEvidenceStatus, "observed");
  assert.equal(observed.startRate, 0);
  assert.match(renderCalculatorGrowthMarkdown([observed]), /0\.0%/);
});

test("two GA4 intents on one calculator landing aggregate instead of last-row-wins", () => {
  const path = "/kalkulacky/dc-dc-nabijecka/";
  const first = { path, locale: "cs", intent: "battery-upgrade", views: 30, starts: 15, completes: 12, continues: 8, impressions: 10, clicks: 1 };
  const second = { path, locale: "cs", intent: "alternator-charging", views: 70, starts: 45, completes: 30, continues: 12, impressions: 20, clicks: 4 };
  for (const funnelRows of [[first, second], [second, first]]) {
    const [row] = buildCalculatorGrowthPriorities({ funnelRows });
    assert.equal(row.funnelEvidenceStatus, "observed");
    assert.equal(row.intent, "multiple");
    assert.equal(row.views, 100);
    assert.equal(row.starts, 60);
    assert.equal(row.completes, 42);
    assert.equal(row.continues, 20);
    assert.equal(row.productImpressions, 30);
    assert.equal(row.affiliateClicks, 5);
    assert.equal(row.startRate, 0.6);
    assert.equal(row.completionRate, 0.7);
    assert.equal(row.viewToClickRate, 0.05);
  }
});

test("an observed route with no step denominator has unknown rates, not fake 0% conversion", () => {
  const [row] = buildCalculatorGrowthPriorities({
    funnelRows: [{ path: "/kalkulacky/solarni-panely/", locale: "cs", intent: "solar", views: 0, starts: 0, completes: 0, continues: 0, impressions: 0, clicks: 0 }],
  });
  assert.equal(row.funnelEvidenceStatus, "observed");
  assert.equal(row.startRate, null);
  assert.equal(row.completionRate, null);
  assert.equal(row.continuationRate, null);
  assert.equal(row.productClickRate, null);
  assert.equal(row.viewToClickRate, null);
  assert.ok(renderCalculatorGrowthMarkdown([row]).includes("n/a"));
  assert.ok(!renderCalculatorGrowthMarkdown([row]).includes("0.0%"));
});

test("mismatched GA4 locale cannot contaminate another market's calculator", () => {
  const rows = buildCalculatorGrowthPriorities({
    funnelRows: [{ path: "/sk/kalkulacky/solarne-panely/", locale: "cs", intent: "solar", views: 1000, starts: 900, clicks: 300 }],
  });
  assert.equal(rows.length, 0);
});

test("growth markdown exposes the evidence table without inventing actions", () => {
  const rows = buildCalculatorGrowthPriorities({
    gscRows: [{ page: "/kalkulacky/dc-dc-nabijecka/", query: "dc dc", clicks: 1, impressions: 100, position: 5 }],
  });
  const markdown = renderCalculatorGrowthMarkdown(rows);
  assert.match(markdown, /GSC impressions/);
  assert.match(markdown, /search_ctr/);
  assert.match(markdown, /\/kalkulacky\/dc-dc-nabijecka\//);
});


test("authoritative page totals override privacy-filtered query sums without losing query intent", () => {
  const [row] = aggregateGscCalculatorRows(
    [{
      keys: ["https://mypowersetup.com/kalkulacky/prurez-kabelu-12v/", "výpočet průřezu kabelu kalkulačka"],
      clicks: 0,
      impressions: 1,
      position: 48,
    }],
    [{
      page: "https://mypowersetup.com/kalkulacky/prurez-kabelu-12v/",
      clicks: 0,
      impressions: 8,
      position: 13.75,
    }],
  );

  assert.equal(row.impressions, 8);
  assert.equal(row.clicks, 0);
  assert.equal(row.position, 13.75);
  assert.equal(row.metricsSource, "page_totals");
  assert.equal(row.topQuery.query, "výpočet průřezu kabelu kalkulačka");
  assert.equal(row.topQuery.impressions, 1);
});

test("growth thresholds use page totals instead of privacy-filtered query totals", () => {
  const [row] = buildCalculatorGrowthPriorities({
    gscRows: [{
      page: "https://mypowersetup.com/kalkulacky/solarni-panely/",
      query: "solarni panel karavan",
      clicks: 0,
      impressions: 3,
      position: 9,
    }],
    gscPageTotals: [{
      page: "https://mypowersetup.com/kalkulacky/solarni-panely/",
      clicks: 0,
      impressions: 25,
      position: 9,
    }],
  });
  assert.equal(row.searchImpressions, 25);
  assert.equal(row.searchMetricsSource, "page_totals");
  assert.equal(row.primaryOpportunity, "search_ctr");
});


test("cross-property URLs cannot create false calculator search or indexing opportunities", () => {
  const target = "/kalkulacky/solarni-panely/";
  const rows = buildCalculatorGrowthPriorities({
    gscRows: [
      { page: "https://another-site.example" + target, query: "cizí solár", clicks: 0, impressions: 9000, position: 4 },
      { page: "https://mypowersetup.com" + target, query: "solární panely karavan", clicks: 0, impressions: 4, position: 14 },
      { page: "//another-site.example" + target, query: "cizí solar", clicks: 0, impressions: 8000, position: 3 },
      { page: "javascript:alert(1)", clicks: 0, impressions: 9000, position: 1 },
    ],
    gscPageTotals: [
      { page: "https://another-site.example" + target, clicks: 0, impressions: 10000, position: 2 },
    ],
    indexingRows: [
      { page: "https://another-site.example" + target, coverageState: "URL is not on Google" },
    ],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].path, target);
  assert.equal(rows[0].searchImpressions, 4);
  assert.equal(rows[0].searchMetricsSource, "query_rows");
  assert.equal(rows[0].indexed, null);
  assert.equal(rows[0].primaryOpportunity, null);
});

test("canonical www and relative paths remain valid in growth evidence", () => {
  const rows = aggregateGscCalculatorRows([
    { page: "https://www.mypowersetup.com/kalkulacky/dc-dc-nabijecka/", query: "dc dc", impressions: 3, clicks: 0, position: 8 },
    { page: "/kalkulacky/dc-dc-nabijecka/", query: "nabíječka", impressions: 2, clicks: 0, position: 9 },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].impressions, 5);
  assert.equal(rows[0].queries.length, 2);
});
