import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const markets = [
  ["../src/app.js", "Porovnat jednotlivé produkty", "Začněte doporučenou variantou"],
  ["../src/app-sk.js", "Porovnať jednotlivé produkty", "Začnite odporúčanou variantou"],
  ["../src/app-pl.js", "Porównaj pojedyncze produkty", "Zacznij od wariantu polecanego"],
];

for (const [path, summary, recommendedIntro] of markets) {
  test(`${path} keeps three purchase routes primary and puts the long catalog behind disclosure`, async () => {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, /const packages = buildProductPackages\(rankedRecommendations, result\)/);
    assert.match(source, /renderProductPackages\(packages\)/);
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


test("Hungarian package UX makes the recommended route the starting point", async () => {
  const source = await readFile(new URL("../src/app-hu-browser.js", import.meta.url), "utf8");
  assert.ok(source.includes("Kezdd az ajánlott változattal"));
});


test("CZ purchase journey shows one immediately actionable recommended basket, not three long lists", async () => {
  const [app, styles, html] = await Promise.all([
    readFile(new URL("../src/app.js", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
  ]);
  assert.match(app, /const isRecommended = variant\.id === "recommended"/);
  assert.match(app, /class="package-purchase-steps" data-package-disclosure=/);
  assert.match(app, /data-item-count="\$\{variant\.items\.length\}"/);
  assert.match(app, /data-price-known="\$\{pricesKnown\}"/);
  assert.match(app, /isRecommended \? "open" : ""/);
  assert.match(app, /<summary>Nákupní seznam/);
  assert.match(app, /<ul>\$\{variant\.items\.map\(\(\{ category, product \}\) => packageProductLink\(category, product, variant\.id\)\)/);
  assert.match(app, /nejde o společný nákupní košík/);
  assert.match(app, /trackEvent\("package_variants_rendered"/);
  assert.match(app, /trackEvent\("package_variant_opened"/);
  assert.match(app, /trackEvent\("product_comparison_opened"/);
  assert.match(app, /if \(!details \|\| details\.open\) return/);
  assert.match(app, /data-affiliate-click data-source="package"/);
  assert.match(app, /data-affiliate-click data-source="product-card"/);
  assert.match(styles, /\.package-purchase-steps > summary:focus-visible/);
  assert.match(styles, /\.package-purchase-steps\[open\]/);
  assert.match(html, /app\.js\?v=20261014-purchase-steps1/);
  assert.match(html, /styles\.css\?v=20261023-comparison-handoff1/);
});
