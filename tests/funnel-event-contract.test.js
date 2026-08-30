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
    assert.match(source, /event:\s*["']affiliate_click["']/);
  }

  const expansion = await readFile(expansionBrowserFile, "utf8");
  assert.match(expansion, /event:\s*["']affiliate_click["']/);
  assert.doesNotMatch(expansion, /affiliate_product_click/);
  assert.match(expansion, /mypowersetup:affiliate-click/);
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
