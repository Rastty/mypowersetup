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
  assert.throws(
    () => parseShopifyProducts({ products: [] }, "powerqueen_eu", { origin: "https://www.ipowerqueen.de", productPathPrefix: "//evil.test/products/" }),
    /productPathPrefix/
  );
});

test("committed Polish catalog offers panels and only fully verified power stations", async () => {
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
  assert.equal(recommendations.power_station.length, 2);
  assert.deepEqual(
    new Set(recommendations.power_station.map(({ product }) => product.id)),
    new Set(["allpowers_pl:8562503319707", "allpowers_pl:8428259246235"])
  );
  assert.ok(recommendations.solar_panel.every(({ product }) => product.affiliateUrl.includes("awinaffid=3044971")));

  const compactRecommendations = recommendProducts(catalog.products, {
    ...setup,
    dailyWh: 120,
    solarWatts: 100,
    inverterWatts: 300
  });
  assert.ok(
    compactRecommendations.power_station.some(({ product }) => product.id === "allpowers_pl:8428244172955")
  );
});

test("committed SK and HU catalogs share only verified EU panels and power stations", async () => {
  for (const path of ["data/products-sk.json", "data/products-hu.json"]) {
    const catalog = JSON.parse(await readFile(path, "utf8"));
    const eu = catalog.products.filter(({ merchant }) => merchant === "allpowers_eu");
    assert.equal(eu.filter(({ category }) => category === "solar_panel").length, 22);
    assert.equal(eu.filter(({ category }) => category === "power_station").length, 3);
    assert.ok(eu.every(({ affiliateUrl }) => affiliateUrl.includes("awinmid=38934") && affiliateUrl.includes("awinaffid=3044971")));
    assert.ok(eu.filter(({ category }) => category === "power_station").every(({ verifiedAt, specs }) =>
      verifiedAt && specs.capacityWh && specs.powerW && specs.pureSine === true && specs.solarInputW && specs.dcOutputA
    ));
  }
});

test("committed European catalogs contain eligible Power Queen batteries and one verified MPPT", async () => {
  for (const path of ["data/products-sk.json", "data/products-pl.json", "data/products-hu.json"]) {
    const catalog = JSON.parse(await readFile(path, "utf8"));
    const powerQueen = catalog.products.filter(({ merchant }) => merchant === "powerqueen_eu");
    const batteries = powerQueen.filter(({ category }) => category === "battery");
    const controllers = powerQueen.filter(({ category }) => category === "controller");
    assert.equal(batteries.length, 16);
    assert.ok(batteries.every(({ category, priceCurrency, specs, affiliateUrl, name }) =>
      category === "battery"
      && priceCurrency === "EUR"
      && [12, 24].includes(specs.voltageV)
      && specs.capacityAh >= 50
      && specs.batteryType === "lifepo4"
      && affiliateUrl.includes("awinmid=97025")
      && affiliateUrl.includes("awinaffid=3044971")
      && !/(?:0%\s*vat|tax[- ]?(?:free|exemption)|【ua】|trolling motor|electric motor)/i.test(name)
    ));
    assert.equal(controllers.length, 1);
    assert.ok(controllers.every(({ priceCurrency, specs, affiliateUrl, productUrl, name }) =>
      priceCurrency === "EUR"
      && specs.currentA === 30
      && affiliateUrl.includes("awinmid=97025")
      && affiliateUrl.includes("awinaffid=3044971")
      && productUrl.includes("/en/products/")
      && !/0%\s*vat/i.test(name)
    ));
  }
});
