import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { parseShopifyProducts } from "../src/shopify.js";
import { recommendProducts } from "../src/products.js";

const stationUrl = "https://allpowers.com.pl/products/r1500-lite";

test("Shopify parser creates exact Awin product links and applies verified electrical limits", () => {
  const products = parseShopifyProducts({
    products: [{
      id: 101,
      handle: "r1500-lite",
      title: "ALLPOWERS R1500 LITE Stacja Zasilania 1600W 1056Wh Akumulator LiFePO4",
      body_html: "<p>Oficjalny opis</p>",
      product_type: "Portable Power Station",
      vendor: "ALLPOWERS",
      variants: [
        { price: "2199.00", available: false },
        { price: "2119.00", available: true }
      ],
      images: [{ src: "https://cdn.shopify.com/r1500.jpg" }]
    }]
  }, "allpowers_pl", {
    origin: "https://allpowers.com.pl",
    allowedProductTypes: ["Portable Power Station", "Solar Panel"],
    verifiedProducts: [{
      productUrl: stationUrl,
      verifiedAt: "2026-08-27",
      specs: { solarInputW: 650, dcOutputA: 10, pureSine: true }
    }]
  });

  assert.equal(products.length, 1);
  assert.equal(products[0].category, "power_station");
  assert.equal(products[0].priceCzk, 2119);
  assert.equal(products[0].available, true);
  assert.equal(products[0].specs.capacityWh, 1056);
  assert.equal(products[0].specs.solarInputW, 650);
  assert.equal(products[0].specs.dcOutputA, 10);
  assert.equal(products[0].verifiedAt, "2026-08-27");
  const affiliate = new URL(products[0].affiliateUrl);
  assert.equal(affiliate.searchParams.get("ued"), stationUrl);
});

test("Shopify parser recognizes Polish solar panels and ignores bundles and malformed entries", () => {
  const products = parseShopifyProducts({
    products: [
      {
        id: 201,
        handle: "sp033-panel-200w",
        title: "ALLPOWERS SP033 Przenośny Panel Słoneczny 200W",
        body_html: "",
        product_type: "Solar Panel",
        vendor: "ALLPOWERS",
        variants: [{ price: "999.00", available: true }],
        images: []
      },
      {
        id: 202,
        handle: "r1500-panel-kit",
        title: "ALLPOWERS Zestaw R1500 + Panel Słoneczny 200W",
        body_html: "",
        product_type: "Solar Generator",
        variants: [{ price: "2999.00", available: true }]
      },
      {
        id: 203,
        handle: "Unsafe Handle",
        title: "Invalid",
        product_type: "Solar Panel",
        variants: [{ price: "1", available: true }]
      }
    ]
  }, "allpowers_pl", {
    origin: "https://allpowers.com.pl",
    allowedProductTypes: ["Portable Power Station", "Solar Panel"]
  });

  assert.equal(products.length, 1);
  assert.equal(products[0].category, "solar_panel");
  assert.equal(products[0].specs.powerW, 200);
});

test("Shopify parser rejects malformed payloads and insecure origins", () => {
  assert.throws(
    () => parseShopifyProducts({}, "allpowers_pl", { origin: "https://allpowers.com.pl" }),
    /pole products/
  );
  assert.throws(
    () => parseShopifyProducts({ products: [] }, "allpowers_pl", { origin: "http://allpowers.com.pl" }),
    /HTTPS/
  );
});

test("committed Polish catalog offers panels and only a fully verified power station", async () => {
  const catalog = JSON.parse(await readFile("data/products-pl.json", "utf8"));
  const setup = {
    locale: "pl",
    dailyWh: 600,
    autonomyDays: 1,
    solarWatts: 300,
    inverterWatts: 1000,
    applianceRows: [{ watts: 60, quantity: 1, ac: false }],
    systemVoltage: 12,
    batteryAh: 100,
    batteryType: "lifepo4",
    controllerAmps: 30,
    charging: { starterVoltage: 12, dcDc: {}, shore: {} }
  };
  const recommendations = recommendProducts(catalog.products, setup);

  assert.equal(recommendations.solar_panel.length, 3);
  assert.equal(recommendations.power_station.length, 1);
  assert.equal(recommendations.power_station[0].product.id, "allpowers_pl:8562503319707");
  assert.ok(recommendations.solar_panel.every(({ product }) => product.affiliateUrl.includes("awinaffid=3044971")));
});
