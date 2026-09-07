import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildBluettiEuAffiliateUrl, BLUETTI_ELITE_300 } from "../src/affiliate-bluetti-eu.js";
import { assessMarketScenarioCoverage } from "../src/commercial-scenarios.js";

const destination = "https://www.bluettipower.eu/products/elite-300-portable-power-station";

function activatedElite300() {
  return {
    id: "bluetti_eu:elite-300",
    merchant: "bluetti_eu",
    name: "BLUETTI Elite 300 Portable Power Station 2400W 3014.4Wh",
    description: "LiFePO4 portable power station with 3014.4Wh capacity, 2400W pure sine AC output, 1200W solar input and 12V 30A RV DC output.",
    categoryPath: "Portable Power Station",
    category: "power_station",
    brand: "BLUETTI",
    priceCzk: 1499,
    priceCurrency: "EUR",
    available: true,
    marketEligible: true,
    productUrl: destination,
    affiliateUrl: buildBluettiEuAffiliateUrl(destination, { approvalConfirmed: true }),
    verifiedAt: "2026-09-07",
    specs: {
      capacityWh: BLUETTI_ELITE_300.capacityWh,
      powerW: BLUETTI_ELITE_300.powerW,
      pureSine: true,
      solarInputW: BLUETTI_ELITE_300.solarInputW,
      dcOutputA: BLUETTI_ELITE_300.dcOutputA,
      batteryType: "lifepo4",
    },
  };
}

test("activated Elite 300 closes the only remaining PT RO SI purchase-ready scenario gap", async () => {
  for (const [file, locale] of [
    ["products-pt.json", "pt"],
    ["products-ro.json", "ro"],
    ["products-si.json", "sl"],
  ]) {
    const catalog = JSON.parse(await readFile(new URL(`../data/${file}`, import.meta.url), "utf8"));
    const before = assessMarketScenarioCoverage(catalog, locale);
    const familyBefore = before.scenarios.find((scenario) => scenario.id === "family-touring");

    assert.equal(familyBefore.purchaseReady, false, `${catalog.market}: family should expose the current gap before activation`);
    assert.ok(before.purchaseReadyRatio < 1, `${catalog.market}: current purchase coverage should not already be complete`);

    const activatedCatalog = {
      ...catalog,
      sources: { ...(catalog.sources || {}), bluetti_eu: { status: "ok" } },
      products: [...catalog.products, activatedElite300()],
    };
    const after = assessMarketScenarioCoverage(activatedCatalog, locale);
    const familyAfter = after.scenarios.find((scenario) => scenario.id === "family-touring");

    assert.equal(familyAfter.portableReady, true, `${catalog.market}: Elite 300 should fit family portable requirements`);
    assert.equal(familyAfter.purchaseReady, true, `${catalog.market}: family should become purchase-ready`);
    assert.equal(familyAfter.purchaseRoute, "portable");
    assert.equal(after.purchaseReadyRatio, 1, `${catalog.market}: Elite 300 should lift weighted purchase readiness to 100%`);
    assert.equal(after.readyWeight, after.totalWeight);
  }
});
