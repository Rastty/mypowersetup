import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { HU_UI_COPY } from "../src/ui-copy-hu.js";
import { HU_TRUST_COPY } from "../src/trust-copy-hu.js";
import {
  HU_MARKET,
  buildHungarianApplicationResult,
  formatHungarianPrice,
  hungarianMerchantLabel,
  loadHungarianProductCatalog,
} from "../src/app-hu.js";
import { renderHungarianPrivatePage } from "../src/page-hu.js";
import { HU_TRUST_ROUTES, renderHungarianTrustPage } from "../src/trust-pages-hu.js";

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

test("Hungarian headless app shell connects the shared engine to the verified local catalog", async () => {
  const payload = JSON.parse(await readFile("data/products-hu.json", "utf8"));
  const catalog = await loadHungarianProductCatalog(async (url, options) => {
    assert.equal(url, "/data/products-hu.json");
    assert.equal(options.cache, "no-store");
    return { ok: true, json: async () => payload };
  });
  const output = buildHungarianApplicationResult({
    appliances: [
      { id: "fridge", selected: true, hours: 8, quantity: 1 },
      { id: "coffee", selected: true, hours: 0.15, quantity: 1 },
    ],
    autonomyDays: 2,
    season: "summer",
    batteryType: "lifepo4",
    systemVoltage: 12,
    inverterCableLength: 1.5,
    driveHoursPerDay: 2,
    starterVoltage: 12,
    dcDcInputCableLength: 4,
    shoreChargeHours: 8,
  }, catalog);

  assert.equal(HU_MARKET.published, false);
  assert.equal(HU_MARKET.indexable, false);
  assert.equal(catalog.products.length, 12);
  assert.match(output.verdict, /rendszert ajánlunk/);
  assert.match(output.systemDiagram, /Napelemek/);
  assert.match(output.systemDiagram, /Tiszta szinuszos inverter/);
  assert.ok(output.installationPlan.length >= 4);
  assert.match(output.shareUrl, /^https:\/\/mypowersetup\.com\/hu\/\?/);
  assert.match(output.shareText, /Napi energiafogyasztás/);
  assert.ok(output.recommendations.inverter.length >= 1);
  assert.equal(output.recommendations.inverter[0].product.merchant, "ampul_hu");
  assert.equal(output.catalogSources.ampul_hu.status, "ok");
  assert.equal(hungarianMerchantLabel("ampul_hu"), "Ampul.eu");
  assert.match(formatHungarianPrice(164.59), /164[,.]59/);
});

test("Hungarian catalog loader rejects another market or merchant", async () => {
  await assert.rejects(
    loadHungarianProductCatalog(async () => ({
      ok: true,
      json: async () => ({ market: "pl-PL", currency: "EUR", sources: {}, products: [] }),
    })),
    /HU_CATALOG_INVALID/
  );
  const valid = await loadHungarianProductCatalog(async () => ({
    ok: true,
    json: async () => ({
      market: "hu-HU",
      currency: "EUR",
      sources: { ampul_hu: { status: "ok" } },
      products: [{ merchant: "ampul_hu" }, { merchant: "ampul_pl" }],
    }),
  }));
  assert.deepEqual(valid.products, [{ merchant: "ampul_hu" }]);
});

test("Hungarian private page template covers the full mobile purchase journey without publishing it", async () => {
  const [html, browser, sitemap, robots] = await Promise.all([
    Promise.resolve(renderHungarianPrivatePage()),
    readFile("src/app-hu-browser.js", "utf8"),
    readFile("sitemap.xml", "utf8"),
    readFile("robots.txt", "utf8"),
  ]);
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<html lang="hu">/);
  assert.match(html, /name="robots" content="noindex,nofollow,noarchive"/);
  for (const id of ["setup-form","usage-profiles","appliance-grid","result-verdict","existing-setup-check","product-recommendations","system-diagram","charging-options","roof-fit","installation-plan","power-station-profile"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(browser, /buildHungarianApplicationResult/);
  assert.match(browser, /loadHungarianProductCatalog/);
  assert.match(browser, /mountExistingSetupCheck/);
  assert.match(browser, /data-affiliate-click/);
  assert.doesNotMatch(sitemap, /mypowersetup\.com\/hu\//);
  assert.doesNotMatch(robots, /\/hu\//);
  assert.equal(await fileExists("hu/index.html"), false);
});

test("Hungarian trust pages are complete but remain private until market launch", async () => {
  const pages = Object.keys(HU_TRUST_ROUTES).map((kind) => [kind, renderHungarianTrustPage(kind)]);
  assert.equal(pages.length, 4);
  for (const [kind, html] of pages) {
    assert.match(html, /^<!doctype html>/);
    assert.match(html, /<html lang="hu">/);
    assert.match(html, /name="robots" content="noindex,nofollow,noarchive"/);
    assert.match(html, new RegExp(`https://mypowersetup\\.com${HU_TRUST_ROUTES[kind]}`));
    assert.match(html, /xfit\.redakce@gmail\.com|Módszertan|Partnerkapcsolatok|Adatvédelem/);
    assert.equal(await fileExists(`${HU_TRUST_ROUTES[kind].slice(1)}index.html`), false);
  }
  assert.match(pages.find(([kind]) => kind === "about")[1], /Petr Gálík/);
  assert.match(pages.find(([kind]) => kind === "methodology")[1], /determinisztikus/);
  assert.match(pages.find(([kind]) => kind === "methodology")[1], /A jutalék nem része a pontozásnak/);
  assert.match(pages.find(([kind]) => kind === "affiliate")[1], /jutalékot kaphatunk/);
  assert.match(pages.find(([kind]) => kind === "privacy")[1], /data-consent-settings/);
  assert.throws(() => renderHungarianTrustPage("missing"), /HU_TRUST_PAGE_UNKNOWN/);
});

async function fileExists(path) {
  try { await readFile(path); return true; } catch { return false; }
}
