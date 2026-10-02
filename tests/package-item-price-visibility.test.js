import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const applications = [
  ["app.js", "formatPrice(unitPrice * quantity, product.priceCurrency)", " celkem"],
  ["app-sk.js", "formatPrice(unitPrice * quantity, product.priceCurrency)", " spolu"],
  ["app-pl.js", "formatPrice(unitPrice * quantity, product.priceCurrency)", " łącznie"],
  ["app-hu-browser.js", "formatHungarianPrice(unitPrice * quantity, product.priceCurrency)", " összesen"],
];

test("package rows expose quantity-aware item prices in every mature market", async () => {
  for (const [application, formatter, totalLabel] of applications) {
    const source = await readFile(new URL(`../src/${application}`, import.meta.url), "utf8");
    assert.ok(source.includes('product.priceCzk !== null && product.priceCzk !== undefined && product.priceCzk !== ""'), application);
    assert.ok(source.includes("const unitPrice = hasFeedPrice ? Number(product.priceCzk) : NaN"), application);
    assert.ok(source.includes("Number.isFinite(unitPrice) && unitPrice >= 0"), application);
    assert.ok(source.includes(formatter), application);
    assert.ok(source.includes(totalLabel), `${application}: missing localized multi-item subtotal label`);
    assert.match(source, /class="package-product-meta"/, application);
  }
});

test("package item prices remain fail-closed when a product price is unavailable", async () => {
  for (const [application] of applications) {
    const source = await readFile(new URL(`../src/${application}`, import.meta.url), "utf8");
    assert.match(source, /const hasFeedPrice = product\.priceCzk !== null && product\.priceCzk !== undefined && product\.priceCzk !== ""/, application);
    assert.match(source, /Number\.isFinite\(unitPrice\) && unitPrice >= 0 \? [^:]+ : ""/, application);
  }
});
