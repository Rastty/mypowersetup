import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { expansionInverterGapAction } from "../src/expansion-inverter-gap.js";

const calculation = Object.freeze({
  batteryAh: 100, batteryWh: 1280, batteryLabel: "LiFePO₄",
  solarWatts: 280, controllerAmps: 30, systemVoltage: 12, inverterWatts: 250,
});

for (const [market, guide] of [
  ["pt", "/pt/guias/inversor-autocaravana-potencia/"],
  ["ro", "/ro/ghiduri/invertor-autorulota-putere/"],
  ["si", "/si/vodici/inverter-avtodom-moc/"],
]) {
  test(`${market}: missing verified inverter points to real local guide with calculated constraints`, async () => {
    const action = expansionInverterGapAction(market, ["inverter", "dc_charger"], calculation);
    assert.equal(action.href, guide);
    assert.match(action.text, /250 W/);
    assert.match(action.text, /12 V/);
    assert.ok(action.label.length > 12);
    assert.doesNotMatch(action.text, /affiliate|afiliado/i);

    const html = await readFile(new URL(`..${guide}index.html`, import.meta.url), "utf8");
    assert.match(html, /<link rel="canonical"/);
  });

  test(`${market}: no inverter gap, DC-only sizing or incomplete catalog does not fabricate shortage`, () => {
    assert.equal(expansionInverterGapAction(market, [], calculation), null);
    assert.equal(expansionInverterGapAction(market, ["battery"], calculation), null);
    assert.equal(expansionInverterGapAction(market, ["inverter"], { ...calculation, inverterWatts: 0 }), null);
    assert.equal(expansionInverterGapAction(market, ["inverter"], calculation, true), null);
  });
}

test("all expansion calculators offer the no-match guide without hiding partial offers", async () => {
  const [source, analytics, styles] = await Promise.all([
    readFile(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8"),
    readFile(new URL("../src/analytics.js", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);
  for (const market of ["pt", "ro", "si"]) {
    assert.match(source, new RegExp(`renderProductSection\\("${market}-products-title".*calculation\\)`));
  }
  assert.match(source, /renderInverterGapGuide\(routePriority, calculation, sourceGap\)/);
  assert.match(source, /data-inverter-gap-guide/);
  assert.match(source, /data-gap-inverter-guide/);
  assert.match(analytics, /result_supply_gap/);
  assert.match(styles, /\.inverter-gap-guide/);
});
