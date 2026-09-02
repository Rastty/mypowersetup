import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const matureBrowserFiles = [
  new URL("../src/app.js", import.meta.url),
  new URL("../src/app-sk.js", import.meta.url),
  new URL("../src/app-pl.js", import.meta.url),
  new URL("../src/app-hu-browser.js", import.meta.url),
];
const expansionBrowserFile = new URL("../src/expansion-calculator-browser.js", import.meta.url);

test("all calculator implementations use the same affiliate click event", async () => {
  for (const file of matureBrowserFiles) {
    const source = await readFile(file, "utf8");
    assert.match(source, /trackAffiliateClick\(/);
    assert.doesNotMatch(source, /mypowersetup:affiliate-click/);
  }

  const expansion = await readFile(expansionBrowserFile, "utf8");
  assert.match(expansion, /trackAffiliateClick\(/);
  assert.doesNotMatch(expansion, /affiliate_product_click/);
  assert.doesNotMatch(expansion, /mypowersetup:affiliate-click/);
});

test("all calculators expose the same visible product-choice impression denominator", async () => {
  for (const file of [...matureBrowserFiles, expansionBrowserFile]) {
    const source = await readFile(file, "utf8");
    assert.match(source, /bindAffiliateImpressionTracking\(/);
    assert.match(source, /affiliate-analytics\.js\?v=20260902-product-impressions1/);
  }
});

test("all markets use one shared calculator-to-guide event", async () => {
  const analytics = await readFile(new URL("../src/analytics.js", import.meta.url), "utf8");
  const expansion = await readFile(expansionBrowserFile, "utf8");
  assert.match(analytics, /track\("calculator_to_guide_click"/);
  for (const zone of ["result_component", "result_related", "homepage_guide_preview", "inline"]) {
    assert.match(analytics, new RegExp(`return ["']${zone}["']`));
  }
  assert.doesNotMatch(analytics, /calculator_(?:result|component)_guide_click/);
  assert.doesNotMatch(expansion, /calculator_(?:result|component)_guide_click/);
});

test("expansion calculation_completed uses mature-market parameter names", async () => {
  const expansion = await readFile(expansionBrowserFile, "utf8");
  for (const parameter of ["dailyWh", "batteryAh", "solarWatts", "systemVoltage", "applianceCount", "batteryType", "season"]) {
    assert.match(expansion, new RegExp(`\\b${parameter}\\b`), `${parameter} missing from expansion telemetry`);
  }
  for (const stale of ["daily_wh", "battery_wh", "solar_watts", "system_voltage", "selected_appliances"]) {
    assert.doesNotMatch(expansion, new RegExp(`\\b${stale}\\b`), `${stale} should not remain in expansion calculation telemetry`);
  }
});
