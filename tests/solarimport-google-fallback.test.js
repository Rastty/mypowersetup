import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SOLARIMPORT_GOOGLE_FEED_URL,
  loadSolarImportGoogleFallback,
  solarImportNeedsFallback,
  solarImportReviewedCounts,
} from "../scripts/lib/sync-solarimport-google.mjs";
import { parseProductFeed } from "../src/feed.js";

const now = Date.parse("2026-11-17T08:00:00Z");
const saved = JSON.parse(readFileSync(new URL("../data/products.json", import.meta.url), "utf8"));
const reviewed = saved.products.filter(p => p.merchant === "solarimport" && (
  /^solarimport:E79(?:2[5-9]|3[0-7])$/.test(p.id)
  || ["solarimport:E8722", "solarimport:E8934"].includes(p.id)
));

function response({ status = 200, contentType = "text/xml;charset=UTF-8", length, url = SOLARIMPORT_GOOGLE_FEED_URL } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: new Headers({ "content-type": contentType, ...(length !== undefined ? { "content-length": length } : {}) }),
    text: async () => "<rss><channel/></rss>",
  };
}

test("Solar-import fallback is only needed when reviewed live buying paths are incomplete", () => {
  assert.deepEqual(solarImportReviewedCounts(reviewed, now), { inverters: 13, panels: 2 });
  assert.equal(solarImportNeedsFallback(reviewed, now), false);
  assert.equal(solarImportNeedsFallback(reviewed.filter(p => p.category === "battery"), now), true);
  assert.equal(solarImportNeedsFallback(reviewed.filter(p => p.category === "inverter"), now), true);
  assert.equal(solarImportNeedsFallback(reviewed.filter(p => p.category === "solar_panel"), now), true);
  assert.equal(solarImportNeedsFallback(reviewed.slice(0, 7).concat(reviewed.slice(-2)), now), true);
});

test("A complete public Google export restores the two reviewed buyer paths without credentials or redirects", async () => {
  let fetched = null;
  const result = await loadSolarImportGoogleFallback({
    now,
    fetchImpl: async (url, options) => {
      fetched = { url, options };
      return response();
    },
    parseImpl: (xml, merchant) => {
      assert.match(xml, /<rss>/);
      assert.equal(merchant, "solarimport");
      return reviewed;
    },
  });
  assert.equal(fetched.url, SOLARIMPORT_GOOGLE_FEED_URL);
  assert.equal(fetched.options.redirect, "error");
  assert.equal(fetched.options.credentials, "omit");
  assert.equal(fetched.options.headers.referer, undefined);
  assert.equal(result.reviewedInverters, 13);
  assert.equal(result.reviewedPanels, 2);
  assert.equal(result.products.length, 15);
});

test("Malformed, redirected and oversized alternative exports are rejected", async () => {
  for (const options of [
    { status: 503 },
    { contentType: "text/html" },
    { length: "9000000" },
    { url: "https://other.example/redirect.xml" },
  ]) {
    await assert.rejects(loadSolarImportGoogleFallback({
      now, fetchImpl: async () => response(options), parseImpl: () => reviewed,
    }), /SOLARIMPORT_GOOGLE_FEED_/);
  }
});

test("The fallback rejects a second partial feed even if it has valid XML", async () => {
  await assert.rejects(loadSolarImportGoogleFallback({
    now,
    fetchImpl: async () => response(),
    parseImpl: () => reviewed.slice(0, 3).concat(reviewed.slice(-2)),
  }), /SOLARIMPORT_GOOGLE_FEED_MISSING_REVIEWED_PATHS/);
});

test("Google RSS item fields use the existing merchant normalizer and affiliate tracking", () => {
  const xml = `<rss xmlns:g="http://base.google.com/ns/1.0"><channel><item>
    <g:id>E7925</g:id>
    <g:title>ROGERELE Sinusový měnič napětí REP300-12 300W</g:title>
    <g:description>Sinusový měnič pro karavan</g:description>
    <g:link>https://www.solar-import.cz/off-grid/rogerele-sinusovy-menic-napeti-rep300-12--300w/</g:link>
    <g:price>1490 CZK</g:price><g:availability>in stock</g:availability>
    <g:product_type>Fotovoltaika | Solární měniče napětí</g:product_type>
  </item></channel></rss>`;
  const products = parseProductFeed(xml, "solarimport");
  assert.equal(products.length, 1);
  assert.equal(products[0].id, "solarimport:E7925");
  assert.equal(products[0].merchant, "solarimport");
  assert.match(products[0].affiliateUrl, /^https:\/\/ehub\.cz\/system\/scripts\/click\.php\?/);
  assert.equal(new URL(products[0].affiliateUrl).searchParams.get("a_aid"), "f34c86c8");
});
