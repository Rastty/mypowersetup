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


test("Wave 17 strengthens contextual discovery for the battery autonomy calculator", async () => {
  const [batteryCalculator, calculatorSitemap, primarySitemap] = await Promise.all([
    read("kalkulacky/kapacita-baterie/index.html"),
    read("sitemap-calculators.xml"),
    read("sitemap.xml"),
  ]);

  assert.match(
    batteryCalculator,
    /href="\/kalkulacky\/vydrz-baterie\/"[^>]*>Mám baterii — spočítat její výdrž<\/a>/,
  );

  const sourceNeedle = "<loc>https://mypowersetup.com/kalkulacky/kapacita-baterie/</loc><lastmod>2026-10-02</lastmod>";
  assert.ok(calculatorSitemap.includes(sourceNeedle));
  assert.ok(primarySitemap.includes(sourceNeedle));

  const evidence = JSON.parse(await read("data/calculator-growth-evidence-2026-09-25.json"));
  assert.equal(
    new Map(evidence.gsc.remainingIndexingGaps.map((row) => [row.url, row.coverageState]))
      .get("https://mypowersetup.com/kalkulacky/vydrz-baterie/"),
    "URL is unknown to Google",
  );
});


test("Wave 18 strengthens the contextual path to the calculator with the strongest search signal", async () => {
  const [guide, sitemap] = await Promise.all([
    read("pruvodce/kabely-a-pojistky-12-v/index.html"),
    read("sitemap.xml"),
  ]);

  assert.match(
    guide,
    /<section class="cta">[\s\S]*href="\/kalkulacky\/prurez-kabelu-12v\/"[\s\S]*Spočítat průřez kabelu →/,
  );
  assert.match(guide, /"dateModified":"2026-10-02"/);
  assert.ok(
    sitemap.includes("<loc>https://mypowersetup.com/pruvodce/kabely-a-pojistky-12-v/</loc><lastmod>2026-10-02</lastmod>"),
  );

  const evidence = JSON.parse(await read("data/calculator-growth-evidence-2026-09-25.json"));
  const signal = evidence.gsc.searchSignals.find(
    (row) => row.url === "https://mypowersetup.com/kalkulacky/prurez-kabelu-12v/",
  );
  assert.equal(signal.impressions, 8);
  assert.equal(signal.clicks, 0);
  assert.equal(signal.averagePosition, 13.75);
});
