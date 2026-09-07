import test from "node:test";
import assert from "node:assert/strict";

import { buildXdatouAffiliateUrl } from "../src/affiliate-xdatou.js";
import { validatePtCatalog } from "../src/products-pt.js";
import { validateRomaniaCatalog } from "../src/ro-recommendations.js";
import { validateSloveniaCatalog } from "../src/si-recommendations.js";

const productUrl = "https://eu.xdatou.com/collections/xdatou-portable-inverter/products/datouboss-2000w-pure-sine-wave-inverter-24v-car-truck";
const source = Object.freeze({
  status: "ok",
  network: "goaffpro",
  approvalConfirmed: true,
  referralIdentifier: "ref",
  referralCode: "MPS_1234",
  exactProducts: 1,
  shippingEligibleMarkets: ["pt-PT", "ro-RO", "sl-SI"],
  verifiedAt: "2026-09-07",
});

function product() {
  return {
    id: "xdatou:987654321",
    merchant: "xdatou",
    name: "DATOUBOSS 2000W Pure Sine Wave Inverter 24V to 230V",
    description: "DATOUBOSS 24 V DC to 230 V AC pure sine inverter; 2000 W continuous and 4000 W peak output.",
    categoryPath: "Inverter",
    category: "inverter",
    brand: "DATOUBOSS",
    priceCzk: 139,
    priceCurrency: "EUR",
    available: true,
    productUrl,
    affiliateUrl: buildXdatouAffiliateUrl(productUrl, {
      approvalConfirmed: true,
      referralIdentifier: source.referralIdentifier,
      referralCode: source.referralCode,
    }),
    imageUrl: "https://cdn.shopify.com/xdatou.webp",
    specs: { voltageV: 24, powerW: 2000, pureSine: true },
    verifiedAt: "2026-09-07",
    marketEligible: true,
  };
}

function ptCatalog(overrides = {}) {
  return {
    generatedAt: "2026-09-07T14:00:00.000Z",
    market: "pt-PT",
    currency: "EUR",
    private: false,
    sources: { xdatou: source },
    products: [product()],
    ...overrides,
  };
}

function roCatalog(overrides = {}) {
  return {
    generatedAt: "2026-09-07T14:00:00.000Z",
    market: "ro-RO",
    currency: "EUR",
    private: false,
    shippingEligibility: { country: "Romania", eligible: true },
    sources: { xdatou: source },
    products: [product()],
    ...overrides,
  };
}

function siCatalog(overrides = {}) {
  return {
    generatedAt: "2026-09-07T14:00:00.000Z",
    market: "sl-SI",
    currency: "EUR",
    private: false,
    shippingEligibility: { country: "Slovenia", eligible: true },
    sources: { xdatou: source },
    products: [product()],
    ...overrides,
  };
}

test("activated Xdatou exact inverter is accepted by PT RO and SI catalogs", () => {
  assert.equal(validatePtCatalog(ptCatalog()).products[0].merchant, "xdatou");
  assert.equal(validateRomaniaCatalog(roCatalog()).products[0].merchant, "xdatou");
  assert.equal(validateSloveniaCatalog(siCatalog()).products[0].merchant, "xdatou");
});

test("Xdatou product cannot enter any expansion catalog while its source is blocked", () => {
  for (const [validate, catalog] of [
    [validatePtCatalog, ptCatalog],
    [validateRomaniaCatalog, roCatalog],
    [validateSloveniaCatalog, siCatalog],
  ]) {
    assert.throws(
      () => validate(catalog({ sources: { xdatou: { ...source, status: "blocked", approvalConfirmed: false } } })),
      /XDATOU_SOURCE_INVALID/
    );
  }
});

test("Xdatou catalog rejects mismatched tracking and a non-exact product destination", () => {
  const badTracking = product();
  badTracking.affiliateUrl = badTracking.affiliateUrl.replace("MPS_1234", "OTHER_CODE");
  assert.throws(
    () => validateRomaniaCatalog(roCatalog({ products: [badTracking] })),
    /XDATOU_AFFILIATE_INVALID/
  );

  const badDestination = product();
  badDestination.productUrl = "https://eu.xdatou.com/collections/xdatou-portable-inverter";
  assert.throws(
    () => validateSloveniaCatalog(siCatalog({ products: [badDestination] })),
    /XDATOU_PRODUCT_URL_INVALID/
  );
});
