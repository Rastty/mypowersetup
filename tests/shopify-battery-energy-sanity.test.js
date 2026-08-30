import test from "node:test";
import assert from "node:assert/strict";
import { parseShopifyProducts } from "../src/shopify.js";

function parseBattery(description) {
  const products = parseShopifyProducts({
    products: [{
      id: 1001,
      title: "Power Queen 12V 100Ah LiFePO4 Battery with BMS",
      handle: "12v-100ah-lifepo4-battery",
      body_html: description,
      product_type: "LiFePO4 Batteries",
      vendor: "Power Queen",
      variants: [{ price: "199.99", available: true }],
      images: []
    }]
  }, "powerqueen_eu", {
    origin: "https://www.ipowerqueen.de/en/",
    productPathPrefix: "/en/products/"
  });
  assert.equal(products.length, 1);
  assert.equal(products[0].category, "battery");
  return products[0];
}

test("Shopify battery ignores unrelated low Wh figures from descriptive copy", () => {
  const product = parseBattery("LiFePO4 battery. Cell energy density 15.6 Wh/kg. Designed for caravan service use.");
  assert.equal(product.specs.voltageV, 12);
  assert.equal(product.specs.capacityAh, 100);
  assert.equal(product.specs.capacityWh, null);
});

test("Shopify battery ignores system-scale Wh figures that cannot describe the unit", () => {
  const product = parseBattery("LiFePO4 battery. Up to 20 480 Wh in a multi-battery installation.");
  assert.equal(product.specs.capacityWh, null);
});

test("Shopify battery keeps a physically plausible stated Wh capacity", () => {
  const product = parseBattery("LiFePO4 battery with 1280 Wh rated energy.");
  assert.equal(product.specs.capacityWh, 1280);
});
