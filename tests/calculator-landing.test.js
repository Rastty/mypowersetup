import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateLanding, getCalculatorIntent } from "../src/calculator-landing.js";
import { calculateSetup } from "../src/engine.js";

test("battery-capacity landing reuses the canonical engine without formula drift", () => {
  const calculation = calculateLanding("battery-capacity", {
    dailyWh: 900,
    autonomyDays: 2,
    batteryType: "lifepo4",
    systemVoltage: "auto",
  }, "cs");

  const direct = calculateSetup(calculation.engineInput);
  assert.deepEqual(calculation.engineResult, direct);
  assert.equal(calculation.result.dailyWh, 900);
  assert.equal(calculation.result.batteryWh, 2600);
  assert.equal(calculation.result.systemVoltage, 24);
  assert.equal(calculation.result.batteryAh, 110);
});

test("battery-capacity landing preserves explicit voltage and canonical warning", () => {
  const calculation = calculateLanding("battery-capacity", {
    dailyWh: 900,
    autonomyDays: 2,
    batteryType: "lifepo4",
    systemVoltage: "12",
  }, "cs");

  assert.equal(calculation.result.batteryWh, 2600);
  assert.equal(calculation.result.systemVoltage, 12);
  assert.equal(calculation.result.batteryAh, 220);
  assert.ok(calculation.result.warnings.some((warning) => warning.includes("24V")));
});

test("battery-capacity landing applies battery chemistry through the canonical catalog", () => {
  const calculation = calculateLanding("battery-capacity", {
    dailyWh: 900,
    autonomyDays: 2,
    batteryType: "lead",
    systemVoltage: "auto",
  }, "cs");

  assert.equal(calculation.result.batteryWh, 4200);
  assert.equal(calculation.result.systemVoltage, 24);
  assert.equal(calculation.result.batteryAh, 180);
  assert.equal(calculation.result.assumptions.usableDepthPercent, 50);
});

test("unknown calculator intents fail closed", () => {
  assert.throws(() => getCalculatorIntent("made-up"), /Unknown calculator intent/);
});

test("CZ calculator hub and proof page remain crawlable and commercially connected", async () => {
  const hub = await readFile("kalkulacky/index.html", "utf8");
  const proof = await readFile("kalkulacky/kapacita-baterie/index.html", "utf8");

  assert.match(hub, /<link rel="canonical" href="https:\/\/mypowersetup\.com\/kalkulacky\/">/);
  assert.match(hub, /href="\/kalkulacky\/kapacita-baterie\/"/);
  assert.doesNotMatch(hub, /noindex/i);

  assert.match(proof, /<link rel="canonical" href="https:\/\/mypowersetup\.com\/kalkulacky\/kapacita-baterie\/">/);
  assert.match(proof, /data-calculator-intent="battery-capacity"/);
  assert.match(proof, /href="\/#kalkulator"/);
  assert.match(proof, /href="\/pruvodce\/kapacita-baterie-do-karavanu\/"/);
  assert.match(proof, /"@type": "FAQPage"/);
  assert.doesNotMatch(proof, /noindex/i);
});

test("calculator sitemap exposes only live calculator URLs", async () => {
  const xml = await readFile("sitemap-calculators.xml", "utf8");
  assert.match(xml, /<loc>https:\/\/mypowersetup\.com\/kalkulacky\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/mypowersetup\.com\/kalkulacky\/kapacita-baterie\/<\/loc>/);
  assert.equal([...xml.matchAll(/<url>/g)].length, 2);
});
