import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildDognetTrackedUrl,
  parseArukeresoFeed,
  parseDognetTrackingTemplate,
  syncArukeresoHu,
} from "../scripts/lib/sync-arukereso-hu.mjs";
import { loadHungarianProductCatalog, hungarianMerchantLabel } from "../src/app-hu.js";
import { assessHungarianLaunchReadiness } from "../src/readiness-hu.js";

const affiliateLink = "https://www.arukereso.hu/?utm_source=dognet&a_aid=publisher123&a_bid=campaign456&chan=mypowersetup_hu";
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<SHOP>
  <SHOPITEM>
    <ITEM_ID>victron-100-30</ITEM_ID>
    <PRODUCTNAME>Victron SmartSolar MPPT 100/30</PRODUCTNAME>
    <DESCRIPTION>Bluetooth képes napelemes töltésvezérlő.</DESCRIPTION>
    <URL>https://napelem-toltesvezerlo.arukereso.hu/victron-energy/smartsolar-mppt-100-30-p123456.html</URL>
    <PRICE_VAT>52 990 HUF</PRICE_VAT>
    <MANUFACTURER>Victron Energy</MANUFACTURER>
    <CATEGORYTEXT>Napelemes töltésvezérlők</CATEGORYTEXT>
    <DELIVERY_DATE>0</DELIVERY_DATE>
  </SHOPITEM>
  <SHOPITEM>
    <ITEM_ID>pwm-30</ITEM_ID>
    <PRODUCTNAME>Olcsó PWM napelemes szabályozó 30A</PRODUCTNAME>
    <URL>https://napelem-toltesvezerlo.arukereso.hu/example/pwm-30-p999.html</URL>
    <PRICE_VAT>9 990 HUF</PRICE_VAT>
  </SHOPITEM>
  <SHOPITEM>
    <ITEM_ID>external</ITEM_ID>
    <PRODUCTNAME>MPPT 100/40</PRODUCTNAME>
    <URL>https://example.com/mppt-100-40</URL>
    <PRICE_VAT>30 000 HUF</PRICE_VAT>
  </SHOPITEM>
</SHOP>`;

test("Dognet Árukereső tracking requires campaign ids and dedicated chan", () => {
  const tracking = parseDognetTrackingTemplate(affiliateLink);
  assert.equal(tracking.chan, "mypowersetup_hu");
  assert.throws(
    () => parseDognetTrackingTemplate("https://www.arukereso.hu/?a_aid=x&a_bid=y"),
    /MISSING_CHAN/
  );
  assert.throws(
    () => parseDognetTrackingTemplate("https://example.com/?a_aid=x&a_bid=y&chan=z"),
    /INVALID_HOST/
  );
});

test("Dognet tracking params are preserved on the exact Árukereső product destination", () => {
  const result = new URL(buildDognetTrackedUrl(
    "https://napelem-toltesvezerlo.arukereso.hu/victron-energy/smartsolar-mppt-100-30-p123456.html?foo=bar",
    affiliateLink
  ));
  assert.equal(result.hostname, "napelem-toltesvezerlo.arukereso.hu");
  assert.equal(result.pathname, "/victron-energy/smartsolar-mppt-100-30-p123456.html");
  assert.equal(result.searchParams.get("foo"), "bar");
  assert.equal(result.searchParams.get("a_aid"), "publisher123");
  assert.equal(result.searchParams.get("a_bid"), "campaign456");
  assert.equal(result.searchParams.get("chan"), "mypowersetup_hu");
  assert.equal(result.searchParams.get("utm_source"), "dognet");
});

test("Árukereső feed accepts only technically identifiable MPPT product pages", () => {
  const products = parseArukeresoFeed(feed, affiliateLink);
  assert.equal(products.length, 1);
  assert.equal(products[0].merchant, "arukereso_hu");
  assert.equal(products[0].category, "controller");
  assert.equal(products[0].specs.currentA, 30);
  assert.equal(products[0].priceCzk, 52990);
  assert.equal(products[0].priceCurrency, "HUF");
  assert.equal(products[0].available, true);
  assert.match(products[0].affiliateUrl, /chan=mypowersetup_hu/);
});

test("Árukereső source stays absent before onboarding and fail-closes after it was configured", async () => {
  assert.deepEqual(await syncArukeresoHu(), { products: [], source: null });

  const previous = {
    sources: { arukereso_hu: { status: "ok" } },
    products: [{ id: "arukereso_hu:old", merchant: "arukereso_hu", category: "controller" }],
  };
  const stale = await syncArukeresoHu(previous, { feedUrl: null, affiliateLink: null });
  assert.equal(stale.source.status, "stale");
  assert.equal(stale.products.length, 1);
});

test("Árukereső sync reports a fresh controller source with a real Dognet channel", async () => {
  const response = { ok: true, text: async () => feed };
  const result = await syncArukeresoHu({}, {
    feedUrl: "https://feed.example.test/arukereso.xml",
    affiliateLink,
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://feed.example.test/arukereso.xml");
      assert.match(options.headers["accept-language"], /hu-HU/);
      return response;
    },
  });
  assert.equal(result.source.status, "ok");
  assert.equal(result.source.controllers, 1);
  assert.equal(result.source.trackingChannel, "mypowersetup_hu");
  assert.equal(result.products.length, 1);
});

test("Hungarian browser catalog accepts Árukereső and renders its local merchant label", async () => {
  const [product] = parseArukeresoFeed(feed, affiliateLink);
  const catalog = await loadHungarianProductCatalog(async () => ({
    ok: true,
    json: async () => ({
      market: "hu-HU",
      currency: "EUR",
      sources: { arukereso_hu: { status: "ok" } },
      products: [product, { merchant: "unknown", category: "controller" }],
    }),
  }));
  assert.equal(catalog.products.length, 1);
  assert.equal(catalog.products[0].merchant, "arukereso_hu");
  assert.equal(hungarianMerchantLabel("arukereso_hu"), "Árukereső.hu");
});

test("one fresh Árukereső MPPT closes the current HU product-coverage blocker", async () => {
  const catalog = JSON.parse(await readFile("data/products-hu.json", "utf8"));
  const [product] = parseArukeresoFeed(feed, affiliateLink);
  catalog.sources.arukereso_hu = { status: "ok" };
  catalog.products.push(product);

  const report = assessHungarianLaunchReadiness({
    catalog,
    languageReviewed: true,
    mobileJourneyReviewed: true,
  });
  assert.equal(report.categoryCounts.controller, 2);
  assert.equal(report.checks.productCoverage, true);
  assert.equal(report.checks.catalogSource, true);
  assert.equal(report.ready, true);
});
