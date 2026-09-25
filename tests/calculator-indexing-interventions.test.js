import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Wave 9 strengthens direct internal discovery for the remaining indexing gaps", async () => {
  const [solarGuide, solarCalculator, plGuideHub, plCalculatorHub] = await Promise.all([
    read("pruvodce/kolik-w-solarnich-panelu/index.html"),
    read("kalkulacky/solarni-panely/index.html"),
    read("pl/poradnik/index.html"),
    read("pl/kalkulatory/index.html"),
  ]);

  assert.match(solarGuide, /href="\/kalkulacky\/mppt-regulator\/"/);
  assert.match(solarCalculator, /href="\/kalkulacky\/mppt-regulator\/"/);
  assert.match(plGuideHub, /href="\/pl\/kalkulatory\/"/);
  assert.match(plCalculatorHub, /<h2>Który kalkulator wybrać\?<\/h2>/);
});

test("Wave 9 keeps the live GSC baseline and intervention rationale in repo", async () => {
  const evidence = JSON.parse(await read("data/calculator-growth-evidence-2026-09-25.json"));
  assert.equal(evidence.gsc.indexedCount, 16);
  assert.equal(evidence.gsc.notIndexedCount, 3);
  assert.equal(evidence.gsc.calculatorUrlCount, 19);
  assert.equal(evidence.gsc.previousBaseline.indexedCount, 1);
  assert.equal(evidence.ga4.status, "blocked");

  const gapStates = new Map(evidence.gsc.remainingIndexingGaps.map((row) => [row.url, row.coverageState]));
  assert.equal(
    gapStates.get("https://mypowersetup.com/kalkulacky/mppt-regulator/"),
    "Discovered - currently not indexed",
  );
  assert.equal(
    gapStates.get("https://mypowersetup.com/pl/kalkulatory/"),
    "Crawled - currently not indexed",
  );
});

test("changed calculator surfaces carry current lastmod in both calculator and primary sitemaps", async () => {
  const [calculatorSitemap, primarySitemap] = await Promise.all([
    read("sitemap-calculators.xml"),
    read("sitemap.xml"),
  ]);
  const urls = [
    "https://mypowersetup.com/kalkulacky/solarni-panely/",
    "https://mypowersetup.com/pl/kalkulatory/",
  ];
  for (const url of urls) {
    const needle = `<loc>${url}</loc><lastmod>2026-09-25</lastmod>`;
    assert.ok(calculatorSitemap.includes(needle), `calculator sitemap missing ${url}`);
    assert.ok(primarySitemap.includes(needle), `primary sitemap missing ${url}`);
  }
});
