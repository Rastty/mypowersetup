import test from "node:test";
import assert from "node:assert/strict";
import { classifyCalculatorContinuation, getCalculatorCopy, getCalculatorMarketBase } from "../src/calculator-copy.js";

const result = Object.freeze({
  dailyWh: 900,
  autonomyDays: 2,
  batteryWh: 2600,
  batteryAh: 220,
  systemVoltage: 12,
  assumptions: Object.freeze({ batteryMarginPercent: 15, usableDepthPercent: 80, solarEfficiencyPercent: 75, solarMarginPercent: 15 }),
  solarWatts: 350,
  controllerAmps: 40,
  calculation: Object.freeze({ peakSunHours: 4.5 }),
  inverterWatts: 1200,
});

for (const [locale, expectedLocale, nativeToken] of [
  ["sk", "sk-SK", "odporúčaná"],
  ["pl", "pl-PL", "zalecana"],
  ["hu", "hu-HU", "javasolt"],
]) {
  test(`${locale} calculator copy is native and locale-aware`, () => {
    const copy = getCalculatorCopy(locale);
    const n = (value) => new Intl.NumberFormat(copy.numberLocale, { maximumFractionDigits: 1 }).format(value);
    assert.equal(copy.numberLocale, expectedLocale);
    assert.match(copy.batterySummary({ n, result }).toLocaleLowerCase(locale), new RegExp(nativeToken, "i"));
    assert.doesNotMatch(copy.batterySummary({ n, result }), /denní spotřeby|doporučená kapacita|výpočet zahrnuje/i);
    assert.doesNotMatch(copy.solarSummary({ n, result }), /pro spotřebu|orientační minimum.*panelů/i);
  });
}

test("localized calculator continuation recognizes local builder and guide routes", () => {
  assert.equal(getCalculatorMarketBase("cs"), "/");
  assert.equal(getCalculatorMarketBase("sk"), "/sk/");
  assert.equal(getCalculatorMarketBase("pl"), "/pl/");
  assert.equal(getCalculatorMarketBase("hu"), "/hu/");

  assert.equal(classifyCalculatorContinuation("/sk/", "#kalkulator", "sk"), "builder");
  assert.equal(classifyCalculatorContinuation("/sk/sprievodca/kapacita-baterie-do-karavanu/", "", "sk"), "guide");
  assert.equal(classifyCalculatorContinuation("/pl/", "#kalkulator", "pl"), "builder");
  assert.equal(classifyCalculatorContinuation("/pl/poradnik/pojemnosc-akumulatora-do-kampera/", "", "pl"), "guide");
  assert.equal(classifyCalculatorContinuation("/hu/", "#kalkulator", "hu"), "builder");
  assert.equal(classifyCalculatorContinuation("/hu/utmutatok/lakoauto-akkumulator-kapacitas/", "", "hu"), "guide");
  assert.equal(classifyCalculatorContinuation("/pruvodce/kapacita-baterie-do-karavanu/", "", "pl"), null, "PL analytics must not treat CZ guide as local continuation");
});
