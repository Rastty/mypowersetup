import test from "node:test";
import assert from "node:assert/strict";
import { validatePtCatalog } from "../src/products-pt.js";
import { validateRomaniaCatalog } from "../src/ro-recommendations.js";
import { validateSloveniaCatalog } from "../src/si-recommendations.js";
import { validatePowerQueenExpansionProduct } from "../src/powerqueen-expansion.js";

function affiliate(productUrl) {
  const url = new URL("https://www.awin1.com/cread.php");
  url.searchParams.set("awinmid", "97025");
  url.searchParams.set("awinaffid", "3044971");
  url.searchParams.set("ued", productUrl);
  return url.toString();
}

function pq(overrides = {}) {
  const productUrl = overrides.productUrl || "https://www.ipowerqueen.de/en/products/power-queen-12v-100ah-lifepo4-battery-built-in-100a-bms";
  return {
    id: "powerqueen_eu:test",
    merchant: "powerqueen_eu",
    name: "Power Queen 12V 100Ah LiFePO4 Battery Built-in 100A BMS",
    description: "12.8 V 100 Ah LiFePO4 service battery with built-in BMS.",
    category: "battery",
    priceCzk: 299.99,
    priceCurrency: "EUR",
    available: true,
    marketEligible: true,
    productUrl,
    affiliateUrl: affiliate(productUrl),
    specs: { voltageV: 12, capacityAh: 100, batteryType: "lifepo4" },
    ...overrides,
  };
}

const components = [
  pq(),
  pq({
    id: "powerqueen_eu:mppt",
    name: "Power Queen 60A MPPT Solar Charge Controller",
    description: "MPPT solar charge controller for off-grid battery systems.",
    category: "controller",
    productUrl: "https://www.ipowerqueen.de/en/products/60a-mppt-solar-charge-controller",
    specs: { currentA: 60 },
  }),
  pq({
    id: "powerqueen_eu:inverter",
    name: "Power Queen 2000W Pure Sine Inverter",
    description: "12 V DC to 230 V AC pure sine inverter.",
    category: "inverter",
    productUrl: "https://www.ipowerqueen.de/en/products/power-queen-2000w-inverter-12v-dc-to-230v-ac-converter",
    verifiedAt: "2026-08-29",
    specs: { voltageV: 12, powerW: 2000, pureSine: true },
  }),
  pq({
    id: "powerqueen_eu:charger",
    name: "Power Queen 14.6V 20A LiFePO4 battery charger",
    description: "AC charger for 12 V LiFePO4 batteries.",
    category: "shore_charger",
    productUrl: "https://www.ipowerqueen.de/en/products/power-queen-14-6v-20a-lifepo4-battery-charger-2-stage-automatic-intelligent-lifepo4-lithium-battery-charger-suitable-for-12v-12-8v-lithium-battery",
    verifiedAt: "2026-08-29",
    specs: { voltageV: 12, currentA: 20, chargingVoltagesV: [12], chargingBatteryTypes: ["lifepo4"], batteryType: "lifepo4" },
  }),
].map((product) => ({ ...product, affiliateUrl: affiliate(product.productUrl) }));

function sources() {
  return { powerqueen_eu: { status: "ok", awinMerchantId: 97025, affiliateId: 3044971 } };
}

test("strict Power Queen gate accepts only purchase-ready component evidence", () => {
  for (const product of components) assert.equal(validatePowerQueenExpansionProduct(product), product);

  assert.throws(() => validatePowerQueenExpansionProduct(pq({ affiliateUrl: "https://www.awin1.com/cread.php?awinmid=97025&awinaffid=3044971&ued=https%3A%2F%2Fexample.com%2Fbad" })), /DESTINATION|PRODUCT_URL/);
  assert.throws(() => validatePowerQueenExpansionProduct(pq({ category: "solar_panel", specs: { powerW: 100 } })), /CATEGORY_INVALID/);
  assert.throws(() => validatePowerQueenExpansionProduct(pq({ name: "Power Queen battery", description: "LiFePO4", specs: { voltageV: 12, capacityAh: 100, batteryType: "lifepo4" } })), /BMS_EVIDENCE/);
});

test("Portugal accepts live Power Queen components but rejects a stale source", () => {
  const catalog = { market: "pt-PT", currency: "EUR", private: false, sources: sources(), products: components };
  assert.equal(validatePtCatalog(catalog).products.length, components.length);
  assert.throws(() => validatePtCatalog({ ...catalog, sources: { powerqueen_eu: { status: "stale" } } }), /POWERQUEEN_SOURCE_INVALID/);
});

test("Romania accepts live Power Queen components under existing market shipping gate", () => {
  const catalog = {
    market: "ro-RO", currency: "EUR", private: false, sources: sources(), products: components,
    shippingEligibility: { country: "Romania", eligible: true },
  };
  assert.equal(validateRomaniaCatalog(catalog), catalog);
  assert.throws(() => validateRomaniaCatalog({ ...catalog, sources: { powerqueen_eu: { status: "stale" } } }), /POWERQUEEN_SOURCE_INVALID/);
});

test("Slovenia accepts live Power Queen components under existing market shipping gate", () => {
  const catalog = {
    market: "sl-SI", currency: "EUR", private: false, sources: sources(), products: components,
    shippingEligibility: { country: "Slovenia", eligible: true },
  };
  assert.equal(validateSloveniaCatalog(catalog), catalog);
  assert.throws(() => validateSloveniaCatalog({ ...catalog, sources: { powerqueen_eu: { status: "stale" } } }), /POWERQUEEN_SOURCE_INVALID/);
});
