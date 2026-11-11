import test from "node:test";
import assert from "node:assert/strict";
import { resolveAmpulSourceStock } from "../src/ampul-source-stock.js";

const NOW = Date.parse("2026-11-07T10:00:00.000Z");
const CANDIDATE = "ampul-eu-dcdc-12v-30a";

function catalog(generatedAt = "2026-11-07T09:00:00.000Z", status = "ok") {
  return {
    generatedAt,
    sources: { ampul_cz: { status } },
    products: [{
      id: "ampul_cz:6195",
      merchant: "ampul_cz",
      category: "dc_charger",
      available: true,
      productUrl: "https://ampul.eu/cs/nabijecky/6195-dc-dc-nabijecka-lifepo4-baterii-146v-30a-400w-ip68",
      specs: {
        voltageV: 12, powerW: 400, currentA: 30,
        chargingVoltagesV: [12],
        chargingInputVoltagesV: [12, 24],
        chargingBatteryTypes: ["lifepo4"],
      },
      priceCzk: 6800,
      priceCurrency: "CZK",
    }],
  };
}

test("a genuinely fresh source and available exact SKU can verify stock", () => {
  const row = resolveAmpulSourceStock(catalog(), CANDIDATE, NOW);
  assert.equal(row.sourceHealthy, true);
  assert.equal(row.state, "available");
  assert.equal(row.stockVerified, true);
  assert.equal(row.available, true);
});

test("a once-healthy feed cannot certify stock after 72 hours", () => {
  const freshEdge = catalog(new Date(NOW - 72 * 60 * 60 * 1000).toISOString());
  assert.equal(resolveAmpulSourceStock(freshEdge, CANDIDATE, NOW).stockVerified, true);
  const stale = catalog(new Date(NOW - 72 * 60 * 60 * 1000 - 1).toISOString());
  const row = resolveAmpulSourceStock(stale, CANDIDATE, NOW);
  assert.equal(row.sourceHealthy, false);
  assert.equal(row.state, "source_stale");
  assert.equal(row.stockVerified, false);
  assert.equal(row.available, true); // preserved raw value, never purchase evidence
});

test("invalid, impossible and future timestamp cannot certify source stock", () => {
  for (const generatedAt of [
    null, "", 123, "2026-02-30T09:00:00Z",
    "2026-11-07", "2026-11-07T09:00:00",
    "2026-11-07T25:00:00Z",
    "2026-11-07T10:00:00.001Z",
    "2026-11-07T09:00:00+01:00",
  ]) {
    const row = resolveAmpulSourceStock(catalog(generatedAt), CANDIDATE, NOW);
    assert.equal(row.sourceHealthy, false, String(generatedAt));
    assert.equal(row.state, "source_stale", String(generatedAt));
    assert.equal(row.stockVerified, false, String(generatedAt));
  }
});

test("the source status gate and product availability still take precedence", () => {
  const unhealthy = resolveAmpulSourceStock(catalog("2026-11-07T09:00:00Z", "stale"), CANDIDATE, NOW);
  assert.equal(unhealthy.state, "source_unhealthy");
  assert.equal(unhealthy.stockVerified, false);

  const absent = catalog();
  absent.products = [];
  assert.equal(resolveAmpulSourceStock(absent, CANDIDATE, NOW).state, "missing");

  const unavailable = catalog();
  unavailable.products[0].available = false;
  assert.equal(resolveAmpulSourceStock(unavailable, CANDIDATE, NOW).state, "unavailable");

  const unknown = catalog();
  unknown.products[0].available = null;
  assert.equal(resolveAmpulSourceStock(unknown, CANDIDATE, NOW).state, "unknown");

  assert.equal(resolveAmpulSourceStock(catalog(), "unrecognized", NOW).state, "unmapped");
});

test("availability alone cannot verify stock if merchant, exact URL or electrical details drift", () => {
  const mutations = [
    (row) => { row.merchant = "unreviewed"; },
    (row) => { row.productUrl = "https://ampul.eu/cs/nabijecky/other-product"; },
    (row) => { row.category = "inverter"; },
    (row) => { row.specs.currentA = 40; },
    (row) => { row.specs.chargingVoltagesV = [24]; },
    (row) => { row.specs.chargingInputVoltagesV = [12]; },
    (row) => { row.specs.chargingBatteryTypes = ["lead_acid"]; },
  ];
  for (const mutate of mutations) {
    const snapshot = catalog();
    mutate(snapshot.products[0]);
    const stock = resolveAmpulSourceStock(snapshot, CANDIDATE, NOW);
    assert.equal(stock.available, true, "raw feed observation retained");
    assert.equal(stock.found, true);
    assert.equal(stock.state, "identity_mismatch");
    assert.equal(stock.stockVerified, false);
  }
});

test("the reviewed exact 24V inverter can verify feed stock, but not a substituted 12V variant", () => {
  const snapshot = catalog();
  snapshot.products = [{
    id: "ampul_cz:5577-7392", merchant: "ampul_cz", category: "inverter",
    productUrl: "https://ampul.eu/cs/menice-napeti/5577-7392-menic-napeti-z-dc-na-230v-ac-50hz-2000w",
    available: true, specs: { voltageV: 24, powerW: 2000, pureSine: true },
  }];
  const candidate = "ampul-eu-inverter-24v-2000w";
  assert.equal(resolveAmpulSourceStock(snapshot, candidate, NOW).stockVerified, true);
  snapshot.products[0].specs.voltageV = 12;
  const wrongVariant = resolveAmpulSourceStock(snapshot, candidate, NOW);
  assert.equal(wrongVariant.state, "identity_mismatch");
  assert.equal(wrongVariant.stockVerified, false);
  snapshot.products[0].specs.voltageV = 24;
  snapshot.products[0].available = null;
  const unknownStock = resolveAmpulSourceStock(snapshot, candidate, NOW);
  assert.equal(unknownStock.state, "unknown");
  assert.equal(unknownStock.stockVerified, false);
});
