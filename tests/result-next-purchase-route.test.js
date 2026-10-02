import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const applications = [
  ["app.js", "Zobrazit doporučenou sestavu ↓"],
  ["app-sk.js", "Zobraziť odporúčanú zostavu ↓"],
  ["app-pl.js", "Pokaż polecany zestaw ↓"],
  ["app-hu-browser.js", "Ajánlott összeállítás megjelenítése ↓"],
];

test("mature calculators surface a complete recommended package in the result-next CTA", async () => {
  for (const [application, label] of applications) {
    const source = await readFile(new URL(`../src/${application}`, import.meta.url), "utf8");
    assert.ok(source.includes('result_next_variant: event.currentTarget?.dataset?.resultNextVariant || "product_matches"'), application);
    assert.ok(source.includes('"complete_package"'), application);
    assert.ok(source.includes(label), `${application}: missing localized complete-package CTA`);
    assert.ok(source.includes("product_recommendations_opened"), application);
  }
});

test("CZ SK and PL derive the result-next route from the same package engine used for rendering", async () => {
  for (const application of ["app.js", "app-sk.js", "app-pl.js"]) {
    const source = await readFile(new URL(`../src/${application}`, import.meta.url), "utf8");
    assert.match(source, /const packages = buildProductPackages\(rankedRecommendations, result\)/, application);
    assert.match(source, /const hasRecommendedPackage = packages\.some\(\(\{ id \}\) => id === "recommended"\)/, application);
    assert.match(source, /renderProductPackages\(packages\)/, application);
  }
});

test("Hungarian result-next route uses the already validated application packages", async () => {
  const source = await readFile(new URL("../src/app-hu-browser.js", import.meta.url), "utf8");
  assert.match(source, /output\.packages\?\.some\(\(\{ id \}\) => id === "recommended"\)/);
  assert.match(source, /renderHungarianProductPackages\(total \? output\.packages : \[\]\)/);
});
