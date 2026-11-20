import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { selectExpansionFeaturedOffers, selectExpansionPartialOffers } from "../src/expansion-featured-offers.js";
import { COMMERCIAL_SCENARIOS, buildScenarioSetup } from "../src/commercial-scenarios.js";
import { buildPortugalRecommendations } from "../src/pt-recommendations.js";
import { buildRomaniaRecommendations } from "../src/ro-recommendations.js";
import { buildSloveniaRecommendations } from "../src/si-recommendations.js";
import { expansionPurchaseRoutePriority } from "../src/expansion-purchase-route-priority.js";
import { decorateExpansionRecommendations } from "../src/expansion-recommendation-roles.js";
import { decorateAwinAffiliateUrl } from "../src/awin-attribution.js";

const item = (category, id, more = {}) => ({ category, id, available: true, ...more });
const products = [
  item("battery", "battery-primary"), item("battery", "battery-alternative"),
  item("solar_panel", "solar-primary"), item("controller", "mppt-primary"),
  item("inverter", "inverter-primary"), item("dc_charger", "dcdc-primary"),
  item("power_station", "portable-primary"),
];
const coverage = (complete, required = ["battery", "solar_panel", "controller", "inverter"]) => ({ complete, required });

test("complete component route promotes only first compatible product in each required category", () => {
  const featured = selectExpansionFeaturedOffers(products, { coverage: coverage(true), preferPortable: false });
  assert.equal(featured.kind, "components");
  assert.deepEqual(featured.items.map(({ id }) => id), ["battery-primary", "solar-primary", "mppt-primary", "inverter-primary"]);
  assert.equal(featured.remainingCount, 0, "all four verified core components are visible above technical results");
});

test("fifth optional component remains in detailed comparison without hiding a core inverter", () => {
  const featured = selectExpansionFeaturedOffers(products, {
    coverage: coverage(true, ["battery", "solar_panel", "controller", "inverter", "dc_charger"]),
  });
  assert.deepEqual(featured.items.map(({ category }) => category), ["battery", "solar_panel", "controller", "inverter"]);
  assert.equal(featured.remainingCount, 1);
});

test("featured component uses a verified alternate when the first candidate becomes stale", () => {
  const catalog = products.map((product) => product.id === "battery-primary" ? { ...product, staleSource: true } : product);
  const featured = selectExpansionFeaturedOffers(catalog, { coverage: coverage(true) });
  assert.equal(featured.kind, "components");
  assert.equal(featured.items[0].id, "battery-alternative");
});

test("portable solution appears alone when components are incomplete and a portable fully fits", () => {
  const featured = selectExpansionFeaturedOffers(products, { coverage: coverage(false), portableReady: true, preferPortable: true });
  assert.equal(featured.kind, "portable");
  assert.deepEqual(featured.items.map(({ id }) => id), ["portable-primary"]);
  assert.deepEqual(featured.alternatives, []);
});

test("other fitting power stations from existing approved catalogs can be compared without replacing the main offer", () => {
  const multi = [
    ...products,
    item("power_station", "portable-more-capacity", { price: 1299, currency: "EUR" }),
    item("power_station", "portable-outdated", { staleSource: true }),
    item("power_station", "portable-unavailable", { available: false }),
    item("power_station", "portable-bigger", { price: 1699, currency: "EUR" }),
    item("power_station", "portable-bigger", { price: 1699, currency: "EUR" }),
  ];
  const route = { coverage: coverage(false), portableReady: true, preferPortable: true };
  const selected = selectExpansionFeaturedOffers(multi, route);
  assert.deepEqual(selected.items.map(({ id }) => id), ["portable-primary"]);
  assert.deepEqual(selected.alternatives.map(({ id }) => id), ["portable-more-capacity", "portable-bigger"]);
  assert.ok(Object.isFrozen(selected.alternatives));
  assert.deepEqual(selectExpansionFeaturedOffers(multi, route, { limit: 1 }).alternatives, []);
  assert.equal(selectExpansionFeaturedOffers(multi, route, { sourceGap: true }).kind, "none");
});

