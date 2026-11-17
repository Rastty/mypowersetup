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

test("all four mature markets display currency-grouped and explicitly incomplete basket prices", async () => {
  const labels = [
    ["app.js", "Ceny po měnách", "Jen známé ceny"],
    ["app-sk.js", "Ceny podľa meny", "Len známe ceny"],
    ["app-pl.js", "Ceny według waluty", "Tylko znane ceny"],
    ["app-hu-browser.js", "Árak pénznemenként", "Csak az ismert árak"],
  ];
  for (const [file, grouped, partial] of labels) {
    const source = await readFile(new URL(`../src/${file}`, import.meta.url), "utf8");
    assert.ok(source.includes(grouped), file);
    assert.ok(source.includes(partial), file);
    assert.match(source, /variant\.priceSubtotals/, file);
    assert.match(source, /variant\.unpricedItemCount/, file);
    assert.match(source, /join\(" \+ "\)/, file);
  }
});
