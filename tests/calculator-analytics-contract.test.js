import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildCalculatorLandingAnalyticsParameters } from "../src/calculator-attribution.js";

const LANDINGS = [
  ["/kalkulacky/kapacita-baterie/", "battery-capacity", "cs", "calculator-landing-browser.js"],
  ["/kalkulacky/vydrz-baterie/", "battery-autonomy", "cs", "calculator-landing-browser.js"],
  ["/kalkulacky/solarni-panely/", "solar-sizing", "cs", "calculator-landing-browser.js"],
  ["/kalkulacky/mppt-regulator/", "mppt-sizing", "cs", "calculator-landing-browser.js"],
  ["/kalkulacky/dc-dc-nabijecka/", "dcdc-sizing", "cs", "phase2-calculator-browser.js"],
  ["/kalkulacky/vykon-menice/", "inverter-sizing", "cs", "calculator-landing-browser.js"],
  ["/kalkulacky/prurez-kabelu-12v/", "cable-voltage-drop", "cs", "calculator-landing-browser.js"],
  ["/kalkulacky/jisteni-12v/", "dc-protection", "cs", "phase2-calculator-browser.js"],
  ["/kalkulacky/12v-nebo-24v/", "voltage-system", "cs", "calculator-landing-browser.js"],
  ["/sk/kalkulacky/kapacita-baterie/", "battery-capacity", "sk", "calculator-landing-browser.js"],
  ["/sk/kalkulacky/solarne-panely/", "solar-sizing", "sk", "calculator-landing-browser.js"],
  ["/pl/kalkulatory/pojemnosc-akumulatora/", "battery-capacity", "pl", "calculator-landing-browser.js"],
  ["/pl/kalkulatory/panele-solarne/", "solar-sizing", "pl", "calculator-landing-browser.js"],
  ["/hu/kalkulatorok/akkumulator-kapacitas/", "battery-capacity", "hu", "calculator-landing-browser.js"],
  ["/hu/kalkulatorok/napelem-teljesitmeny/", "solar-sizing", "hu", "calculator-landing-browser.js"],
];

test("every published calculator landing has one canonical GA4 attribution shape", () => {
  for (const [sourcePath, intent, locale] of LANDINGS) {
    assert.deepEqual(buildCalculatorLandingAnalyticsParameters({ sourcePath, intent, locale }), {
      calculator_landing_path: sourcePath,
      calculator_landing_intent: intent,
      calculator_landing_locale: locale,
      calculator_source_context: "seo_landing",
    });
  }
});

test("every registered calculator landing HTML declares the matching intent, locale and analytics browser", async () => {
  for (const [sourcePath, intent, locale, browser] of LANDINGS) {
    const html = await readFile(new URL(`..${sourcePath}index.html`, import.meta.url), "utf8");
    assert.match(html, new RegExp(`data-calculator-intent=["']${intent}["']`), sourcePath);
    if (browser === "phase2-calculator-browser.js") {
      assert.match(html, /data-phase2-calculator/, sourcePath);
    } else {
      assert.match(html, new RegExp(`data-calculator-locale=["']${locale}["']`), sourcePath);
      assert.match(html, /data-calculator-landing/, sourcePath);
    }
    assert.match(html, new RegExp(`/src/${browser.replaceAll(".", "\\.")}`), sourcePath);
  }
});

test("landing browsers emit the canonical calculator parameters used by downstream product events", async () => {
  for (const file of ["calculator-landing-browser.js", "phase2-calculator-browser.js"]) {
    const source = await readFile(new URL(`../src/${file}`, import.meta.url), "utf8");
    assert.match(source, /buildCalculatorLandingAnalyticsParameters/);
    assert.doesNotMatch(source, /\blanding_path\s*:/);
    assert.doesNotMatch(source, /\blanding_intent\s*:/);
    assert.doesNotMatch(source, /\blanding_locale\s*:/);
  }
});
