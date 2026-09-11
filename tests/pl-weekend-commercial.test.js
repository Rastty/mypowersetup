import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { APPLIANCES } from "../src/catalog-pl.js";
import { calculateSetup } from "../src/engine.js";
import { recommendProducts } from "../src/products.js";
import { decodeSetupQuery } from "../src/setup-url.js";

const PAGE = new URL("../pl/poradnik/zasilanie-kampera-na-weekend/index.html", import.meta.url);
const CATALOG = new URL("../data/products-pl.json", import.meta.url);

function extractPresetHref(html) {
  const match = html.match(/href="(\/pl\/\?loads=[^"]+#kalkulator)"/);
  assert.ok(match, "PL weekend scenario must expose a prefilled calculator CTA");
  return match[1].replaceAll("&amp;", "&");
}

function buildSetupFromPreset(href) {
  const parsed = new URL(href, "https://mypowersetup.com");
  const config = decodeSetupQuery(parsed.search, APPLIANCES.map((item) => item.id));
  assert.ok(config, "PL weekend preset must decode before commercial assessment");
  const selected = new Map(config.appliances.map((item) => [item.id, item]));
  const appliances = APPLIANCES.map((item) => {
    const saved = selected.get(item.id);
    return {
      ...item,
      selected: Boolean(saved),
      hours: saved?.hours ?? item.hours,
      quantity: saved?.quantity ?? item.quantity,
    };
  });
  return calculateSetup({
    locale: "pl",
    appliances,
    autonomyDays: config.autonomyDays,
    season: config.season,
    batteryType: config.batteryType,
    systemVoltage: config.systemVoltage,
  });
}

test("PL weekend money page keeps a real buyable battery path", async () => {
  const [html, catalog] = await Promise.all([
    readFile(PAGE, "utf8"),
    readFile(CATALOG, "utf8").then(JSON.parse),
  ]);
  const setup = buildSetupFromPreset(extractPresetHref(html));

  assert.equal(setup.dailyWh, 550);
  assert.equal(setup.autonomyDays, 2);
  assert.equal(setup.batteryType, "lifepo4");
  assert.equal(setup.systemVoltage, 12);
  assert.equal(setup.batteryAh, 140, "production rounding for the weekend preset changed");

  const batteryCatalog = catalog.products.filter((product) => product.category === "battery");
  const recommendations = recommendProducts(batteryCatalog, setup).battery;
  assert.ok(recommendations.length > 0, "PL weekend preset must keep at least one technically fitting battery recommendation");

  const nearest = recommendations[0].product;
  assert.ok(nearest.specs.capacityAh >= setup.batteryAh, "recommended battery must meet calculated Ah demand");
  assert.ok(nearest.specs.capacityAh <= 200, "top recommendation should not be impractically oversized for the weekend preset");
  assert.equal(nearest.specs.batteryType, "lifepo4");
  assert.equal(nearest.specs.voltageV, setup.systemVoltage);
  assert.match(nearest.affiliateUrl, /^https:\/\//, "recommended battery must have a usable affiliate URL");
});
