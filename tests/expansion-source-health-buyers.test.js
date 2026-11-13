import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hasExpansionSourceGaps, buildExpansionComponentRecommendations } from "../src/expansion-component-recommendations.js";
import { buildPortugalRecommendations } from "../src/pt-recommendations.js";
import { buildRomaniaRecommendations } from "../src/ro-recommendations.js";
import { buildSloveniaRecommendations } from "../src/si-recommendations.js";

const setup = {
  locale: "pt", dailyWh: 540, autonomyDays: 2, solarWatts: 200,
  systemVoltage: 12, inverterWatts: 0, batteryAh: 100,
  batteryType: "lifepo4", controllerAmps: 20,
  applianceRows: [{ ac: false, watts: 45, quantity: 1 }],
  charging: { starterVoltage: 12, dcDc: { suggestedCurrentAmps: null },
    shore: { suggestedCurrentAmps: null } },
};

test("source health flags a mixed catalog with stale or failed merchant rows, not blocked zero-product sources", () => {
  const product = { id: "source:1", merchant: "first", category: "inverter", available: true };
  const other = { id: "source:2", merchant: "second", category: "battery", available: true };
  assert.equal(hasExpansionSourceGaps({
    sources: { first: { status: "ok" }, second: { status: "ok" }, pending: { status: "blocked" } },
    products: [product, other],
  }), false);
  assert.equal(hasExpansionSourceGaps({
    sources: { first: { status: "timeout" }, second: { status: "ok" } }, products: [product, other],
  }), true);
  assert.equal(hasExpansionSourceGaps({
    sources: { first: { status: "ok" } }, products: [{ ...product, staleSource: true }],
  }), true);
  assert.equal(hasExpansionSourceGaps({ products: [product] }), false,
    "older valid catalogs without source metadata remain backward compatible");
  assert.throws(() => hasExpansionSourceGaps({}), /EXPANSION_SOURCE_CATALOG_REQUIRED/);
});

test("component buyer matches from a failed merchant must disappear without hiding another healthy merchant", () => {
  const product = {
    id: "powerqueen_eu:inverter", merchant: "powerqueen_eu",
    name: "Power Queen 2000W pure sine inverter 12V to 230V",
    category: "inverter", categoryPath: "Inverters",
    description: "2000 W pure sine wave", available: true,
    priceCzk: 220, priceCurrency: "EUR",
    specs: { voltageV: 12, powerW: 2000, pureSine: true },
    verifiedAt: "2026-08-29",
    productUrl: "https://www.ipowerqueen.de/en/products/power-queen-2000w-inverter-12v-dc-to-230v-ac-converter",
  };
  const matching = { ...setup, inverterWatts: 1000 };
  const other = { ...product, id: "other:inverter", merchant: "other", name: "Other brand 2000W pure sine inverter 12V", productUrl: "https://shop.example/12v-pure-sine-2000w" };
  const fresh = buildExpansionComponentRecommendations([product, other], matching, 3,
    { powerqueen_eu: { status: "ok" }, other: { status: "ok" } });
  assert.equal(fresh.inverter.length, 2);
  const degraded = buildExpansionComponentRecommendations([product, other], matching, 3,
    { powerqueen_eu: { status: "timeout" }, other: { status: "ok" } });
  assert.deepEqual(degraded.inverter.map(x => x.merchant), ["other"]);
});

test("real PT/RO/SI catalog: a failed ALLPOWERS feed is excluded from buyers while healthy Power Queen offers survive", async () => {
  const fixtures = [
    { market: "pt", path: "products-pt.json", merchant: "allpowers_pt", build: buildPortugalRecommendations },
    { market: "ro", path: "products-ro.json", merchant: "allpowers_eu", build: buildRomaniaRecommendations },
    { market: "si", path: "products-si.json", merchant: "allpowers_eu", build: buildSloveniaRecommendations },
  ];
  for (const { market, path, merchant, build } of fixtures) {
    const catalog = JSON.parse(await readFile(new URL("../data/" + path, import.meta.url), "utf8"));
    const current = build(catalog, { ...setup, locale: market }, 3);
    assert.ok(current.solar_panel.some(item => item.merchant === merchant),
      market + " requires an existing live ALLPOWERS solar offer to verify this regression");
    assert.ok(current.battery.some(item => item.merchant === "powerqueen_eu"),
      market + " must retain a healthy source for the partial-outage test");
    const degraded = {
      ...catalog,
      sources: { ...catalog.sources, [merchant]: { ...catalog.sources[merchant], status: "failed" } },
    };
    assert.equal(hasExpansionSourceGaps(degraded), true, market);
    const filtered = build(degraded, { ...setup, locale: market }, 3);
    for (const category of ["solar_panel", "power_station", "battery", "controller", "inverter"]) {
      assert.equal(filtered[category].some(item => item.merchant === merchant), false,
        market + " leaked a failed-source product in " + category);
    }
    assert.ok(filtered.battery.some(item => item.merchant === "powerqueen_eu"),
      market + " suppressed valid offers from an unrelated healthy merchant");
    assert.equal(hasExpansionSourceGaps(catalog), false,
      market + " healthy catalog must retain usable verified supply evidence");
  }
});

test("RO/SI OXE feed failures never contaminate healthy ALLPOWERS power station results", async () => {
  for (const market of ["ro", "si"]) {
    const path = "../data/products-" + market + ".json";
    const catalog = JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
    const build = market === "ro" ? buildRomaniaRecommendations : buildSloveniaRecommendations;
    const degraded = {
      ...catalog,
      sources: { ...catalog.sources, ["oxe_" + market]: { ...catalog.sources["oxe_" + market], status: "failed" } },
    };
    const valid = build(degraded, { ...setup, locale: market }, 3);
    assert.ok(valid.power_station.every(item => item.merchant !== "oxe_" + market));
    assert.equal(hasExpansionSourceGaps(degraded), true);
  }
});

test("browser reports partial source outages as unavailable, not confirmed marketwide inverter gaps", async () => {
  const browser = await readFile(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");
  assert.equal((browser.match(/const sourceGap = hasExpansionSourceGaps\(catalog\);/g) || []).length, 3);
  assert.equal((browser.match(/const routePriority = trackProductCoverage\(recommendations, calculation, sourceGap, recordIntent\)/g) || []).length, 3);
  assert.match(browser, /if \(sourceGap\) \{ trackCatalogUnavailable\(\); return priority; \}/);
  assert.match(browser, /data-recommendation-partial-source/);
  for (const text of [
    "Algumas fontes de produtos estão temporariamente indisponíveis",
    "Unele surse de produse nu sunt disponibile momentan",
    "Nekateri viri izdelkov trenutno niso na voljo",
  ]) assert.ok(browser.includes(text), text);
});
