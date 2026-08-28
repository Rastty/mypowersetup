import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { HU_UI_COPY } from "../src/ui-copy-hu.js";
import { HU_TRUST_COPY } from "../src/trust-copy-hu.js";

test("Hungarian UI copy covers the full calculator and purchase journey", () => {
  assert.match(HU_UI_COPY.hero.title, /akkumulátorra és napelemre/);
  assert.deepEqual(HU_UI_COPY.calculator.steps, ["Használat", "Fogyasztók", "Eredmény"]);
  assert.match(HU_UI_COPY.result.why, /Hogyan kaptuk/);
  assert.match(HU_UI_COPY.result.installation, /szakembernek/);
  assert.deepEqual(Object.keys(HU_UI_COPY.products.categories).sort(), [
    "battery", "controller", "dcCharger", "inverter", "powerStation", "shoreCharger", "solarPanel"
  ]);
  assert.match(HU_UI_COPY.products.affiliate, /jutalék nem módosítja/);
  assert.match(HU_UI_COPY.safety.text, /nem villamos tervet/);
});

test("Hungarian analytics copy is ready without activating an unfinished public route", async () => {
  const [analytics, sitemap, czech, slovak, polish] = await Promise.all([
    readFile("src/analytics.js", "utf8"),
    readFile("sitemap.xml", "utf8"),
    readFile("index.html", "utf8"),
    readFile("sk/index.html", "utf8"),
    readFile("pl/index.html", "utf8"),
  ]);
  assert.match(analytics, /Analitika engedélyezése/);
  assert.match(analytics, /\/hu\/adatvedelem\//);
  assert.doesNotMatch(sitemap, /mypowersetup\.com\/hu\//);
  for (const html of [czech, slovak, polish]) assert.doesNotMatch(html, /hreflang="hu-HU"/);
});

test("Hungarian trust copy explains authorship, method, affiliate independence, privacy and safety", () => {
  assert.match(HU_TRUST_COPY.about.author, /Petr Gálík/);
  assert.match(HU_TRUST_COPY.about.author, /elektrotechnikai/);
  assert.match(HU_TRUST_COPY.methodology.deterministic, /determinisztikus/);
  assert.equal(Object.keys(HU_TRUST_COPY.methodology.formulas).length, 4);
  assert.equal(HU_TRUST_COPY.methodology.productRules.length, 5);
  assert.match(HU_TRUST_COPY.methodology.commission, /jutalék nem része/);
  assert.match(HU_TRUST_COPY.affiliate.independence, /nem befolyásolja/);
  assert.match(HU_TRUST_COPY.privacy.analytics, /kifejezett hozzájárulás/);
  assert.equal(HU_TRUST_COPY.privacy.contact, "xfit.redakce@gmail.com");
  assert.match(HU_TRUST_COPY.safety.text, /szakembernek/);
});

test("Hungarian Ampul catalog is private, market-specific and ready for secret-backed refresh", async () => {
  const [catalog, sync] = await Promise.all([
    readFile("data/products-hu.json", "utf8").then(JSON.parse),
    readFile("scripts/sync-products-hu.mjs", "utf8"),
  ]);
  assert.equal(catalog.market, "hu-HU");
  assert.equal(catalog.currency, "EUR");
  assert.ok(Object.hasOwn(catalog.sources, "ampul_hu"));
  assert.match(sync, /process\.env\.AMPUL_HU_FEED_URL/);
  assert.match(sync, /parseProductFeed\(await response\.text\(\), "ampul_hu"\)/);
  assert.match(sync, /"accept-language": "hu-HU,hu;q=0\.9,en;q=0\.6"/);
  assert.doesNotMatch(sync, /id_feed=|token=/);
});