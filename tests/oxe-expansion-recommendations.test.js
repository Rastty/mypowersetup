import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildOxeDognetDeeplink } from "../src/oxe-affiliate.js";
import { buildRomaniaRecommendations, validateRomaniaCatalog } from "../src/ro-recommendations.js";
import { buildSloveniaRecommendations, validateSloveniaCatalog } from "../src/si-recommendations.js";

const setup = Object.freeze({
  dailyWh: 100,
  autonomyDays: 1,
  solarWatts: 80,
  inverterWatts: 200,
  applianceRows: Object.freeze([{ ac: false, watts: 36, quantity: 1 }]),
});

function oxeCatalog(market) {
  const isRo = market === "ro";
  const productUrl = isRo
    ? "https://www.oxe.ro/oxe-powerstation-s400-generator-de-incarcare-multifunctional/"
    : "https://www.oxepower.si/oxe-powerstation-s400-vecnamenski-polnilni-generator/";
  return {
    generatedAt: "2026-08-31T00:00:00.000Z",
    market: isRo ? "ro-RO" : "sl-SI",
    currency: "EUR",
    private: false,
    shippingEligibility: { country: isRo ? "Romania" : "Slovenia", eligible: true },
    products: [{
      id: `${isRo ? "oxe_ro" : "oxe_si"}:S400`,
      merchant: isRo ? "oxe_ro" : "oxe_si",
      name: "OXE Powerstation S400",
      category: "power_station",
      priceCzk: isRo ? 1984.82 : 356.68,
      priceCurrency: isRo ? "RON" : "EUR",
      available: true,
      marketEligible: true,
      verifiedAt: "2026-08-31",
      productUrl,
      affiliateUrl: buildOxeDognetDeeplink(market, productUrl),
      specs: { capacityWh: 385.56, powerW: 400, solarInputW: 90, dcOutputA: 8, pureSine: true },
    }],
  };
}

test("Romania accepts and recommends an exact verified OXE local power station", () => {
  const catalog = oxeCatalog("ro");
  assert.equal(validateRomaniaCatalog(catalog), catalog);
  const result = buildRomaniaRecommendations(catalog, setup);
  assert.equal(result.power_station.length, 1);
  assert.equal(result.power_station[0].merchant, "oxe_ro");
  assert.equal(catalog.products[0].priceCurrency, "RON");
  assert.equal(result.power_station[0].currency, "RON");
  assert.equal(result.power_station[0].price, 1984.82);
});

test("Slovenia accepts and recommends an exact verified OXE local power station", () => {
  const catalog = oxeCatalog("si");
  assert.equal(validateSloveniaCatalog(catalog), catalog);
  const result = buildSloveniaRecommendations(catalog, setup);
  assert.equal(result.power_station.length, 1);
  assert.equal(result.power_station[0].merchant, "oxe_si");
});

test("expansion catalogs reject cross-market OXE merchant and tampered Dognet channel", () => {
  const ro = oxeCatalog("ro");
  ro.products[0].merchant = "oxe_si";
  assert.throws(() => validateRomaniaCatalog(ro), /RO_PRODUCT_MERCHANT_INVALID/);

  const si = oxeCatalog("si");
  const url = new URL(si.products[0].affiliateUrl);
  url.searchParams.set("chid", "v9mcMMKw");
  si.products[0].affiliateUrl = url.toString();
  assert.throws(() => validateSloveniaCatalog(si), /OXE_DOGNET_CHANNEL_INVALID/);
});

test("incomplete OXE technical evidence is rejected rather than recommended", () => {
  const ro = oxeCatalog("ro");
  ro.products[0].specs.solarInputW = null;
  assert.throws(() => validateRomaniaCatalog(ro), /RO_POWER_STATION_SPECS_INVALID/);
});

test("Romanian OXE purchase prices fail closed when a lei feed amount is labelled as euros", () => {
  const ro = oxeCatalog("ro");
  ro.products[0].priceCurrency = "EUR";
  assert.throws(() => validateRomaniaCatalog(ro), /RO_OXE_PRICE_CURRENCY_INVALID/);
});


test("committed RO and SI catalogs never expose a standalone SP solar panel as a power station", () => {
  for (const [market, path] of [["ro", "../data/products-ro.json"], ["si", "../data/products-si.json"]]) {
    const catalog = JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
    const corrupted = catalog.products.filter((product) => {
      const name = String(product.name || "");
      const stationIndex = name.search(/power\s*station|powerstation/i);
      const solarIndex = name.search(/solar|solarn|solár|słonecz|napelem|panou/i);
      const standalonePanel = solarIndex >= 0 && (stationIndex < 0 || solarIndex < stationIndex);
      return product.category === "power_station" && standalonePanel;
    });
    assert.deepEqual(corrupted, [], `${market} contains standalone panels with station specs`);
    assert.equal(catalog.products.some((product) => product.id === `oxe_${market}:OXE8020` && product.category === "power_station"), false);
  }
});

test("committed Romanian OXE feed prices retain Romanian lei rather than euros", () => {
  const catalog = JSON.parse(readFileSync(new URL("../data/products-ro.json", import.meta.url), "utf8"));
  const localOffers = catalog.products.filter((product) => product.merchant === "oxe_ro");
  assert.ok(localOffers.length > 0);
  for (const offer of localOffers) {
    assert.equal(offer.priceCurrency, "RON", `${offer.id} must not display the RON amount as EUR`);
  }
});
