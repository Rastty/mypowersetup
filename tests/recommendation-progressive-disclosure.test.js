import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const markets = [
  ["../src/app.js", "Porovnat jednotlivé produkty"],
  ["../src/app-sk.js", "Porovnať jednotlivé produkty"],
  ["../src/app-pl.js", "Porównaj pojedyncze produkty"],
];

for (const [path, summary] of markets) {
  test(`${path} keeps three purchase routes primary and puts the long catalog behind disclosure`, async () => {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, /renderProductPackages\(buildProductPackages\(rankedRecommendations, result\)\)/);
    assert.match(source, /<details class="product-comparison-details">/);
    assert.match(source, new RegExp(summary));
    assert.match(source, /<div class="product-comparison-groups">\$\{productGroups\}<\/div>/);
  });
}