test("live approved-merchant PT and SI inventories provide multiple electrically fitting portable choices", async () => {
  for (const [market, file, build, scenarioId] of [
    ["pt", "products-pt.json", buildPortugalRecommendations, "remote-work"],
    ["sl", "products-si.json", buildSloveniaRecommendations, "winter-basic"],
  ]) {
    const catalog = JSON.parse(await readFile(new URL(`../data/${file}`, import.meta.url), "utf8"));
    const scenario = COMMERCIAL_SCENARIOS.find(({ id }) => id === scenarioId);
    const setup = buildScenarioSetup(scenario, market);
    const recommendations = build(catalog, setup, 3);
    const products = decorateExpansionRecommendations(recommendations);
    const route = expansionPurchaseRoutePriority(recommendations, setup, market);
    const featured = selectExpansionFeaturedOffers(products, route);
    assert.equal(featured.kind, "portable", market);
    assert.ok(featured.alternatives.length > 0, `${market}: no fitting alternatives from approved sources`);
    assert.ok(featured.alternatives.every((product) => product.category === "power_station" && product.affiliateUrl.startsWith("https://")));
  }
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

test("incomplete component route surfaces only approved individual offers and names all missing categories", () => {
  const candidates = [
    item("battery", "stale", { affiliateUrl: "https://approved.test/battery", staleSource: true }),
    item("battery", "battery-ok", { affiliateUrl: "https://approved.test/battery" }),
    item("solar_panel", "solar-untracked"),
    item("solar_panel", "solar-ok", { affiliateUrl: "https://approved.test/solar" }),
    item("controller", "mppt-ok", { affiliateUrl: "https://approved.test/mppt" }),
    item("inverter", "unneeded", { affiliateUrl: "https://approved.test/inverter" }),
    item("power_station", "portable-unmatched", { affiliateUrl: "https://approved.test/portable" }),
  ];
  const route = {
    coverage: { complete: false, required: ["battery", "solar_panel", "controller", "inverter", "dc_charger"], missing: ["inverter", "dc_charger"] },
    portableReady: false, preferPortable: false,
  };
  const selected = selectExpansionPartialOffers(candidates, route);
  assert.equal(selected.kind, "partial");
  assert.deepEqual(selected.items.map(({ id }) => id), ["battery-ok", "solar-ok", "mppt-ok"]);
  assert.deepEqual(selected.missing, ["inverter", "dc_charger"]);
  assert.ok(Object.isFrozen(selected.items) && Object.isFrozen(selected.missing));
  assert.deepEqual(selectExpansionPartialOffers(candidates, route, { limit: 1 }).items.map(({ id }) => id), ["battery-ok"]);
  assert.equal(selectExpansionPartialOffers(candidates, route, { sourceGap: true }).kind, "none");
  assert.equal(selectExpansionPartialOffers(candidates, { ...route, preferPortable: true }).kind, "none");
  assert.equal(selectExpansionPartialOffers(candidates, { coverage: { ...route.coverage, complete: true } }).kind, "none");
  assert.equal(selectExpansionPartialOffers([candidates[0], candidates[2]], route).kind, "none");
});

test("family touring in all three expansion markets has real separate offers, never a complete checkout claim", async () => {
  const scenario = COMMERCIAL_SCENARIOS.find(({ id }) => id === "family-touring");
  for (const [market, file, build] of [
    ["pt", "products-pt.json", buildPortugalRecommendations],
    ["ro", "products-ro.json", buildRomaniaRecommendations],
    ["sl", "products-si.json", buildSloveniaRecommendations],
  ]) {
    const catalog = JSON.parse(await readFile(new URL(`../data/${file}`, import.meta.url), "utf8"));
    const setup = buildScenarioSetup(scenario, market);
    const recommendations = build(catalog, setup, 3);
    const route = expansionPurchaseRoutePriority(recommendations, setup, market);
    assert.equal(route.coverage.complete, false, market);
    assert.equal(route.preferPortable, false, market);
    const featured = selectExpansionPartialOffers(decorateExpansionRecommendations(recommendations), route);
    assert.equal(featured.kind, "partial", market);
    assert.ok(featured.items.length > 0, market);
    assert.ok(featured.items.every((product) => product.affiliateUrl.startsWith("https://")), market);
    assert.ok(featured.missing.includes("inverter"), market);
  }
});

test("partial Awin click keeps network attribution distinct from the complete route", () => {
  const url = decorateAwinAffiliateUrl("https://www.awin1.com/cread.php?awinmid=1&awinaffid=2", {
    market: "pt", category: "battery", recommendationRole: "recommended", source: "result-partial",
  });
  assert.equal(new URL(url).searchParams.get("clickref3"), "source_result-partial");
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
  assert.match(source, /expansion-featured-offers\.js\?v=20261120-oxe-ron1/);
  assert.equal((source.match(/renderFeaturedProducts\(products, routePriority, sourceGap\);/g) || []).length, 3);
  assert.match(source, /data-affiliate-product data-source="\$\{sourceType\}"/);
  assert.match(source, /source: sourceType/);
  assert.match(source, /selectExpansionPartialOffers\(products, routePriority, \{ sourceGap \}\)/);
  assert.match(source, /data-partial-featured-warning/);
  assert.match(source, /data-offer-scope="\$\{partial \? "partial" : "complete"\}"/);
  assert.match(source, /trackRenderedProductChoices\(target\)/);
  assert.match(source, /data-featured-portable-alternatives/);
  assert.match(source, /data-cta-variant="\$\{variant\}"/);
  assert.match(source, /renderCard\(item, "alternative"\)/);
  for (const copy of [
    "confirma a compatibilidade elétrica entre produtos",
    "confirmă separat compatibilitatea electrică între produse",
    "preveri električno združljivost med izdelki",
  ]) {
    assert.ok(source.includes(copy), `missing explicit individual-fit disclaimer: ${copy}`);
  }
  const style = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(style, /\[data-featured-products\]:not\(\[hidden\]\)/);
  assert.match(style, /\[data-featured-products\],/);
  for (const market of ["pt", "ro", "si"]) {
    const page = await readFile(new URL(`../${market}/index.html`, import.meta.url), "utf8");
    assert.match(page, /styles\.css\?v=20261119-voltage-dc-load1/);
    assert.match(page, /expansion-calculator-browser\.js\?v=20261120-oxe-ron1/);
  }
});
