import test from "node:test";
import assert from "node:assert/strict";

import {
  BLUETTI_ELITE300,
  BLUETTI_ELITE300_CJ,
  bluettiElite300Destination,
  createBluettiElite300Candidate,
  validateBluettiElite300CjUrl,
  validateBluettiElite300Product,
} from "../src/affiliate-bluetti-eu.js";

const destination = "https://www.bluettipower.eu/products/elite-300-portable-power-station";
const cj = `https://www.dpbolvw.net/click-101869970-99999999?url=${encodeURIComponent(destination)}`;

test("BLUETTI Elite 300 adapter stays fail-closed without exact CJ EU deeplink evidence", () => {
  assert.equal(BLUETTI_ELITE300_CJ.approvalConfirmed, true);
  assert.equal(BLUETTI_ELITE300_CJ.affiliateUrl, null);
  assert.equal(BLUETTI_ELITE300_CJ.finalLandingUrl, null);
  assert.equal(BLUETTI_ELITE300_CJ.verifiedAt, null);

  const candidate = createBluettiElite300Candidate({
    inStock: true,
    shippableMarkets: ["pt", "ro"],
  });
  assert.equal(candidate.productUrl, null);
  assert.equal(candidate.affiliateUrl, null);
  assert.equal(candidate.recommendationEligible, false);
});

test("CJ validator requires an exact Elite 300 EU destination and verified final landing", () => {
  assert.equal(validateBluettiElite300CjUrl(cj, {
    finalLandingUrl: destination,
    verifiedAt: "2026-09-07",
  }), true);

  assert.equal(validateBluettiElite300CjUrl(cj.replace("elite-300-portable-power-station", "ac200l"), {
    finalLandingUrl: destination,
    verifiedAt: "2026-09-07",
  }), false);
  assert.equal(validateBluettiElite300CjUrl(cj, {
    finalLandingUrl: "https://www.bluettipower.com/products/elite-300-portable-power-station",
    verifiedAt: "2026-09-07",
  }), false);
  assert.equal(validateBluettiElite300CjUrl(cj.replace("www.dpbolvw.net", "example.com"), {
    finalLandingUrl: destination,
    verifiedAt: "2026-09-07",
  }), false);
});

test("activated Elite 300 candidate is limited to PT and RO", () => {
  const candidate = createBluettiElite300Candidate({
    affiliateUrl: cj,
    finalLandingUrl: destination,
    verifiedAt: "2026-09-07",
    inStock: true,
    shippableMarkets: ["pt", "ro", "si"],
  });

  assert.deepEqual(candidate.verifiedMarkets, ["pt", "ro"]);
  assert.equal(candidate.productUrl, bluettiElite300Destination());
  assert.equal(candidate.affiliateUrl, cj);
  assert.equal(candidate.recommendationEligible, true);
});

test("runtime validator preserves exact Elite 300 technical and tracking evidence", () => {
  const product = {
    id: "bluetti_eu:elite-300",
    merchant: "bluetti_eu",
    name: "BLUETTI Elite 300",
    categoryPath: "Portable Power Station",
    category: "power_station",
    brand: "BLUETTI",
    priceCzk: 1499,
    priceCurrency: "EUR",
    available: true,
    marketEligible: true,
    productUrl: destination,
    affiliateUrl: cj,
    verifiedAt: "2026-09-07",
    specs: {
      capacityWh: 3014.4,
      powerW: 2400,
      pureSine: true,
      solarInputW: 1200,
      dcOutputVoltageV: 12,
      dcOutputA: 30,
      batteryType: "lifepo4",
    },
  };
  const source = {
    status: "ok",
    network: "cj",
    approvalConfirmed: true,
    finalLandingUrl: destination,
    trackingVerifiedAt: "2026-09-07",
  };

  assert.equal(validateBluettiElite300Product(product, source), product);
  assert.throws(() => validateBluettiElite300Product({ ...product, specs: { ...product.specs, dcOutputA: 10 } }, source), /SPECS_INVALID/);
  assert.throws(() => validateBluettiElite300Product(product, { ...source, status: "blocked" }), /SOURCE_INVALID/);
});

test("adapter never reuses current BLUETTI US destination", () => {
  const us = "https://www.dpbolvw.net/click-101869970-17110660?url=https%3A%2F%2Fwww.bluettipower.com%2Fproducts%2Fac200l";
  assert.equal(validateBluettiElite300CjUrl(us, {
    finalLandingUrl: destination,
    verifiedAt: "2026-09-07",
  }), false);
  assert.equal(BLUETTI_ELITE300.exactPath, "/products/elite-300-portable-power-station");
});
