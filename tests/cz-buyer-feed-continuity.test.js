import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertCzBuyerFeedContinuity } from "../src/cz-buyer-feed-continuity.js";

const previous = JSON.parse(await readFile(new URL("../data/products.json", import.meta.url), "utf8"));
const byCategory = category => previous.products.filter(p => p.merchant === "solarimport" && p.category === category);
const next = products => ({ ...previous, generatedAt: "2026-11-17T08:00:00.000Z", products });

test("rejects a seemingly healthy partial merchant feed that drops all CZ inverters", () => {
  const data = next(previous.products.filter(p => p.merchant !== "solarimport" || p.category !== "inverter"));
  assert.equal(data.sources.solarimport.status, "ok");
  assert.throws(() => assertCzBuyerFeedContinuity(previous, data), /CZ_SOLARIMPORT_INVERTER_BUYER_PATH_LOST/);
});

test("rejects loss of all reviewed CZ solar panels independently of inverter stock", () => {
  const data = next(previous.products.filter(p => p.merchant !== "solarimport" || p.category !== "solar_panel"));
  assert.throws(() => assertCzBuyerFeedContinuity(previous, data), /CZ_SOLARIMPORT_SOLAR_BUYER_PATH_LOST/);
});

test("accepts unchanged buyer paths and unrelated category churn", () => {
  assert.doesNotThrow(() => assertCzBuyerFeedContinuity(previous, next(previous.products)));
  const data = next(previous.products.filter(p => p.merchant !== "solarimport" || ["inverter", "solar_panel"].includes(p.category)));
  assert.doesNotThrow(() => assertCzBuyerFeedContinuity(previous, data));
});

test("does not mistake a stale source or missing reviewed SKU for fresh supply", () => {
  assert.ok(byCategory("inverter").length > 0);
  assert.ok(byCategory("solar_panel").length > 0);
  const stale = { ...next(previous.products), sources: { ...previous.sources, solarimport: { status: "stale" } } };
  assert.throws(() => assertCzBuyerFeedContinuity(previous, stale), /BUYER_PATH_LOST/);
  // An empty first-run baseline has nothing proven to protect.
  assert.doesNotThrow(() => assertCzBuyerFeedContinuity({ generatedAt: null, products: [] }, stale));
});
