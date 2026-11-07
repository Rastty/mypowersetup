import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { invalidateCalculatedResult } from "../src/calculator-result-visibility.js";
import { getCalculatorCopy } from "../src/calculator-copy.js";
import { buildCalculatorLandingAnalyticsParameters } from "../src/calculator-attribution.js";

function panels() {
  return {
    resultPanel: { hidden: false },
    errorPanel: { hidden: false },
    staleNotice: { hidden: true },
  };
}

test("changing a quick-calculator form hides previous electrical metrics and continuation links", () => {
  const ui = panels();
  assert.equal(invalidateCalculatedResult(ui), true);
  assert.equal(ui.resultPanel.hidden, true);
  assert.equal(ui.errorPanel.hidden, true);
  assert.equal(ui.staleNotice.hidden, false);
});

test("stale-result visibility fails closed when a required panel is absent", () => {
  for (const key of ["resultPanel", "errorPanel", "staleNotice"]) {
    const ui = panels();
    delete ui[key];
    assert.equal(invalidateCalculatedResult(ui), false);
  }
});

test("localized calculator result invalidation provides guidance for all core languages", () => {
  for (const locale of ["cs", "sk", "pl", "hu"]) {
    const copy = getCalculatorCopy(locale);
    assert.ok(copy.staleResult.length >= 30, locale);
    assert.notEqual(copy.staleResult, copy.failed, locale);
  }
});

test("shared quick-calculator browser invalidates on both typing and select changes", async () => {
  const browser = await readFile(new URL("../src/calculator-landing-browser.js", import.meta.url), "utf8");
  assert.match(browser, /import \{ invalidateCalculatedResult \} from "\.\/calculator-result-visibility\.js"/);
  assert.match(browser, /staleNotice\.setAttribute\("role", "status"\)/);
  assert.match(browser, /staleNotice\.hidden = true;/);
  assert.match(browser, /form\.addEventListener\("input", invalidateResult\)/);
  assert.match(browser, /form\.addEventListener\("change", invalidateResult\)/);
  assert.match(browser, /invalidateCalculatedResult\(\{ resultPanel, errorPanel, staleNotice \}\)/);
  assert.ok(browser.includes("function render({ userInitiated = false } = {}) {"));
  assert.ok(browser.includes("    errorPanel.hidden = true;\n    staleNotice.hidden = true;"));
  assert.match(browser, /resultPanel\.hidden = false;/);
});

test("stale-result guard covers every published quick-calculator route using the shared browser", async () => {
  const routes = [
    ["kalkulacky/kapacita-baterie/", "battery-capacity", "cs"],
    ["kalkulacky/vydrz-baterie/", "battery-autonomy", "cs"],
    ["kalkulacky/solarni-panely/", "solar-sizing", "cs"],
    ["kalkulacky/mppt-regulator/", "mppt-sizing", "cs"],
    ["kalkulacky/vykon-menice/", "inverter-sizing", "cs"],
    ["kalkulacky/prurez-kabelu-12v/", "cable-voltage-drop", "cs"],
    ["kalkulacky/12v-nebo-24v/", "voltage-system", "cs"],
    ["sk/kalkulacky/kapacita-baterie/", "battery-capacity", "sk"],
    ["sk/kalkulacky/solarne-panely/", "solar-sizing", "sk"],
    ["pl/kalkulatory/pojemnosc-akumulatora/", "battery-capacity", "pl"],
    ["pl/kalkulatory/panele-solarne/", "solar-sizing", "pl"],
    ["hu/kalkulatorok/akkumulator-kapacitas/", "battery-capacity", "hu"],
    ["hu/kalkulatorok/napelem-teljesitmeny/", "solar-sizing", "hu"],
  ];
  for (const [route, intent, locale] of routes) {
    const html = await readFile(new URL("../" + route + "index.html", import.meta.url), "utf8");
    assert.match(html, /data-calculator-form/, route);
    assert.match(html, /data-calculator-result/, route);
    assert.match(html, /data-calculator-error/, route);
    assert.match(html, /src="\/src\/calculator-landing-browser\.js\?v=/, route);
    assert.ok(buildCalculatorLandingAnalyticsParameters({
      sourcePath: "/" + route,
      intent,
      locale,
    }), route);
  }
});
