import test from "node:test";
import assert from "node:assert/strict";

import {
  XDATOU_DATOUBOSS_2000W_24V,
  XDATOU_GOAFFPRO,
  XDATOU_SUPPORTED_MARKETS,
  buildXdatouAffiliateUrl,
  createXdatouInverterCandidate,
  validateXdatouAffiliateUrl,
  validateXdatouExpansionProduct,
} from "../src/affiliate-xdatou.js";

const destination = "https://eu.xdatou.com/collections/xdatou-portable-inverter/products/datouboss-2000w-pure-sine-wave-inverter-24v-car-truck";

test("Xdatou adapter stays fail-closed before GoAffPro approval and referral credentials", () => {
  assert.equal(XDATOU_GOAFFPRO.approvalConfirmed, false);
  assert.equal(XDATOU_GOAFFPRO.referralIdentifier, null);
  assert.equal(XDATOU_GOAFFPRO.referralCode, null);
  assert.equal(buildXdatouAffiliateUrl(destination), null);

  const candidate = createXdatouInverterCandidate({
    destination,
    inStock: true,
    shippableMarkets: ["pt", "ro", "si"],
  });

  assert.equal(candidate.affiliateUrl, null);
  assert.equal(candidate.recommendationEligible, false);
});

test("approved adapter generates only an exact-product GoAffPro referral URL", () => {
  const affiliateUrl = buildXdatouAffiliateUrl(destination, {
    approvalConfirmed: true,
    referralIdentifier: "ref",
    referralCode: "MPS_1234",
  });
  assert.ok(affiliateUrl);
  assert.equal(validateXdatouAffiliateUrl(affiliateUrl, {
    referralIdentifier: "ref",
    referralCode: "MPS_1234",
  }), true);

  const url = new URL(affiliateUrl);
  assert.equal(url.hostname, "eu.xdatou.com");
  assert.equal(url.pathname, XDATOU_DATOUBOSS_2000W_24V.exactPath);
  assert.equal(url.searchParams.get("ref"), "MPS_1234");

  assert.equal(buildXdatouAffiliateUrl("https://eu.xdatou.com/collections/xdatou-portable-inverter", {
    approvalConfirmed: true,
    referralIdentifier: "ref",
    referralCode: "MPS_1234",
  }), null);
  assert.equal(buildXdatouAffiliateUrl("https://example.com" + XDATOU_DATOUBOSS_2000W_24V.exactPath, {
    approvalConfirmed: true,
    referralIdentifier: "ref",
    referralCode: "MPS_1234",
  }), null);
});

test("referral identifier is not hardcoded and unsafe values stay blocked", () => {
  for (const identifier of ["ref", "aff", "click_id"]) {
    const affiliateUrl = buildXdatouAffiliateUrl(destination, {
      approvalConfirmed: true,
      referralIdentifier: identifier,
      referralCode: "abcDEF_123",
    });
    assert.equal(validateXdatouAffiliateUrl(affiliateUrl, {
      referralIdentifier: identifier,
      referralCode: "abcDEF_123",
    }), true);
  }

  assert.equal(buildXdatouAffiliateUrl(destination, {
    approvalConfirmed: true,
    referralIdentifier: "ref<script>",
    referralCode: "abc123",
  }), null);
  assert.equal(buildXdatouAffiliateUrl(destination, {
    approvalConfirmed: true,
    referralIdentifier: "ref",
    referralCode: "a b",
  }), null);
});

test("24V 2000W candidate becomes recommendation-eligible only with stock, market and verified tracking", () => {
  assert.equal(XDATOU_DATOUBOSS_2000W_24V.systemVoltageV, 24);
  assert.equal(XDATOU_DATOUBOSS_2000W_24V.continuousPowerW, 2000);
  assert.equal(XDATOU_DATOUBOSS_2000W_24V.peakPowerW, 4000);
  assert.equal(XDATOU_DATOUBOSS_2000W_24V.pureSine, true);
  assert.deepEqual(XDATOU_SUPPORTED_MARKETS, ["pt", "ro", "si"]);

  const candidate = createXdatouInverterCandidate({
    destination,
    inStock: true,
    shippableMarkets: ["pt", "ro", "si", "de"],
    approvalConfirmed: true,
    referralIdentifier: "ref",
    referralCode: "MPS_1234",
  });

  assert.deepEqual(candidate.verifiedMarkets, ["pt", "ro", "si"]);
  assert.equal(candidate.recommendationEligible, true);

  const outOfStock = createXdatouInverterCandidate({
    destination,
    inStock: false,
    shippableMarkets: ["pt", "ro", "si"],
    approvalConfirmed: true,
    referralIdentifier: "ref",
    referralCode: "MPS_1234",
  });
  assert.equal(outOfStock.recommendationEligible, false);

  const noShipping = createXdatouInverterCandidate({
    destination,
    inStock: true,
    shippableMarkets: [],
    approvalConfirmed: true,
    referralIdentifier: "ref",
    referralCode: "MPS_1234",
  });
  assert.equal(noShipping.recommendationEligible, false);
});


test("activated catalog validator accepts only the exact staged inverter evidence", () => {
  const affiliateUrl = buildXdatouAffiliateUrl(destination, {
    approvalConfirmed: true,
    referralIdentifier: "ref",
    referralCode: "MPS_1234",
  });
  const product = {
    id: "xdatou:987654321",
    merchant: "xdatou",
    name: XDATOU_DATOUBOSS_2000W_24V.name,
    category: "inverter",
    priceCzk: 139,
    priceCurrency: "EUR",
    available: true,
    marketEligible: true,
    productUrl: destination,
    affiliateUrl,
    verifiedAt: "2026-09-07",
    specs: { voltageV: 24, powerW: 2000, pureSine: true },
  };

  assert.equal(validateXdatouExpansionProduct(product, {
    approvalConfirmed: true,
    referralIdentifier: "ref",
    referralCode: "MPS_1234",
  }), product);

  assert.throws(() => validateXdatouExpansionProduct(product), /NOT_APPROVED/);
  assert.throws(() => validateXdatouExpansionProduct({ ...product, productUrl: "https://eu.xdatou.com/" }, {
    approvalConfirmed: true,
    referralIdentifier: "ref",
    referralCode: "MPS_1234",
  }), /PRODUCT_URL/);
  assert.throws(() => validateXdatouExpansionProduct({ ...product, specs: { ...product.specs, voltageV: 12 } }, {
    approvalConfirmed: true,
    referralIdentifier: "ref",
    referralCode: "MPS_1234",
  }), /SPECS/);
});
