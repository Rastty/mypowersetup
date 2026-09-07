import test from "node:test";
import assert from "node:assert/strict";

import { groupExpansionProductsForDisclosure } from "../src/expansion-product-disclosure.js";

test("groups expansion products by category and keeps only the first item primary", () => {
  const products = [
    { id: "b1", category: "battery" },
    { id: "b2", category: "battery" },
    { id: "c1", category: "controller" },
    { id: "b3", category: "battery" },
    { id: "c2", category: "controller" },
  ];

  const groups = groupExpansionProductsForDisclosure(products);
  assert.deepEqual(groups.map((group) => group.category), ["battery", "controller"]);
  assert.equal(groups[0].primary.id, "b1");
  assert.deepEqual(groups[0].alternatives.map((item) => item.id), ["b2", "b3"]);
  assert.equal(groups[1].primary.id, "c1");
  assert.deepEqual(groups[1].alternatives.map((item) => item.id), ["c2"]);
});

test("single-item categories stay visible without an alternatives bucket", () => {
  const groups = groupExpansionProductsForDisclosure([
    { id: "solar", category: "solar_panel" },
    { id: "portable", category: "power_station" },
  ]);

  assert.equal(groups.length, 2);
  assert.ok(groups.every((group) => group.primary));
  assert.ok(groups.every((group) => group.alternatives.length === 0));
});

test("invalid entries do not create disclosure groups", () => {
  const groups = groupExpansionProductsForDisclosure([
    null,
    { id: "missing-category" },
    { id: "good", category: "inverter" },
  ]);
  assert.deepEqual(groups.map((group) => group.primary.id), ["good"]);
});
