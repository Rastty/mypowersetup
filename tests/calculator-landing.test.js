import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateLanding, getCalculatorIntent } from "../src/calculator-landing.js";
import { calculateSetup } from "../src/engine.js";
import { calculateDcCable } from "../src/dc-cable.js";

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

test("solar-sizing landing delegates solar and controller sizing to the canonical engine", () => {
  const calculation = calculateLanding("solar-sizing", { dailyWh: 1200, season: "summer" }, "cs");
  assert.deepEqual(calculation.engineResult, calculateSetup(calculation.engineInput));
  assert.equal(calculation.result.solarWatts, 450);
  assert.equal(calculation.result.controllerAmps, 40);
  assert.equal(calculation.result.systemVoltage, 12);
  assert.equal(calculation.result.calculation.peakSunHours, 4.5);
});

test("inverter-sizing landing delegates concurrency and surge sizing to the canonical engine", () => {
  const calculation = calculateLanding("inverter-sizing", {
    largestLoadWatts: 1200,
    otherLoadWatts: 300,
    surgeMultiplier: 1.5,
  }, "cs");
  assert.deepEqual(calculation.engineResult, calculateSetup(calculation.engineInput));
  assert.equal(calculation.result.estimatedConcurrentWatts, 1350);
  assert.equal(calculation.result.largestStartWatts, 1800);
  assert.equal(calculation.result.inverterWatts, 1800);
  assert.equal(calculation.result.systemVoltage, 24);
});

test("voltage-system landing uses canonical automatic voltage decision", () => {
  const calculation = calculateLanding("voltage-system", {
    dailyWh: 1800,
    maxAcLoadWatts: 800,
    surgeMultiplier: 1,
  }, "cs");
  assert.deepEqual(calculation.engineResult, calculateSetup(calculation.engineInput));
  assert.equal(calculation.result.dailyWh, 1800);
  assert.equal(calculation.result.batteryWh, 2600);
  assert.equal(calculation.result.inverterWatts, 1000);
  assert.equal(calculation.result.systemVoltage, 24);
});

test("cable-voltage-drop landing uses the shared canonical cable module", () => {
  const calculation = calculateLanding("cable-voltage-drop", {
    loadWatts: 500,
    oneWayLengthM: 5,
    systemVoltage: 12,
    maxDropPercent: 3,
  }, "cs");
  const direct = calculateDcCable(calculation.input);
  assert.deepEqual(calculation.result, direct);
  assert.equal(calculation.result.recommendedMm2, 25);
  assert.equal(calculation.result.currentAmps, 41.7);
  assert.equal(calculation.result.actualDropPercent, 2.43);
});

test("unknown calculator intents fail closed", () => {
  assert.throws(() => getCalculatorIntent("made-up"), /Unknown calculator intent/);
});

test("CZ calculator cluster remains crawlable, unique and commercially connected", async () => {
  const hub = await readFile("kalkulacky/index.html", "utf8");
  const pages = [
    ["kapacita-baterie", "battery-capacity", "/pruvodce/kapacita-baterie-do-karavanu/"],
    ["solarni-panely", "solar-sizing", "/pruvodce/kolik-w-solarnich-panelu/"],
    ["vykon-menice", "inverter-sizing", "/pruvodce/jak-velky-menic-do-karavanu/"],
    ["prurez-kabelu-12v", "cable-voltage-drop", "/pruvodce/kabely-a-pojistky-12-v/"],
    ["12v-nebo-24v", "voltage-system", "/pruvodce/12-v-nebo-24-v-karavan/"],
  ];

  assert.match(hub, /<link rel="canonical" href="https:\/\/mypowersetup\.com\/kalkulacky\/">/);
  assert.doesNotMatch(hub, /noindex/i);

  const titles = new Set();
  for (const [slug, intent, guide] of pages) {
    assert.match(hub, new RegExp(`href="/kalkulacky/${slug}/"`));
    const html = await readFile(`kalkulacky/${slug}/index.html`, "utf8");
    assert.match(html, new RegExp(`<link rel="canonical" href="https://mypowersetup\\.com/kalkulacky/${slug}/">`));
    assert.match(html, new RegExp(`data-calculator-intent="${intent}"`));
    assert.match(html, /href="\/#kalkulator"/);
    assert.ok(html.includes(`href="${guide}"`), `${slug} must link its matching guide`);
    assert.match(html, /FAQPage/);
    assert.doesNotMatch(html, /noindex/i);
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    assert.ok(title);
    assert.ok(!titles.has(title), `${slug} must have a unique title`);
    titles.add(title);
  }
});

test("calculator sitemap exposes the complete live calculator cluster", async () => {
  const xml = await readFile("sitemap-calculators.xml", "utf8");
  for (const slug of ["", "kapacita-baterie/", "solarni-panely/", "vykon-menice/", "prurez-kabelu-12v/", "12v-nebo-24v/"]) {
    assert.ok(xml.includes(`<loc>https://mypowersetup.com/kalkulacky/${slug}</loc>`));
  }
  assert.equal([...xml.matchAll(/<url>/g)].length, 6);
});

test("calculator browser exposes a stable route-level analytics hook", async () => {
  const browser = await readFile("src/calculator-landing-browser.js", "utf8");
  assert.match(browser, /mypowersetup:calculator-result/);
  assert.match(browser, /detail: \{ intent, locale, userInitiated: true \}/);
});
