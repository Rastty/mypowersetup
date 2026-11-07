import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateLanding } from "../src/calculator-landing.js";
import { calculateControllerSizing } from "../src/engine.js";
import {
  calculatorHandoffTarget, buildCalculatorHandoffUrl, applyCalculatorHandoffPrefill,
} from "../src/calculator-handoff.js";
import { classifyCalculatorContinuation, getCalculatorCopy } from "../src/calculator-copy.js";

const cases = [
  ["cs", "/kalkulacky/kapacita-baterie/", "/kalkulacky/solarni-panely/"],
  ["sk", "/sk/kalkulacky/kapacita-baterie/", "/sk/kalkulacky/solarne-panely/"],
  ["pl", "/pl/kalkulatory/pojemnosc-akumulatora/", "/pl/kalkulatory/panele-solarne/"],
  ["hu", "/hu/kalkulatorok/akkumulator-kapacitas/", "/hu/kalkulatorok/napelem-teljesitmeny/"],
];

function form() {
  const values = Object.fromEntries(["dailyWh","panelWatts","systemVoltage","batteryType"].map((key)=>[key,{value:"initial"}]));
  return { elements: { namedItem(key) { return values[key] || null; } }, values };
}

test("all four battery landing calculations pass exact consumption, actual voltage and chemistry to local solar form", () => {
  for (const [locale, batteryPath, solarPath] of cases) {
    const inputs = { dailyWh: 900, autonomyDays: 2, batteryType: "lead", systemVoltage: "auto" };
    const result = calculateLanding("battery-capacity", inputs, locale).result;
    assert.equal(result.dailyWh, 900, locale);
    const href = buildCalculatorHandoffUrl({ intent: "battery-capacity", locale, result, inputs });
    assert.ok(href?.startsWith(solarPath + "?"), locale);
    const prefillForm = form();
    const applied = applyCalculatorHandoffPrefill({ form: prefillForm, intent: "solar-sizing", locale, pathname: solarPath, search: new URL(href, "https://mypowersetup.com").search });
    assert.equal(applied?.from, "battery-capacity", locale);
    assert.equal(prefillForm.values.dailyWh.value, "900", locale);
    assert.equal(prefillForm.values.systemVoltage.value, String(result.systemVoltage), locale);
    assert.equal(prefillForm.values.batteryType.value, "lead", locale);
    assert.equal(classifyCalculatorContinuation(solarPath, "", locale), "calculator", locale);
    assert.equal(calculatorHandoffTarget("battery-capacity", locale)?.path, solarPath);
    assert.notEqual(batteryPath, solarPath);
  }
});

test("CZ solar sizing passes real Wp and lead charging voltage into its MPPT calculator", () => {
  const inputs = { dailyWh: 1200, season: "summer", systemVoltage: "24", batteryType: "lead" };
  const result = calculateLanding("solar-sizing", inputs, "cs").result;
  const href = buildCalculatorHandoffUrl({ intent: "solar-sizing", locale: "cs", result, inputs });
  assert.ok(href.startsWith("/kalkulacky/mppt-regulator/?"));
  const page = "/kalkulacky/mppt-regulator/";
  const f = form();
  const applied = applyCalculatorHandoffPrefill({ form: f, intent: "mppt-sizing", locale: "cs", pathname: page, search: new URL(href, "https://mypowersetup.com").search });
  assert.equal(applied?.from, "solar-sizing");
  assert.equal(Number(f.values.panelWatts.value), result.solarWatts);
  assert.equal(f.values.systemVoltage.value, "24");
  assert.equal(f.values.batteryType.value, "lead");
  const target = calculateControllerSizing({ solarWatts: Number(f.values.panelWatts.value), systemVoltage: 24, batteryType: f.values.batteryType.value });
  assert.equal(target.controllerAmps, result.controllerAmps);
});

test("no fabricated MPPT prefill for oversized array, no foreign-market MPPT link", () => {
  const huge = { solarWatts: 10000, systemVoltage: 24 };
  assert.equal(buildCalculatorHandoffUrl({ intent: "solar-sizing", locale: "cs", result: huge, inputs: { batteryType: "lifepo4" } }), null);
  assert.equal(calculatorHandoffTarget("solar-sizing", "sk"), null);
  assert.equal(calculatorHandoffTarget("solar-sizing", "pl"), null);
  assert.equal(calculatorHandoffTarget("solar-sizing", "hu"), null);
  assert.equal(buildCalculatorHandoffUrl({ intent: "solar-sizing", locale: "sk", result: { solarWatts: 500, systemVoltage: 12 }, inputs: { batteryType: "lifepo4" } }), null);
});

