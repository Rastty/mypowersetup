import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { calculateDcDcCharger } from "../src/dc-dc-charger.js";
import { calculateDcProtectionPlan } from "../src/dc-protection-planner.js";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("publishes crawlable CZ DC-DC calculator with safe continuation paths", async () => {
  const html = await read("kalkulacky/dc-dc-nabijecka/index.html");

  assert.match(html, /<link rel="canonical" href="https:\/\/mypowersetup\.com\/kalkulacky\/dc-dc-nabijecka\/">/);
  assert.match(html, /data-calculator-intent="dcdc-sizing"/);
  assert.match(html, /Volný trvalý proud alternátoru/);
  assert.match(html, /href="\/pruvodce\/jak-vybrat-dc-dc-nabijecku\/"/);
  assert.match(html, /href="\/#kalkulator"/);
  assert.match(html, /phase2-calculator-browser\.js/);
});

test("publishes crawlable CZ protection planner and keeps ampacity separate from voltage drop", async () => {
  const html = await read("kalkulacky/jisteni-12v/index.html");

  assert.match(html, /<link rel="canonical" href="https:\/\/mypowersetup\.com\/kalkulacky\/jisteni-12v\/">/);
  assert.match(html, /data-calculator-intent="dc-protection"/);
  assert.match(html, /Ověřená proudová zatížitelnost kabelu/);
  assert.match(html, /Průřez podle úbytku napětí/);
  assert.match(html, /href="\/pruvodce\/kabely-a-pojistky-12-v\/"/);
  assert.match(html, /href="\/#kalkulator"/);
});

test("hub and calculator sitemap discover both phase-2 landings", async () => {
  const [hub, sitemap] = await Promise.all([
    read("kalkulacky/index.html"),
    read("sitemap-calculators.xml"),
  ]);

  for (const route of ["/kalkulacky/dc-dc-nabijecka/", "/kalkulacky/jisteni-12v/"]) {
    assert.match(hub, new RegExp(`href="${route.replaceAll("/", "\\/")}"`));
    assert.match(sitemap, new RegExp(`https:\\/\\/mypowersetup\\.com${route.replaceAll("/", "\\/")}`));
  }
});

test("DC-DC landing result never exceeds alternator or battery output ceiling", () => {
  const result = calculateDcDcCharger({
    batteryCapacityAh: 300,
    replenishPercent: 60,
    targetDriveHours: 2,
    batteryVoltage: 12,
    sourceVoltage: 14.2,
    spareAlternatorCurrentA: 25,
    batteryMaxChargeCurrentA: 30,
    efficiencyPercent: 90,
  });

  assert.ok(result.recommendedChargerCurrentA <= result.feasibleOutputCurrentA);
  assert.ok(result.recommendedChargerCurrentA <= result.batteryMaxChargeCurrentA);
});

test("protection landing refuses a fuse when design current exceeds protection ceiling", () => {
  const result = calculateDcProtectionPlan({
    continuousCurrentA: 80,
    systemVoltage: 12,
    oneWayLengthM: 3,
    maxDropPercent: 3,
    planningMarginPercent: 125,
    cableAmpacityA: 80,
    equipmentMaxFuseA: 100,
  });

  assert.equal(result.designCurrentA, 100);
  assert.equal(result.protectionCeilingA, 80);
  assert.equal(result.recommendedFuseA, null);
  assert.equal(result.feasible, false);
});
