import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ROUTES, verifyExpansionHtml, verifyExpansionJavascript,
  verifyExpansionSupplyJavascript, verifyExpansionPriceJavascript,
  verifyExpansionSourceJavascript, verifyExpansionSupplyLive,
} from "./verify-expansion-supply-live.mjs";

const ORIGIN = "https://mypowersetup.com";
const local = async path => readFile(new URL("../" + path, import.meta.url), "utf8");
const browserPath = "src/expansion-calculator-browser.js";
const supplyPath = "src/expansion-supply-evidence.js";
const pricePath = "src/expansion-line-price.js";
const specsPath = "src/expansion-product-specs.js";
const rolesPath = "src/expansion-recommendation-roles.js";
const componentPath = "src/expansion-component-recommendations.js";
const batterySafetyPath = "src/battery-discharge-safety.js";
const productsPath = "src/products.js";
const powerQueenPath = "src/powerqueen-expansion.js";
const mediaPath = "src/expansion-product-media.js";
const stylesPath = "styles.css";
const marketPaths = ["src/pt-recommendations.js", "src/ro-recommendations.js", "src/si-recommendations.js"];

function server({ transform = () => null, statusAt = () => null } = {}) {
  const requests = [];
  return {
    requests,
    fetchImpl: async (url, options) => {
      const href = url.href;
      const path = url.pathname === "/" ? "index.html" :
        url.pathname.endsWith("/") ? url.pathname.slice(1) + "index.html" : url.pathname.slice(1);
      requests.push({ href, options, path });
      const override = statusAt(href, requests.length);
      if (override) return {
        ok: false, status: override, url: href,
        headers: { get: () => "text/html" }, text: async () => "temporary",
      };
      const original = await local(path);
      const served = transform({ path, href, text: original }) || {};
      return {
        ok: true,
        status: 200,
        url: served.url || href,
        headers: { get: () => path.endsWith(".html") ? "text/html; charset=utf-8" : path.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8" },
        text: async () => served.text ?? original,
      };
    },
  };
}

test("every public expansion calculator and both modules pass exact served-version proof", async () => {
  assert.deepEqual(ROUTES, ["/pt/", "/ro/", "/si/"]);
  const mock = server();
  const proof = await verifyExpansionSupplyLive({ fetchImpl: mock.fetchImpl, sleep: async () => {} });
  assert.equal(proof.status, "verified_served_assets");
  assert.deepEqual(proof.pages.map(p => p.market), ["pt", "ro", "si"]);
  assert.equal(proof.sourceParity, true);
  assert.equal(proof.ga4EventsObserved, false);
  assert.equal(proof.purchaseOrCommissionVerified, false);
  assert.match(proof.browserScript, /20261118-expansion-featured1/);
  assert.match(proof.stylesheet, /styles\.css\?v=20261118-expansion-featured1/);
  assert.match(proof.productMediaScript, /expansion-product-media\.js\?v=20261117-product-media1/);
  assert.match(proof.supplyScript, /20261113-explicit-intent1/);
  assert.match(proof.priceScript, /20261111-solar-subtotal1/);
  assert.match(proof.specsScript, /20261117-pv-check1/);
  assert.match(proof.rolesScript, /20261113-complete-price1/);
  assert.match(proof.batterySafetyScript, /20261117-bms-load1/);
  assert.match(proof.productsScript, /20261117-pq-region1/);
  assert.match(proof.powerQueenGuardScript, /20261117-pq-region1/);
  assert.equal(proof.marketModules.length, 3);
  assert.ok(proof.marketModules.every(row => row.script.includes("20261117-pq-region1")));
  assert.match(proof.componentScript, /20261117-pq-region1/);
  assert.deepEqual(mock.requests.map(r => r.path), [
    "pt/index.html", "ro/index.html", "si/index.html",
    stylesPath, browserPath, supplyPath, pricePath, specsPath, rolesPath, batterySafetyPath, mediaPath,
    ...marketPaths, componentPath, productsPath, powerQueenPath,
  ]);
  assert.ok(mock.requests.every(r => r.options.cache === "no-store"));
  assert.ok(mock.requests.every(r => r.options.redirect === "follow"));
});

test("a stale public market HTML version fails rather than trusting Pages deploy status", async () => {
  const mock = server({ transform: ({ path, text }) => path === "ro/index.html"
    ? { text: text.replace("expansion-calculator-browser.js?v=20261118-expansion-featured1", "expansion-calculator-browser.js?v=20261113-stale") } : null });
  await assert.rejects(
    verifyExpansionSupplyLive({ fetchImpl: mock.fetchImpl, sleep: async () => {} }),
    /EXPANSION_PUBLIC_SCRIPT_VERSION_DRIFT_ro/,
  );
});

test("served browser must match local source and the fail-closed supply/outage contract", async () => {
  const source = await local(browserPath);
  assert.match(source, /data-recommendation-unavailable/);
  const importUrl = verifyExpansionJavascript(source, source);
  assert.match(importUrl, /expansion-supply-evidence\.js\?v=/);
  assert.throws(() => verifyExpansionJavascript(source.replace("trackCatalogUnavailable()", "disabled()"), source),
    /EXPANSION_PUBLIC_CALCULATOR_JS_SOURCE_DRIFT/);
  const mock = server({ transform: ({ path, text }) => path === browserPath
    ? { text: text.replace("expansion_supply_", "stale_supply_") + "// stale\n" } : null });
  await assert.rejects(verifyExpansionSupplyLive({ fetchImpl: mock.fetchImpl }),
    /EXPANSION_PUBLIC_CALCULATOR_JS_SOURCE_DRIFT/);
});

test("a changed dependency event or incorrect CDN response cannot silently pass", async () => {
  const supply = await local(supplyPath);
  assert.equal(verifyExpansionSupplyJavascript(supply, supply), true);
  assert.throws(() => verifyExpansionSupplyJavascript(supply.replace("expansion_supply_inverter_missing", "incorrect"), supply),
    /EXPANSION_PUBLIC_SUPPLY_JS_SOURCE_DRIFT/);
  const mock = server({ transform: ({ path, text }) => path === supplyPath
    ? { text: text.replace("expansion_supply_inverter_missing", "incorrect") } : null });
  await assert.rejects(verifyExpansionSupplyLive({ fetchImpl: mock.fetchImpl }),
    /EXPANSION_PUBLIC_SUPPLY_JS_SOURCE_DRIFT/);
  const moved = server({ transform: ({ path, href }) => path === "pt/index.html"
    ? { url: href.replace("mypowersetup.com", "fake.example") } : null });
  await assert.rejects(verifyExpansionSupplyLive({ fetchImpl: moved.fetchImpl }),
    /EXPANSION_PUBLIC_REDIRECT_DRIFT/);
});

test("a temporary HTTP 503 retries; persistent failed responses fail closed", async () => {
  const retry = server({ statusAt: (url, count) => count === 1 ? 503 : null });
  const result = await verifyExpansionSupplyLive({ fetchImpl: retry.fetchImpl, sleep: async () => {} });
  assert.equal(result.status, "verified_served_assets");
  assert.equal(retry.requests.length, 18);
  const blocked = server({ statusAt: url => url.endsWith("/pt/") ? 503 : null });
  await assert.rejects(verifyExpansionSupplyLive({ fetchImpl: blocked.fetchImpl, sleep: async () => {} }),
    /EXPANSION_PUBLIC_HTTP_503/);
  assert.equal(blocked.requests.length, 3);
});

test("HTML gate independently rejects missing calculator or invalid canonical", async () => {
  const html = await local("pt/index.html");
  assert.match(verifyExpansionHtml(html, html, "pt"), /expansion-calculator-browser\.js/);
  assert.throws(() => verifyExpansionHtml(html.replace("data-expansion-calculator", "data-other"), html, "pt"),
    /EXPANSION_PUBLIC_CALCULATOR_HTML_MISSING_pt/);
  assert.throws(() => verifyExpansionHtml(html.replace('rel="canonical"', 'rel="alternate"'), html, "pt"),
    /EXPANSION_PUBLIC_CANONICAL_DRIFT_pt/);
});

test("a stale served portable-spec formatter fails the release proof", async () => {
  const stale = server({ transform: ({ path, text }) => path === specsPath
    ? { text: text.replace("positiveFinite", "oldPositiveFinite") } : null });
  await assert.rejects(verifyExpansionSupplyLive({ fetchImpl: stale.fetchImpl, sleep: async () => {} }),
    /EXPANSION_PUBLIC_PRODUCT_SPECS_JS_SOURCE_DRIFT/);
});

test("product photographs and their layout must both be on the actual served release", async () => {
  const cases = [
    [mediaPath, "renderExpansionProductMedia(product)", /EXPANSION_PUBLIC_PRODUCT_MEDIA_JS_SOURCE_DRIFT/],
    [stylesPath, ".expansion-product-media img", /EXPANSION_PUBLIC_PRODUCT_MEDIA_CSS_SOURCE_DRIFT/],
  ];
  for (const [path, marker, expected] of cases) {
    const stale = server({ transform: ({ path: servedPath, text }) => servedPath === path
      ? { text: text.replace(marker, "stale-product-media") } : null });
    await assert.rejects(verifyExpansionSupplyLive({ fetchImpl: stale.fetchImpl, sleep: async () => {} }), expected);
  }
  const wrongStyleKey = server({ transform: ({ path, text }) => path === "si/index.html"
    ? { text: text.replace("styles.css?v=20261118-expansion-featured1", "styles.css?v=old") } : null });
  await assert.rejects(verifyExpansionSupplyLive({ fetchImpl: wrongStyleKey.fetchImpl, sleep: async () => {} }),
    /EXPANSION_PUBLIC_STYLESHEET_COUNT_si/);
});

test("new BMS safety and product matcher dependencies must be actually served, not just referenced", async () => {
  const cases = [
    [batterySafetyPath, "batteryBmsLoadWithinAdvertisedLimit", /EXPANSION_PUBLIC_BATTERY_BMS_JS_SOURCE_DRIFT/],
    [productsPath, "batteryBmsLoadWithinAdvertisedLimit", /EXPANSION_PUBLIC_BATTERY_PRODUCTS_JS_SOURCE_DRIFT/],
  ];
  for (const [path, marker, expected] of cases) {
    const stale = server({ transform: ({ path: servedPath, text }) => servedPath === path
      ? { text: text.replace(marker, "outdatedBatteryBmsCheck") } : null });
    await assert.rejects(verifyExpansionSupplyLive({ fetchImpl: stale.fetchImpl, sleep: async () => {} }), expected);
  }
});

test("a stale served panel-price or cheapest-badge dependency cannot pass public readback", async () => {
  for (const path of [pricePath, rolesPath]) {
    const original = await local(path);
    assert.equal(verifyExpansionPriceJavascript(original, original,
      path === pricePath ? "line" : "roles"), true);
    const mock = server({ transform: ({ path: servedPath, text }) => servedPath === path
      ? { text: text.replace("expansionLinePrice", "otherPrice") } : null });
    await assert.rejects(verifyExpansionSupplyLive({ fetchImpl: mock.fetchImpl, sleep: async () => {} }),
      /EXPANSION_PUBLIC_PRICE_JS_SOURCE_DRIFT/);
  }
});

test("all three public recommendation modules and shared source health gate are served from the exact release", async () => {
  for (const path of [...marketPaths, componentPath]) {
    const original = await local(path);
    const kind = path === componentPath ? "component" : path.split("/")[1].slice(0, 2);
    assert.equal(verifyExpansionSourceJavascript(original, original, kind), true);
    const stale = server({ transform: ({ path: offeredPath, text }) => offeredPath === path
      ? { text: text.replace("hasCurrentRecommendationSource", "oldSourceHealth") } : null });
    await assert.rejects(
      verifyExpansionSupplyLive({ fetchImpl: stale.fetchImpl, sleep: async () => {} }),
      /EXPANSION_PUBLIC_SOURCE_JS_SOURCE_DRIFT/,
    );
  }
});

test("partial source failure copy and verified supply telemetry gate must be in served calculator", async () => {
  const js = await local(browserPath);
  assert.match(js, /data-recommendation-partial-source/);
  assert.match(js, /if \(sourceGap\) \{ trackCatalogUnavailable\(\); return priority; \}/);
  const fake = server({ transform: ({ path, text }) => path === browserPath
    ? { text: text.replace("data-recommendation-partial-source", "outdated-partial-copy") } : null });
  await assert.rejects(verifyExpansionSupplyLive({ fetchImpl: fake.fetchImpl }), /EXPANSION_PUBLIC_CALCULATOR_JS_SOURCE_DRIFT/);
});
