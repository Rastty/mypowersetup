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


test("expansion markets keep one primary product per category and disclose alternatives", async () => {
  const source = await readFile(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");

  assert.match(source, /groupExpansionProductsForDisclosure/);
  assert.match(source, /class="result-grid expansion-primary-products" data-primary-product-grid/);
  assert.match(source, /<details class="expansion-product-alternatives" data-product-alternatives/);
  assert.match(source, /group\.alternatives\.map\(\(item\) => renderExpansionProduct/);
  assert.match(source, /product_alternatives_opened/);

  for (const label of [
    "Comparar alternativas",
    "Compară alternativele",
    "Primerjaj alternative",
  ]) {
    assert.ok(source.includes(label), `missing localized expansion disclosure label: ${label}`);
  }
});

test("expansion product disclosure has dedicated visual treatment", async () => {
  const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(styles, /\.expansion-product-alternatives \{/);
  assert.match(styles, /\.expansion-product-alternatives summary \{/);
  assert.match(styles, /\.expansion-product-alternatives\[open\] summary/);
});
