import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatorUrlsFromSitemap,
  defaultGscDateRange,
  exactGscDomainProperty,
  gscPageQueryRequest,
  gscPageTotalRequest,
  normalizeSearchAnalyticsPageTotal,
  normalizeSearchAnalyticsRows,
  normalizeUrlInspection,
  selectExactGscProperty,
} from "../src/gsc-live-baseline.js";

test("selectExactGscProperty only accepts the exact domain property", () => {
  const selected = selectExactGscProperty([
    { siteUrl: "https://legacy.example/", permissionLevel: "siteOwner" },
    { siteUrl: "sc-domain:mypowersetup.com", permissionLevel: "siteOwner" },
  ]);
  assert.deepEqual(selected, {
    siteUrl: "sc-domain:mypowersetup.com",
    permissionLevel: "siteOwner",
  });
  assert.throws(
    () => selectExactGscProperty([{ siteUrl: "sc-domain:other.example", permissionLevel: "siteOwner" }]),
    /GSC_EXACT_DOMAIN_PROPERTY_NOT_FOUND/,
  );
});

test("exactGscDomainProperty normalizes www without broadening the property", () => {
  assert.equal(exactGscDomainProperty("www.mypowersetup.com"), "sc-domain:mypowersetup.com");
});

test("calculatorUrlsFromSitemap uses only in-domain calculator routes and de-duplicates", () => {
  const xml = `<?xml version="1.0"?>
    <urlset>
      <url><loc>https://mypowersetup.com/kalkulacky/</loc></url>
      <url><loc>https://www.mypowersetup.com/kalkulacky/vydrz-baterie/</loc></url>
      <url><loc>https://mypowersetup.com/sk/kalkulacky/kapacita-baterie/</loc></url>
      <url><loc>https://mypowersetup.com/pruvodce/baterie/</loc></url>
      <url><loc>https://evil.example/kalkulacky/</loc></url>
      <url><loc>https://mypowersetup.com/kalkulacky/</loc></url>
    </urlset>`;
  assert.deepEqual(calculatorUrlsFromSitemap(xml), [
    "https://mypowersetup.com/kalkulacky/",
    "https://mypowersetup.com/kalkulacky/vydrz-baterie/",
    "https://mypowersetup.com/sk/kalkulacky/kapacita-baterie/",
  ]);
});

test("gscPageQueryRequest scopes Search Analytics to one calculator URL", () => {
  const request = gscPageQueryRequest("https://mypowersetup.com/kalkulacky/vydrz-baterie/", "2026-08-26", "2026-09-22");
  assert.equal(request.startDate, "2026-08-26");
  assert.equal(request.endDate, "2026-09-22");
  assert.deepEqual(request.dimensions, ["query"]);
  assert.equal(request.dimensionFilterGroups[0].filters[0].dimension, "page");
  assert.equal(request.dimensionFilterGroups[0].filters[0].operator, "equals");
  assert.equal(request.dimensionFilterGroups[0].filters[0].expression, "https://mypowersetup.com/kalkulacky/vydrz-baterie/");
});

test("normalizeSearchAnalyticsRows produces native page-query keys for growth reporting", () => {
  const rows = normalizeSearchAnalyticsRows("https://mypowersetup.com/kalkulacky/kapacita-baterie/", {
    rows: [{
      keys: ["jak velkou baterii do karavanu"],
      clicks: 3,
      impressions: 120,
      ctr: 0.025,
      position: 7.2,
    }],
  });
  assert.deepEqual(rows, [{
    keys: ["https://mypowersetup.com/kalkulacky/kapacita-baterie/", "jak velkou baterii do karavanu"],
    clicks: 3,
    impressions: 120,
    ctr: 0.025,
    position: 7.2,
  }]);
});

test("normalizeUrlInspection classifies PASS as indexed and unknown-to-Google as not indexed", () => {
  assert.equal(normalizeUrlInspection("https://mypowersetup.com/kalkulacky/", {
    inspectionResult: { indexStatusResult: { verdict: "PASS", coverageState: "Submitted and indexed" } },
  }).indexed, true);

  assert.equal(normalizeUrlInspection("https://mypowersetup.com/kalkulacky/vydrz-baterie/", {
    inspectionResult: { indexStatusResult: { verdict: "NEUTRAL", coverageState: "URL is unknown to Google" } },
  }).indexed, false);
});

test("defaultGscDateRange uses a stable 28-day window ending three days before now", () => {
  assert.deepEqual(defaultGscDateRange(new Date("2026-09-25T08:00:00Z")), {
    startDate: "2026-08-26",
    endDate: "2026-09-22",
  });
});


test("page-total request keeps authoritative page metrics separate from query privacy", () => {
  const url = "https://mypowersetup.com/kalkulacky/prurez-kabelu-12v/";
  const request = gscPageTotalRequest(url, "2026-08-26", "2026-09-22");
  assert.equal(request.dimensions, undefined);
  assert.equal(request.rowLimit, 1);
  assert.equal(request.dimensionFilterGroups[0].filters[0].expression, url);

  assert.deepEqual(normalizeSearchAnalyticsPageTotal(url, {
    rows: [{ clicks: 0, impressions: 8, ctr: 0, position: 13.75 }],
  }), {
    page: url,
    clicks: 0,
    impressions: 8,
    ctr: 0,
    position: 13.75,
  });
});
