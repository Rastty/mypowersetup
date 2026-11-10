import test from "node:test";
import assert from "node:assert/strict";
import { classifyGscIndexingStatus } from "../src/gsc-indexing-status.js";
import { normalizeIndexingExportRows, parseDelimitedText } from "../src/calculator-growth-input.js";
import { buildCalculatorGrowthPriorities } from "../src/calculator-growth-priority.js";
import { normalizeUrlInspection } from "../src/gsc-live-baseline.js";

const root = "https://mypowersetup.com/kalkulacky/";

test("common real Search Console coverage states use consistent indexation semantics", () => {
  for (const text of [
    "Discovered - currently not indexed",
    "Crawled – currently not indexed",
    "URL is unknown to Google",
    "URL is not on Google",
    "Page is not indexed: Discovered - currently not indexed",
    "Duplicate, Google chose different canonical than user",
    "Alternate page with proper canonical tag",
    "Page with redirect",
    "Excluded by 'noindex' tag",
    "Blocked by robots.txt",
    "Soft 404",
    "URL není na Googlu",
    "Neindexováno",
  ]) {
    assert.equal(classifyGscIndexingStatus(text), false, text);
  }
  for (const text of [
    "Page is indexed",
    "Indexed, not submitted in sitemap",
    "Indexed, though blocked by robots.txt",
    "Submitted and indexed",
    "URL is on Google, but has issues",
    "URL je na Googlu",
    "Indexováno",
  ]) {
    assert.equal(classifyGscIndexingStatus(text), true, text);
  }
  for (const text of ["", "NEUTRAL", "PARTIAL", "PENDING", "unknown", "Crawl scheduled", null]) {
    assert.equal(classifyGscIndexingStatus(text), null, String(text));
  }
  assert.equal(classifyGscIndexingStatus(false), false);
  assert.equal(classifyGscIndexingStatus(true), true);
});

test("a real coverage-state CSV import retains discovered/crawled no-index flags and SEO P0 ranking", () => {
  const csv = [
    "URL,Coverage state",
    root + "vydrz-baterie/,Discovered - currently not indexed",
    root + "mppt-regulator/,Crawled – currently not indexed",
    root + "solarni-panely/,Page is indexed",
  ].join("\n");
  const parsed = normalizeIndexingExportRows(parseDelimitedText(csv));
  assert.deepEqual(parsed.map(x => x.indexed), [false, false, true]);

  const priorities = buildCalculatorGrowthPriorities({ indexingRows: parsed });
  for (const slug of ["vydrz-baterie", "mppt-regulator"]) {
    const item = priorities.find(row => row.path === "/kalkulacky/" + slug + "/");
    assert.equal(item.indexed, false);
    assert.equal(item.primaryOpportunity, "indexing");
    assert.equal(item.priorityScore, 100);
    assert.equal(item.evidenceStatus, "measurable");
  }
  const solar = priorities.find(row => row.path === "/kalkulacky/solarni-panely/");
  assert.equal(solar.indexed, true);
  assert.equal(solar.primaryOpportunity, null);
  assert.equal(solar.evidenceStatus, "insufficient");
});

test("raw JSON indexing rows get the same classification as imported CSV", () => {
  const rows = buildCalculatorGrowthPriorities({
    indexingRows: [
      { url: root + "vydrz-baterie/", coverageState: "Discovered - currently not indexed" },
      { url: root + "mppt-regulator/", coverageState: "Duplicate, Google chose different canonical than user" },
      { url: root + "kapacita-baterie/", coverageState: "NEUTRAL" },
    ],
  });
  assert.deepEqual(rows.map(row => row.path).sort(), [
    "/kalkulacky/mppt-regulator/", "/kalkulacky/vydrz-baterie/",
  ].sort(), "NEUTRAL alone must not invent an indexation record");
  assert.equal(rows.filter(row => row.primaryOpportunity === "indexing").length, 2);
});

test("live URL Inspection neutral results match CSV and JSON coverage interpretation", () => {
  for (const [coverageState, expected] of [
    ["Discovered - currently not indexed", false],
    ["Crawled - currently not indexed", false],
    ["Alternate page with proper canonical tag", false],
    ["Indexed, though blocked by robots.txt", true],
    ["Page is indexed", true],
  ]) {
    const direct = normalizeUrlInspection(root + "mppt-regulator/", {
      inspectionResult: { indexStatusResult: { verdict: "NEUTRAL", coverageState } },
    });
    assert.equal(direct.indexed, expected, coverageState);
    assert.equal(normalizeIndexingExportRows([{ URL: direct.url, "Coverage state": coverageState }])[0].indexed, expected);
  }
  const unknown = normalizeUrlInspection(root + "vydrz-baterie/", {
    inspectionResult: { indexStatusResult: { verdict: "NEUTRAL", coverageState: "Crawl scheduled" } },
  });
  assert.equal(Object.hasOwn(unknown, "indexed"), false);
  assert.equal(normalizeUrlInspection(root + "mppt-regulator/", {
    inspectionResult: { indexStatusResult: { verdict: "FAIL", coverageState: "Page is indexed" } },
  }).indexed, false, "explicit API verdict is authoritative when coverage state contradicts it");
});

test("cross-domain records do not contaminate SEO priorities, even when marked not indexed", () => {
  const priorities = buildCalculatorGrowthPriorities({
    indexingRows: [
      { url: "https://another-site.example/kalkulacky/vydrz-baterie/", indexed: false },
      { url: root + "mppt-regulator/", coverageState: "Discovered - currently not indexed" },
    ],
  });
  assert.deepEqual(priorities.map(row => row.path), ["/kalkulacky/mppt-regulator/"]);
});
