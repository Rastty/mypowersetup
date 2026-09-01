import test from "node:test";
import assert from "node:assert/strict";
import { buildAllpowersPtDeeplink } from "../src/affiliate-allpowers-pt.js";
import { buildPortugalRecommendations, loadPortugalProductCatalog, portugalRecommendationCoverage } from "../src/pt-recommendations.js";

const setup = Object.freeze({
  dailyWh: 700,
  autonomyDays: 1,
  solarWatts: 300,
  inverterWatts: 600,
  applianceRows: [
    { ac: false, watts: 45, quantity: 1 },
    { ac: true, watts: 400, quantity: 1 },
  ],
});

function product(overrides = {}) {
  const productUrl = overrides.productUrl || "https://allpowers-pt.com/products/painel-solar-200w";
  return {
    id: "allpowers_pt-1",
    merchant: "allpowers_pt",
    name: "Painel solar 200 W",
    description: "Painel solar portátil 200 W",
    category: "solar_panel",
    brand: "ALLPOWERS",
    priceCzk: 199,
    priceCurrency: "EUR",
    available: true,
    productUrl,
    affiliateUrl: buildAllpowersPtDeeplink(productUrl),
    imageUrl: null,
    specs: { powerW: 200 },
    verifiedAt: null,
    ...overrides,
  };
}

function catalog(products) {
  return { generatedAt: "2026-08-29T00:00:00.000Z", market: "pt-PT", currency: "EUR", sources: { allpowers_pt: { status: "ok" } }, products };
}

test("Portugal loader accepts only the private pt-PT catalog", async () => {
  const payload = catalog([product()]);
  const loaded = await loadPortugalProductCatalog(async (url, options) => {
    assert.equal(url, "/data/products-pt.json");
    assert.deepEqual(options, { cache: "no-store" });
    return { ok: true, json: async () => payload };
  });
  assert.equal(loaded.products.length, 1);
  assert.equal(loaded.products[0].merchant, "allpowers_pt");
});

test("Portugal recommendations choose a bounded solar quantity and exact affiliate destination", () => {
  const recommendations = buildPortugalRecommendations(catalog([
    product(),
    product({ id: "allpowers_pt-2", productUrl: "https://allpowers-pt.com/products/painel-solar-100w", affiliateUrl: buildAllpowersPtDeeplink("https://allpowers-pt.com/products/painel-solar-100w"), name: "Painel solar 100 W", specs: { powerW: 100 }, priceCzk: 129 }),
  ]), setup);
  assert.equal(recommendations.solar_panel.length, 2);
  assert.equal(recommendations.solar_panel[0].quantity, 3);
  assert.equal(recommendations.solar_panel[0].powerW, 100);
  assert.match(recommendations.solar_panel[0].affiliateUrl, /awinmid=125820/);
  assert.deepEqual(portugalRecommendationCoverage(recommendations), { battery: false, solarPanel: true, controller: false, inverter: false, powerStation: false });
});

test("Portugal catalog validation rejects a mismatched affiliate destination", () => {
  const wrongDestination = "https://allpowers-pt.com/products/outro-produto";
  assert.throws(() => buildPortugalRecommendations(catalog([
    product({ affiliateUrl: buildAllpowersPtDeeplink(wrongDestination) }),
  ]), setup), /PT_CATALOG_AFFILIATE_INVALID/);
});

test("Portugal power stations require verified limits and must fit the calculated profile", () => {
  const psUrl = "https://allpowers-pt.com/products/estacao-r1500";
  const recommendations = buildPortugalRecommendations(catalog([
    product({
      id: "allpowers_pt-ps",
      name: "Estação de energia R1500",
      description: "Portable power station",
      category: "power_station",
      productUrl: psUrl,
      affiliateUrl: buildAllpowersPtDeeplink(psUrl),
      priceCzk: 899,
      specs: { capacityWh: 1200, powerW: 1800, solarInputW: 650, dcOutputA: 10 },
      verifiedAt: "2026-08-29",
    }),
  ]), setup);
  assert.equal(recommendations.power_station.length, 1);
  assert.equal(recommendations.power_station[0].name, "Estação de energia R1500");
});

test("Portugal recommendations fail closed when the catalog is empty", () => {
  const recommendations = buildPortugalRecommendations(catalog([]), setup);
  assert.deepEqual(portugalRecommendationCoverage(recommendations), { battery: false, solarPanel: false, controller: false, inverter: false, powerStation: false });
});
