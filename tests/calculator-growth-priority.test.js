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
