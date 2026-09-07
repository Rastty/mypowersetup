import test from "node:test";
import assert from "node:assert/strict";

import { syncPowerQueenEu } from "../scripts/lib/sync-powerqueen-eu.mjs";

function shopifyProduct(id, handle, title, productType, body = title, { price = "100.00", available = true } = {}) {
  return {
    id,
    handle,
    title,
    product_type: productType,
    vendor: "Power Queen",
    body_html: body,
    variants: [{ id: id * 10, price, available }],
    images: [{ src: `https://cdn.example/${handle}.jpg` }],
  };
}

function payload({ inverterAvailable = true, charger10Available = true, charger20Available = true } = {}) {
  return {
    products: [
      shopifyProduct(1, "12v-100ah-lifepo4-battery-built-in-bms", "Power Queen 12V 100Ah LiFePO4 Battery Built-in BMS", "Batteries"),
      shopifyProduct(2, "24v-100ah-lifepo4-battery-built-in-bms", "Power Queen 24V 100Ah LiFePO4 Battery Built-in BMS", "Batteries"),
      shopifyProduct(3, "mppt-12-24v-30a-solar-charge-controller", "Power Queen MPPT 12/24V 30A Solar Charge Controller", "Battery Charge Controllers"),
      shopifyProduct(4, "power-queen-2000w-inverter-12v-dc-to-230v-ac-converter", "Power Queen 2000W inverter 12V to 230V pure sine wave", "Accessories", undefined, { price: "219.99", available: inverterAvailable }),
      shopifyProduct(5, "power-queen-14-6v-10a-lifepo4-battery-charger", "Power Queen 14.6V 10A LiFePO4 charger for 12V LiFePO4 battery", "Accessories", undefined, { price: "71.99", available: charger10Available }),
      shopifyProduct(6, "power-queen-14-6v-20a-lifepo4-battery-charger-2-stage-automatic-intelligent-lifepo4-lithium-battery-charger-suitable-for-12v-12-8v-lithium-battery", "Power Queen 14.6V 20A LiFePO4 charger for 12V LiFePO4 battery", "Accessories", undefined, { price: "85.99", available: charger20Available }),
      shopifyProduct(7, "power-queen-14-6v-40a-lifepo4-charger-without-handle", "Power Queen 14.6V 40A LiFePO4 charger with handle for 12V battery", "Accessories", undefined, { price: "169.99" }),
      shopifyProduct(8, "power-queen-29-2v-20-amp-lithium-lifepo4-battery-charger", "Power Queen 29.2V 20A LiFePO4 charger for 24V LiFePO4 battery", "Accessories", undefined, { price: "102.99" }),
    ],
  };
}

async function withFetchPayload(data, callback) {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, async json() { return data; } });
  try {
    return await callback();
  } finally {
    globalThis.fetch = previous;
  }
}

test("Power Queen sync admits only live exact verified inverter and shore chargers", async () => {
  const result = await withFetchPayload(payload(), () => syncPowerQueenEu());
  assert.equal(result.source.status, "ok");
  assert.equal(result.source.batteries, 2);
  assert.equal(result.source.controllers, 1);
  assert.equal(result.source.inverters, 1);
  assert.equal(result.source.shoreChargers, 4);

  const inverter = result.products.find((product) => product.category === "inverter");
  assert.ok(inverter);
  assert.deepEqual({ voltageV: inverter.specs.voltageV, powerW: inverter.specs.powerW, pureSine: inverter.specs.pureSine }, { voltageV: 12, powerW: 2000, pureSine: true });
  assert.equal(new URL(inverter.affiliateUrl).searchParams.get("ued"), inverter.productUrl);

  const chargers = result.products.filter((product) => product.category === "shore_charger");
  assert.deepEqual(chargers.map((product) => [product.specs.voltageV, product.specs.currentA]).sort((a, b) => a[0] - b[0] || a[1] - b[1]), [[12, 10], [12, 20], [12, 40], [24, 20]]);
  assert.ok(chargers.every((product) => product.specs.chargingBatteryTypes.includes("lifepo4")));
  assert.ok(chargers.every((product) => new URL(product.affiliateUrl).searchParams.get("ued") === product.productUrl));
});

test("verified technical facts never invent availability", async () => {
  const result = await withFetchPayload(payload({ inverterAvailable: false }), () => syncPowerQueenEu());
  assert.equal(result.source.status, "ok");
  assert.equal(result.source.inverters, 0);
  assert.equal(result.products.some((product) => product.productUrl.includes("2000w-inverter")), false);
});


test("10A exact charger preserves 12V shore coverage when the 20A SKU is out of stock", async () => {
  const result = await withFetchPayload(payload({ charger20Available: false }), () => syncPowerQueenEu());
  assert.equal(result.source.status, "ok");

  const chargers = result.products.filter((product) => product.category === "shore_charger");
  assert.equal(chargers.some((product) => product.specs.voltageV === 12 && product.specs.currentA === 20), false);

  const tenAmp = chargers.find((product) => product.specs.voltageV === 12 && product.specs.currentA === 10);
  assert.ok(tenAmp, "live 10A Power Queen charger must remain available");
  assert.equal(tenAmp.priceCzk, 71.99);
  assert.deepEqual(tenAmp.specs.chargingVoltagesV, [12]);
  assert.deepEqual(tenAmp.specs.chargingBatteryTypes, ["lifepo4"]);
  assert.equal(new URL(tenAmp.affiliateUrl).searchParams.get("ued"), tenAmp.productUrl);
});

test("10A technical whitelist never invents availability", async () => {
  const result = await withFetchPayload(payload({ charger10Available: false, charger20Available: false }), () => syncPowerQueenEu());
  assert.equal(result.source.status, "ok");
  assert.equal(result.products.some((product) => product.productUrl.includes("14-6v-10a-lifepo4")), false);
});
