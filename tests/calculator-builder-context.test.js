import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildDcDcBuilderContext,
  parseBuilderDcDcCurrent,
} from "../src/calculator-builder-context.js";

const attribution = Object.freeze({
  calculator_landing_path: "/kalkulacky/dc-dc-nabijecka/",
  calculator_landing_intent: "dcdc-sizing",
  calculator_landing_locale: "cs",
  calculator_source_context: "seo_landing",
  calculator_recommended_current_a: 30,
  calculator_required_current_a: 34.6,
  calculator_feasible_current_a: 30,
  calculator_system_voltage: 12,
  calculator_source_voltage: 14.4,
  calculator_target_met: false,
});

test("Builder DC-DC current parser reads the canonical rendered recommendation", () => {
  assert.equal(parseBuilderDcDcCurrent("alespoň 30 A"), 30);
  assert.equal(parseBuilderDcDcCurrent("alespoň 12,5 A"), 12.5);
  assert.equal(parseBuilderDcDcCurrent("individuální návrh"), null);
  assert.equal(parseBuilderDcDcCurrent("alespoň 999 A"), null);
});

test("continuation context stays inactive outside the CZ DC-DC landing journey", () => {
  assert.equal(buildDcDcBuilderContext({ ...attribution, calculator_landing_intent: "solar-sizing" }, "alespoň 30 A"), null);
  assert.equal(buildDcDcBuilderContext({ ...attribution, calculator_landing_locale: "sk" }, "alespoň 30 A"), null);
  assert.equal(buildDcDcBuilderContext({ ...attribution, calculator_recommended_current_a: undefined }, "alespoň 30 A"), null);
});

test("matching landing and Builder currents are shown as confirmation, not an override", () => {
  const context = buildDcDcBuilderContext(attribution, "alespoň 30 A");
  assert.equal(context.status, "match");
  assert.equal(context.landingCurrentA, 30);
  assert.equal(context.builderCurrentA, 30);
  assert.match(context.headline, /Detailní kalkulačka: 30 A · Builder: 30 A/);
  assert.match(context.message, /stejnou proudovou třídu/i);
});

test("a higher Builder current keeps the safer landing limit visible", () => {
  const context = buildDcDcBuilderContext(attribution, "alespoň 40 A");
  assert.equal(context.status, "builder-higher");
  assert.equal(context.builderCurrentA, 40);
  assert.match(context.message, /Nepřekračujte však 30 A/i);
  assert.match(context.message, /alternátoru/i);
  assert.match(context.message, /BMS/i);
});

test("a lower Builder current explains that the two calculations use different scope", () => {
  const context = buildDcDcBuilderContext(attribution, "alespoň 20 A");
  assert.equal(context.status, "builder-lower");
  assert.equal(context.builderCurrentA, 20);
  assert.match(context.message, /menší proud/i);
  assert.match(context.message, /horním kontextem/i);
});

test("individual Builder design never presents the landing current as a replacement design", () => {
  const context = buildDcDcBuilderContext(attribution, "individuální návrh");
  assert.equal(context.status, "individual");
  assert.equal(context.builderCurrentA, null);
  assert.match(context.headline, /Builder: individuální návrh/);
  assert.match(context.message, /nepoužívejte samotný výsledek/i);
});

test("pending Builder result preserves the landing context without pretending a comparison exists", () => {
  const context = buildDcDcBuilderContext(attribution, "");
  assert.equal(context.status, "pending");
  assert.equal(context.builderCurrentA, null);
  assert.match(context.headline, /Navazujete z DC–DC kalkulačky: 30 A/);
});

test("the Builder loads the continuation UI through its existing affiliate analytics module", async () => {
  const analytics = await readFile(new URL("../src/affiliate-analytics.js", import.meta.url), "utf8");
  const context = await readFile(new URL("../src/calculator-builder-context.js", import.meta.url), "utf8");
  assert.match(analytics, /import "\.\/calculator-builder-context\.js"/);
  assert.match(context, /resolveCalculatorAttribution/);
  assert.match(context, /#charging-options/);
  assert.doesNotMatch(context, /calculateChargingPlan|calculateDcDcCharger|recommendProducts/);
});
