import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { recommendProducts } from "../src/products.js";
import {
  advertisedBatteryBmsAmps,
  batteryBmsLoadWithinAdvertisedLimit,
  expansionBatteryDischargeNotice,
  minimumBatteryDischargeAmps,
} from "../src/battery-discharge-safety.js";

const setup = Object.freeze({
  locale: "pt", systemVoltage: 12, batteryAh: 180,
  batteryType: "lifepo4", inverterWatts: 1300,
  solarWatts: 400, controllerAmps: 40,
});

function battery(id, bms, extra = {}) {
  return {
    id, merchant: "powerqueen_eu", category: "battery", available: true,
    verifiedAt: "2026-11-17",
    name: `Power Queen 12V 200Ah LiFePO4 battery${bms ? `, built-in ${bms}A BMS` : ""}`,
    specs: { voltageV: 12, capacityAh: 200, batteryType: "lifepo4", ...extra },
    priceCzk: 200, priceCurrency: "EUR",
    productUrl: `https://www.ipowerqueen.de/en/products/${id}`,
  };
}

test("minimum continuous battery discharge estimate is conservative and handles no inverter", () => {
  assert.equal(minimumBatteryDischargeAmps(setup), 128);
  assert.equal(minimumBatteryDischargeAmps({ ...setup, systemVoltage: 24 }), 64);
  assert.equal(minimumBatteryDischargeAmps({ ...setup, inverterWatts: 0 }), null);
  assert.equal(minimumBatteryDischargeAmps({ ...setup, systemVoltage: null }), null);
  assert.equal(minimumBatteryDischargeAmps({ ...setup, inverterWatts: Infinity }), null);
});

test("only explicit battery BMS rating, never generic currentA, limits inverter recommendation", () => {
  const undersized = battery("undersized", 100, { currentA: 1000 });
  const adequate = battery("adequate", 200, { currentA: 7 });
  const unconfirmed = battery("unconfirmed", null, { currentA: 2000 });

  assert.equal(advertisedBatteryBmsAmps(undersized), 100);
  assert.equal(advertisedBatteryBmsAmps(adequate), 200);
  assert.equal(advertisedBatteryBmsAmps(unconfirmed), null);
  assert.equal(advertisedBatteryBmsAmps({ ...undersized, category: "controller" }), null);
  assert.equal(batteryBmsLoadWithinAdvertisedLimit(undersized, setup), false);
  assert.equal(batteryBmsLoadWithinAdvertisedLimit(adequate, setup), true);
  assert.equal(batteryBmsLoadWithinAdvertisedLimit(unconfirmed, setup), true);

  const recommendations = recommendProducts([undersized, adequate, unconfirmed], setup, 10);
  assert.deepEqual(recommendations.battery.map(({ product }) => product.id).sort(), ["adequate", "unconfirmed"]);
  assert.deepEqual(recommendProducts([undersized], { ...setup, inverterWatts: 0 }).battery.map(({ product }) => product.id), ["undersized"]);
});

test("all PT RO SI battery component paths disclose estimated BMS current and link a real guide", async () => {
  const paths = {
    pt: "/pt/guias/capacidade-bateria-autocaravana/",
    ro: "/ro/ghiduri/capacitate-baterie-autorulota/",
    si: "/si/vodici/kapaciteta-baterije-avtodom/",
  };
  for (const [market, href] of Object.entries(paths)) {
    const notice = expansionBatteryDischargeNotice(market, [{ category: "battery" }], setup);
    assert.equal(notice.requiredAmps, 128);
    assert.equal(notice.href, href);
    assert.match(notice.message, /128 A/);
    assert.match(notice.message, /1300 W/);
    assert.match(notice.message, /BMS/);
    const html = await readFile(new URL(`..${href}index.html`, import.meta.url), "utf8");
    assert.match(html, /<link rel="canonical"/);
    assert.equal(expansionBatteryDischargeNotice(market, [{ category: "solar_panel" }], setup), null);
    assert.equal(expansionBatteryDischargeNotice(market, [{ category: "battery" }], { ...setup, inverterWatts: 0 }), null);
  }
  assert.throws(() => expansionBatteryDischargeNotice("cs", [], setup), /MARKET_INVALID/);
});

test("BMS notice stays in component route; deployed modules are cache-busted together", async () => {
  const browser = await readFile(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");
  assert.match(browser, /renderBatteryDischargeNotice\(components, calculation\)/);
  assert.match(browser, /data-battery-discharge-notice/);
  assert.match(browser, /data-battery-discharge-guide/);
  for (const market of ["pt", "ro", "si"]) {
    const html = await readFile(new URL(`../${market}/index.html`, import.meta.url), "utf8");
    const recommendations = await readFile(new URL(`../src/${market}-recommendations.js`, import.meta.url), "utf8");
    assert.match(html, /expansion-calculator-browser\.js\?v=20261118-expansion-labels2/);
    assert.match(browser, new RegExp(`${market}-recommendations\\.js\\?v=20261117-pq-region1`));
    assert.match(recommendations, /expansion-component-recommendations\.js\?v=20261117-pq-region1/);
  }
  const component = await readFile(new URL("../src/expansion-component-recommendations.js", import.meta.url), "utf8");
  assert.match(component, /products\.js\?v=20261117-pq-region1/);
});
