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
      available: true,
      productUrl: "https://ampul.eu/cs/nabijecky/6195",
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
