import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildHungarianApplicationResult } from "../src/app-hu.js";

test("Hungarian application result keeps package variants available to the browser", () => {
  const output = buildHungarianApplicationResult({
    appliances: [{ id: "fridge", selected: true, hours: 8, quantity: 1 }],
  }, { products: [], sources: {}, generatedAt: null });
  assert.ok(Array.isArray(output.packages));
});

test("Hungarian browser renders package routes before an optional detailed comparison", async () => {
  const source = await readFile(new URL("../src/app-hu-browser.js", import.meta.url), "utf8");
  assert.match(source, /renderHungarianProductPackages\(total \? output\.packages : \[\]\)/);
  assert.match(source, /Három biztonságos vásárlási út/);
  assert.match(source, /<details class="product-comparison-details">/);
  assert.match(source, /Egyedi termékek összehasonlítása/);
  assert.match(source, /data-source="package"/);
});
