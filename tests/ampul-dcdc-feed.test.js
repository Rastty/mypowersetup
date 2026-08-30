import test from "node:test";
import assert from "node:assert/strict";
import { parseProductFeed } from "../src/feed.js";
import { recommendProducts, refreshCatalogProduct } from "../src/products.js";

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0"><channel><item>
  <g:id>6195</g:id>
  <g:title>DC/DC LiFePO4 battery charger 14.6V, 30A, 400W, IP68</g:title>
  <g:description>Input voltage: 10-36 V DC. Rated input voltage: 12V/24V DC. Output voltage: 14.6 V DC. Output current: 30 A. Suitable for LiFePO4 batteries in vehicles and caravans.</g:description>
  <g:link>https://ampul.eu/sk/nabijacky/6195-dc-dc-nabijacka-lifepo4-baterii-146v-30a-400w-ip68</g:link>
  <g:price>129 EUR</g:price>
  <g:availability>in_stock</g:availability>
  <g:product_type>Nabíjačky</g:product_type>
</item></channel></rss>`;

test("verified Ampul 6195 is ingested as a 12 V LiFePO4 DC-DC charger without changing its exact destination", () => {
  const [product] = parseProductFeed(xml, "ampul_sk");
  assert.ok(product);
  assert.equal(product.id, "ampul_sk:6195");
  assert.equal(product.category, "dc_charger");
  assert.equal(product.available, true);
  assert.equal(product.productUrl, "https://ampul.eu/sk/nabijacky/6195-dc-dc-nabijacka-lifepo4-baterii-146v-30a-400w-ip68");
  assert.equal(new URL(product.affiliateUrl).searchParams.get("desturl"), product.productUrl);
  assert.equal(product.specs.currentA, 30);
  assert.deepEqual(product.specs.chargingVoltagesV, [12]);
  assert.deepEqual(product.specs.chargingInputVoltagesV, [12, 24]);
  assert.deepEqual(product.specs.chargingBatteryTypes, ["lifepo4"]);
});

test("catalog refresh preserves explicitly verified exact-fit metadata", () => {
  const [product] = parseProductFeed(xml, "ampul_sk");
  const refreshed = refreshCatalogProduct(product);
  assert.equal(refreshed.category, "dc_charger");
  assert.equal(refreshed.verifiedAt, "2026-08-30");
  assert.equal(refreshed.specs.currentA, 30);
  assert.deepEqual(refreshed.specs.chargingVoltagesV, [12]);
  assert.deepEqual(refreshed.specs.chargingInputVoltagesV, [12, 24]);
  assert.deepEqual(refreshed.specs.chargingBatteryTypes, ["lifepo4"]);
});

test("verified Ampul 6195 can satisfy a compatible 12 V caravan charging setup", () => {
  const [product] = parseProductFeed(xml, "ampul_sk");
  const setup = {
    locale: "sk",
    batteryType: "lifepo4",
    systemVoltage: 12,
    batteryAh: 180,
    solarWatts: 200,
    controllerAmps: 20,
    inverterWatts: 100,
    charging: {
      starterVoltage: 12,
      dcDc: { suggestedCurrentAmps: 20 },
      shore: { suggestedCurrentAmps: 20 }
    }
  };
  const recommendations = recommendProducts([product], setup);
  assert.equal(recommendations.dc_charger.length, 1);
  assert.equal(recommendations.dc_charger[0].product.id, "ampul_sk:6195");
});

test("verified metadata remains fail-closed for incompatible 24 V house batteries", () => {
  const [product] = parseProductFeed(xml, "ampul_sk");
  const setup = {
    locale: "sk",
    batteryType: "lifepo4",
    systemVoltage: 24,
    batteryAh: 100,
    solarWatts: 250,
    controllerAmps: 20,
    inverterWatts: 2000,
    charging: {
      starterVoltage: 12,
      dcDc: { suggestedCurrentAmps: 20 },
      shore: { suggestedCurrentAmps: 20 }
    }
  };
  assert.equal(recommendProducts([product], setup).dc_charger.length, 0);
});
