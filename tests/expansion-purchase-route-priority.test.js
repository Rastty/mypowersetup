import test from "node:test";
import assert from "node:assert/strict";

import { expansionPurchaseRoutePriority } from "../src/expansion-purchase-route-priority.js";

const setup = Object.freeze({
  locale: "pt",
  inverterWatts: 100,
});

function item(overrides = {}) {
  return { available: true, ...overrides };
}

test("portable route is primary when it is complete and component coverage is incomplete", () => {
  const result = expansionPurchaseRoutePriority({
    battery: [item()],
    solar_panel: [item()],
    controller: [item()],
    inverter: [],
    power_station: [item()],
  }, setup, "pt");

  assert.equal(result.coverage.complete, false);
  assert.deepEqual(result.coverage.missing, ["inverter"]);
  assert.equal(result.portableReady, true);
  assert.equal(result.preferPortable, true);
  assert.deepEqual(result.order, ["portable", "components"]);
});

test("component route stays primary when all required component categories are covered", () => {
  const result = expansionPurchaseRoutePriority({
    battery: [item()],
    solar_panel: [item()],
    controller: [item()],
    inverter: [item()],
    power_station: [item()],
  }, setup, "pt");

  assert.equal(result.coverage.complete, true);
  assert.equal(result.preferPortable, false);
  assert.deepEqual(result.order, ["components", "portable"]);
});

test("missing component coverage never promotes an unavailable portable product", () => {
  const result = expansionPurchaseRoutePriority({
    battery: [item()],
    solar_panel: [item()],
    controller: [item()],
    inverter: [],
    power_station: [item({ available: false })],
  }, setup, "pt");

  assert.equal(result.portableReady, false);
  assert.equal(result.preferPortable, false);
  assert.deepEqual(result.order, ["components", "portable"]);
});
