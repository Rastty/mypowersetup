import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { selectExpansionFeaturedOffers } from "../src/expansion-featured-offers.js";

const item = (category, id, more = {}) => ({ category, id, available: true, ...more });
const products = [
  item("battery", "battery-primary"), item("battery", "battery-alternative"),
  item("solar_panel", "solar-primary"), item("controller", "mppt-primary"),
  item("inverter", "inverter-primary"), item("power_station", "portable-primary"),
];
const coverage = (complete, required = ["battery", "solar_panel", "controller", "inverter"]) => ({ complete, required });

test("complete component route promotes only first compatible product in each required category", () => {
  const featured = selectExpansionFeaturedOffers(products, { coverage: coverage(true), preferPortable: false });
  assert.equal(featured.kind, "components");
  assert.deepEqual(featured.items.map(({ id }) => id), ["battery-primary", "solar-primary", "mppt-primary"]);
  assert.equal(featured.remainingCount, 1, "fourth required item remains clearly below the preview");
});

test("portable solution appears alone when components are incomplete and a portable fully fits", () => {
  const featured = selectExpansionFeaturedOffers(products, { coverage: coverage(false), portableReady: true, preferPortable: true });
  assert.equal(featured.kind, "portable");
  assert.deepEqual(featured.items.map(({ id }) => id), ["portable-primary"]);
});

test("no complete route or stale product may masquerade as a purchase-ready recommendation", () => {
  assert.equal(selectExpansionFeaturedOffers(products, { coverage: coverage(false), portableReady: false }).kind, "none");
  assert.equal(selectExpansionFeaturedOffers(products, { coverage: coverage(true) }, { sourceGap: true }).kind, "none");
  assert.equal(selectExpansionFeaturedOffers(products.filter(({ category }) => category !== "controller"), { coverage: coverage(true) }).kind, "none");
  const stale = products.map((product) => product.id === "solar-primary" ? { ...product, staleSource: true } : product);
  assert.equal(selectExpansionFeaturedOffers(stale, { coverage: coverage(true) }).kind, "none");
  const unavailablePortable = products.map((product) => product.category === "power_station" ? { ...product, available: false } : product);
  assert.equal(selectExpansionFeaturedOffers(unavailablePortable, { coverage: coverage(false), portableReady: true, preferPortable: true }).kind, "none");
});

test("only relevant categories are featured in a DC-only result", () => {
  const featured = selectExpansionFeaturedOffers(products, { coverage: coverage(true, ["battery", "solar_panel", "controller"]) });
  assert.deepEqual(featured.items.map(({ category }) => category), ["battery", "solar_panel", "controller"]);
  assert.equal(featured.remainingCount, 0);
});

test("PT, RO and SI render featured purchase links above the six result cards with independent attribution", async () => {
  const source = await readFile(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");
  const html = source.slice(source.indexOf('result.innerHTML = `<p class="result-summary">'));
  assert.ok(html.indexOf('data-featured-products hidden') < html.indexOf('<div class="result-grid">'));
  assert.ok(html.indexOf('<div class="result-grid">') < html.indexOf('data-product-recommendations aria-live'));
  assert.match(source, /selectExpansionFeaturedOffers\(products, routePriority, \{ sourceGap \}\)/);
  assert.equal((source.match(/renderFeaturedProducts\(products, routePriority, sourceGap\);/g) || []).length, 3);
  assert.match(source, /data-affiliate-product data-source="result-featured"/);
  assert.match(source, /source: "result-featured"/);
  assert.match(source, /trackRenderedProductChoices\(target\)/);
  const style = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(style, /\[data-featured-products\]:not\(\[hidden\]\)/);
  assert.match(style, /\[data-featured-products\],/);
  for (const market of ["pt", "ro", "si"]) {
    const page = await readFile(new URL(`../${market}/index.html`, import.meta.url), "utf8");
    assert.match(page, /styles\.css\?v=20261118-expansion-featured1/);
    assert.match(page, /expansion-calculator-browser\.js\?v=20261118-expansion-featured1/);
  }
});
