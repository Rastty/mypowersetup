import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodeExpansionSetupQuery, encodeExpansionSetupQuery } from "../src/expansion-setup-url.js";

const ALLOWED_IDS = ["fridge", "lights", "phones", "pump", "laptop", "tv", "coffee", "custom"];

test("expansion shared setup preserves edited usage and a bounded custom appliance", () => {
  const query = encodeExpansionSetupQuery({
    appliances: [
      { id: "fridge", selected: true, hours: 12.5, quantity: 2 },
      { id: "lights", selected: false, hours: 5, quantity: 1 },
      { id: "custom", selected: true, name: "5G router", watts: 25, hours: 24, quantity: 1, ac: false, surge: 1 },
    ],
    autonomyDays: "3",
    season: "shoulder",
    batteryType: "lifepo4",
    systemVoltage: "12",
  });

  const decoded = decodeExpansionSetupQuery(query, ALLOWED_IDS);
  assert.deepEqual([...decoded.applianceIds], ["fridge", "custom"]);
  assert.deepEqual(decoded.applianceState.fridge, { hours: 12.5, quantity: 2 });
  assert.deepEqual(decoded.applianceState.custom, {
    name: "5G router",
    watts: 25,
    hours: 24,
    quantity: 1,
    ac: false,
    surge: 1,
  });
});

test("expansion shared setup fails closed on unsafe editable values", () => {
  assert.equal(decodeExpansionSetupQuery("?loads=fridge&usage=fridge:25:1", ALLOWED_IDS), null);
  assert.equal(decodeExpansionSetupQuery("?loads=fridge&usage=fridge:4:0", ALLOWED_IDS), null);
  assert.equal(decodeExpansionSetupQuery("?loads=custom&custom_name=x&custom_watts=0&custom_hours=1&custom_qty=1&custom_ac=0&custom_surge=1", ALLOWED_IDS), null);
  assert.equal(decodeExpansionSetupQuery("?loads=fridge&custom_name=x", ALLOWED_IDS), null);
});

test("public expansion browser progressively upgrades the MVP controls", () => {
  const source = readFileSync(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");
  assert.match(source, /enhanceApplianceUi\(\)/);
  assert.match(source, /data-custom-name/);
  assert.match(source, /data-live-consumption/);
  assert.match(source, /data-quantity/);
  assert.match(source, /inputmode="decimal"/);
  assert.match(source, /stepTarget && !stepTarget\.disabled/);
  assert.match(source, /classList\.toggle\("is-complete"/);
  assert.match(source, /validAppliance\(item\)/);
  assert.match(source, /hasCustomAppliance/);
  assert.match(source, /mountUsageProfiles/);
  assert.match(source, /usage_profile_selected/);
});

test("every expansion homepage ships the current calculator asset", () => {
  for (const market of ["pt", "ro", "si"]) {
    const html = readFileSync(new URL(`../${market}/index.html`, import.meta.url), "utf8");
    assert.match(html, /\/src\/expansion-calculator-browser\.js\?v=20260902-visible-impressions1/);
  }
});
