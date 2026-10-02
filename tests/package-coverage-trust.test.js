import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const applications = [
  ["app.js", "Pokrytí výpočtu:"],
  ["app-sk.js", "Pokrytie výpočtu:"],
  ["app-pl.js", "Pokrycie obliczenia:"],
  ["app-hu-browser.js", "Számítási lefedettség:"],
];

test("mature package cards show real calculation-category coverage", async () => {
  for (const [application, label] of applications) {
    const source = await readFile(new URL(`../src/${application}`, import.meta.url), "utf8");
    assert.ok(source.includes(label), application);
    assert.ok(source.includes("${variant.items.length}/${variant.requiredCategoryCount}"), application);
    assert.match(source, /class="package-coverage"/, application);
  }
});

test("package engine carries the real required-category denominator", async () => {
  const source = await readFile(new URL("../src/packages.js", import.meta.url), "utf8");
  assert.match(source, /requiredCategoryCount: categories\.length/);
  assert.match(source, /categories\.some\(\(category\) => eligibleCandidates\(recommendations, category\)\.length === 0\)/);
});

test("coverage badge has a stronger treatment on the recommended package", async () => {
  const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(styles, /\.package-coverage \{/);
  assert.match(styles, /\.package-card\.is-recommended \.package-coverage/);
});