test("prefill rejects malformed, duplicated, cross-market and incompatible inputs atomically", () => {
  const path = "/sk/kalkulacky/solarne-panely/";
  const valid = "?mps_from=battery-capacity&dailyWh=1200&systemVoltage=24&batteryType=lifepo4";
  for (const search of [
    valid + "&dailyWh=50",
    valid + "&systemVoltage=12",
    valid.replace("batteryType=lifepo4", "batteryType=unknown"),
    valid.replace("dailyWh=1200", "dailyWh=-100"),
    valid.replace("dailyWh=1200", "dailyWh=123.4"),
    valid.replace("dailyWh=1200", "dailyWh=999999"),
    valid.replace("mps_from=battery-capacity", "mps_from=solar-sizing"),
    valid.replace("systemVoltage=24", "systemVoltage=48"),
    "?dailyWh=1200&systemVoltage=24&batteryType=lifepo4",
  ]) {
    const f = form();
    assert.equal(applyCalculatorHandoffPrefill({ form: f, intent: "solar-sizing", locale: "sk", pathname: path, search }), null, search);
    assert.deepEqual(Object.values(f.values).map((x) => x.value), ["initial", "initial", "initial", "initial"], search);
  }
  const f = form();
  assert.equal(applyCalculatorHandoffPrefill({ form: f, intent: "solar-sizing", locale: "sk", pathname: "/pl/kalkulatory/panele-solarne/", search: valid }), null);
  const missing = { elements: { namedItem(name) { return name === "batteryType" ? null : { value: "original" }; } } };
  assert.equal(applyCalculatorHandoffPrefill({ form: missing, intent: "solar-sizing", locale: "sk", pathname: path, search: valid }), null);
});

test("battery and solar continuation links are local and measurable, not generic guide traffic", () => {
  for (const [locale, , solarPath] of cases) {
    assert.equal(classifyCalculatorContinuation(solarPath, "", locale), "calculator");
  }
  assert.equal(classifyCalculatorContinuation("/kalkulacky/mppt-regulator/", "", "cs"), "calculator");
  assert.equal(classifyCalculatorContinuation("/kalkulacky/mppt-regulator/", "", "sk"), null);
  assert.equal(classifyCalculatorContinuation("/pl/kalkulatory/panele-solarne/", "", "hu"), null);
  assert.equal(classifyCalculatorContinuation("/sk/kalkulacky/solarne-panely/", "#x", "sk"), null);
});

test("localized solar pages expose battery chemistry instead of silently hardcoding LiFePO4", async () => {
  for (const [, , solarPath] of cases) {
    const html = await readFile(new URL("../" + solarPath.slice(1) + "index.html", import.meta.url), "utf8");
    assert.match(html, /<select id="batteryType" name="batteryType">/, solarPath);
    assert.match(html, /<option value="lead">/, solarPath);
    assert.doesNotMatch(html, /<input type="hidden" name="batteryType"/, solarPath);
  }
});

test("all nine receiving and sending pages reference the current handoff module bundle", async () => {
  const paths = [...cases.flatMap(([, battery, solar]) => [battery, solar]), "/kalkulacky/mppt-regulator/"];
  for (const path of paths) {
    const html = await readFile(new URL("../" + path.slice(1) + "index.html", import.meta.url), "utf8");
    assert.match(html, /src="\/src\/calculator-landing-browser\.js\?v=20261107-handoff1"/, path);
  }
  const script = await readFile(new URL("../src/calculator-landing-browser.js", import.meta.url), "utf8");
  assert.match(script, /applyCalculatorHandoffPrefill\(/);
  assert.match(script, /buildCalculatorHandoffUrl\(/);
  assert.match(script, /updateHandoffLink\(result, data\)/);
  for (const locale of ["cs","sk","pl","hu"]) assert.ok(getCalculatorCopy(locale).prefillNote?.length > 20);
});
