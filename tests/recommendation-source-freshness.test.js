import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hasCurrentRecommendationSource, recommendProducts } from "../src/products.js";
import { buildProductPackages } from "../src/packages.js";
import { assessRecommendationCoverage } from "../src/recommendation-coverage.js";

const setup = {
  locale: "cs",
  systemVoltage: 12,
  batteryAh: 100,
  batteryType: "lifepo4",
  solarWatts: 200,
  controllerAmps: 20,
  inverterWatts: 0,
  charging: { dcDc: { enabled: false }, shore: { enabled: false } },
};

function product(merchant, category, name, specs) {
  return {
    id: merchant + ":" + category,
    merchant,
    name,
    category,
    categoryPath: "Ostatní",
    description: "",
    available: true,
    verifiedAt: "2026-11-07",
    specs,
    priceCzk: 1200,
    priceCurrency: "CZK",
    productUrl: "https://shop.example/" + merchant + "/" + category,
    affiliateUrl: "https://affiliate.example/click/" + merchant + "/" + category,
  };
}
const products = [
  product("reslshop", "battery", "LiFePO4 baterie 12 V 200 Ah", { voltageV: 12, capacityAh: 200, batteryType: "lifepo4" }),
  product("solarimport", "solar_panel", "Solární panel 200 W", { powerW: 200 }),
  product("ampul_cz", "controller", "MPPT regulátor 30 A", { currentA: 30 }),
];

test("fresh source metadata allows complete, technically compatible shopping package", () => {
  const sources = {
    reslshop: { status: "ok" },
    solarimport: { status: "ok" },
    ampul_cz: { status: "ok" },
  };
  const matched = recommendProducts(products, setup, 24, sources);
  assert.equal(matched.battery.length, 1);
  assert.equal(matched.solar_panel.length, 1);
  assert.equal(matched.controller.length, 1);
  assert.equal(assessRecommendationCoverage(matched, setup).complete, true);
  assert.equal(buildProductPackages(matched, setup)[0]?.id, "recommended");
});

test("stale controller feed cannot complete a purchase-ready basket", () => {
  const sources = {
    reslshop: { status: "ok" },
    solarimport: { status: "ok" },
    ampul_cz: { status: "stale" },
  };
  const matched = recommendProducts(products, setup, 24, sources);
  assert.equal(matched.battery.length, 1);
  assert.equal(matched.solar_panel.length, 1);
  assert.equal(matched.controller.length, 0);
  assert.equal(assessRecommendationCoverage(matched, setup).complete, false);
  assert.deepEqual(assessRecommendationCoverage(matched, setup).missing, ["controller"]);
  assert.deepEqual(buildProductPackages(matched, setup), []);
});

test("source status gates failed and disabled feeds while preserving healthy independent merchants", () => {
  for (const status of ["stale", "error", "disabled", "failed", "unknown"]) {
    const sources = { reslshop: { status }, solarimport: { status: "ok" }, ampul_cz: { status: "ok" } };
    const matched = recommendProducts(products, setup, 24, sources);
    assert.equal(matched.battery.length, 0, status);
    assert.equal(matched.solar_panel.length, 1, status);
    assert.equal(matched.controller.length, 1, status);
  }
});

test("explicitly stale individual item cannot become eligible even if merchant status is OK", () => {
  const sources = {
    reslshop: { status: "ok" },
    solarimport: { status: "ok" },
    ampul_cz: { status: "ok" },
  };
  const staleProducts = products.map((item, index) => index === 0 ? { ...item, staleSource: true } : item);
  const matched = recommendProducts(staleProducts, setup, 24, sources);
  assert.equal(matched.battery.length, 0);
  assert.equal(hasCurrentRecommendationSource(staleProducts[0], sources), false);
  assert.equal(buildProductPackages(matched, setup).length, 0);
});

test("source gating preserves legacy curated items when merchant source metadata is absent", () => {
  assert.equal(hasCurrentRecommendationSource(products[0]), true);
  assert.equal(hasCurrentRecommendationSource(products[0], {}), true);
  assert.equal(hasCurrentRecommendationSource(null, {}), false);
  assert.equal(recommendProducts(products, setup).battery.length, 1);
});

test("all four production builders pass source health to the shared recommendation engine", async () => {
  for (const path of ["src/app.js", "src/app-sk.js", "src/app-pl.js"]) {
    const script = await readFile(new URL("../" + path, import.meta.url), "utf8");
    assert.ok(script.includes("recommendProducts(productCatalog, result, 24, productCatalogSources)"), path);
  }
  const hu = await readFile(new URL("../src/app-hu.js", import.meta.url), "utf8");
  assert.ok(hu.includes("recommendProducts(catalog.products || [], result, 24, catalog.sources)"));
});
