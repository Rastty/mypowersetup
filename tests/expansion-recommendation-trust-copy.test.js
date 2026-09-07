import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildExpansionComponentRecommendations } from "../src/expansion-component-recommendations.js";

const product = Object.freeze({
  id: "fixture:inverter",
  merchant: "fixture",
  name: "Fixture Pure Sine Inverter 12V 500W",
  description: "Pure sine inverter 12V 500W.",
  categoryPath: "Inverter",
  category: "inverter",
  brand: "Fixture",
  priceCzk: 100,
  priceCurrency: "EUR",
  available: true,
  productUrl: "https://example.com/product",
  affiliateUrl: "https://example.com/click",
  verifiedAt: "2026-09-07",
  specs: Object.freeze({ voltageV: 12, powerW: 500, pureSine: true }),
});

function setup(locale) {
  return {
    locale,
    systemVoltage: 12,
    inverterWatts: 300,
    batteryAh: 100,
    batteryType: "lifepo4",
    solarWatts: 300,
    controllerAmps: 30,
    charging: {
      starterVoltage: 12,
      dcDc: { suggestedCurrentAmps: 20 },
      shore: { suggestedCurrentAmps: 10 },
    },
  };
}

test("PT RO SI component recommendations use native reason and verification copy", () => {
  const cases = [
    ["pt", "A potência contínua cobre os 300 W calculados", "Confirma potência de pico"],
    ["ro", "Puterea continuă acoperă cei 300 W calculați", "Verifică puterea de vârf"],
    ["si", "Stalna moč pokrije izračunanih 300 W", "Preveri konično moč"],
    ["sl", "Stalna moč pokrije izračunanih 300 W", "Preveri konično moč"],
  ];

  for (const [locale, reason, verifyPrefix] of cases) {
    const item = buildExpansionComponentRecommendations([product], setup(locale)).inverter[0];
    assert.ok(item, `${locale}: inverter recommendation missing`);
    assert.equal(item.reason, reason);
    assert.ok(item.verify.startsWith(verifyPrefix), `${locale}: verification copy not localized: ${item.verify}`);
    assert.deepEqual(item.checks, ["500 W ≥ 300 W", "12 V = " + ({
      pt: "tensão do sistema",
      ro: "tensiunea sistemului",
      si: "sistemska napetost",
      sl: "sistemska napetost",
    })[locale]]);
    assert.doesNotMatch(item.reason + item.verify, /Trvalý výkon|Ověřte/);
  }
});

test("expansion browser renders specific reason, numeric checks and pre-buy verification", async () => {
  const source = await readFile(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");
  for (const marker of ["data-product-reason", "data-product-fit-checks", "data-product-verify"]) {
    assert.ok(source.includes(marker), `browser trust marker missing: ${marker}`);
  }
  for (const label of ["Porque é compatível", "De ce se potrivește", "Zakaj ustreza"]) {
    assert.ok(source.includes(label), `localized trust label missing: ${label}`);
  }
});
