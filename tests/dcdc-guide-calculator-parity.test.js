import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateDcDcCharger } from "../src/dc-dc-charger.js";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");

test("DC-DC guide example current steps agree with actual calculator algorithm", async () => {
  const guide = await read("pruvodce/jak-vybrat-dc-dc-nabijecku/index.html");
  const scenarios = [
    { energyWh: 300, driveHours: 2, voltage: 12, requiredA: 12.5, stepA: 20, guideText: "12,5 A → 20 A" },
    { energyWh: 600, driveHours: 2, voltage: 12, requiredA: 25, stepA: 30, guideText: "25 A → 30 A" },
    { energyWh: 600, driveHours: 2, voltage: 24, requiredA: 12.5, stepA: 20, guideText: "12,5 A → 20 A" },
    { energyWh: 900, driveHours: 1, voltage: 12, requiredA: 75, stepA: 80, guideText: "75 A → 80 A" },
  ];
  for (const example of scenarios) {
    const result = calculateDcDcCharger({
      batteryCapacityAh: example.energyWh / (example.voltage * 0.5),
      replenishPercent: 50,
      targetDriveHours: example.driveHours,
      batteryVoltage: example.voltage,
      sourceVoltage: example.voltage === 24 ? 28.4 : 14.2,
      spareAlternatorCurrentA: 200,
      batteryMaxChargeCurrentA: 120,
      efficiencyPercent: 90,
    });
    assert.equal(result.energyToReplaceWh, example.energyWh);
    assert.equal(result.requiredOutputCurrentA, example.requiredA);
    assert.equal(result.recommendedChargerCurrentA, example.stepA);
    assert.ok(guide.includes(example.guideText), example.guideText);
  }
  assert.match(guide, /Potřebný výstupní proud \\(A\\) ≈ energie k doplnění/);
  assert.match(guide, /Účinnost .*se započítává při kontrole potřebného vstupního proudu/);
  assert.doesNotMatch(guide, /600 ÷ 2 ÷ 12 ÷ 0,90/);
  assert.doesNotMatch(guide, /Kalkulátor používá pouze konzervativní plánovací strop/);
});

test("efficiency changes input-current ceiling, never twice reduces required output current", () => {
  const base = {
    batteryCapacityAh: 100, replenishPercent: 50, targetDriveHours: 2,
    batteryVoltage: 12, sourceVoltage: 14.2, spareAlternatorCurrentA: 20,
    batteryMaxChargeCurrentA: 100,
  };
  const lossy = calculateDcDcCharger({ ...base, efficiencyPercent: 70 });
  const efficient = calculateDcDcCharger({ ...base, efficiencyPercent: 100 });
  assert.equal(lossy.requiredOutputCurrentA, 25);
  assert.equal(efficient.requiredOutputCurrentA, 25);
  assert.ok(lossy.feasibleOutputCurrentA < efficient.feasibleOutputCurrentA);
  assert.equal(lossy.targetMet, false, "unmet target is reported rather than recommending an oversized charger");
});

test("DC-DC calculator result links directly to reviewed comparison, not to a guessed compatible purchase", async () => {
  const [calculator, guide] = await Promise.all([
    read("kalkulacky/dc-dc-nabijecka/index.html"),
    read("pruvodce/jak-vybrat-dc-dc-nabijecku/index.html"),
  ]);
  assert.match(calculator, /href="\\/pruvodce\\/jak-vybrat-dc-dc-nabijecku\\/#overene-nabidky"/);
  assert.match(calculator, /nikoli automaticky kompatibilní nabídky/);
  assert.match(guide, /id="overene-nabidky" data-guide-category="dc_charger"/);
  assert.match(guide, /guide-verified-offers\\.js/);
  assert.match(guide, /Konkrétní modely automaticky neschvaluje/);
  assert.doesNotMatch(guide, /ukáže kompatibilní DC–DC nabíječky z katalogu/);
  assert.doesNotMatch(calculator, /ehub\\.cz\\/system\\/scripts\\/click/, "public calculator must not hardcode affiliate tracking links");
});

test("phase-2 calculator preview leaves keyboard focus alone until explicit submit", async () => {
  const browser = await read("src/phase2-calculator-browser.js");
  const segment = browser.split('function render({ userInitiated = false } = {}) {')[1]
    ?.split('} catch (error) {')[0];
  assert.ok(segment, "browser still has the guarded render path");
  assert.match(segment, /resultPanel\\.hidden = false;[\\s\\S]*?if \\(userInitiated\\) \\{\\s*resultPanel\\.focus\\(\\{ preventScroll: true \\}\\);/);
  assert.equal((segment.match(/resultPanel\\.focus\\(/g) || []).length, 1);
  for (const route of ["kalkulacky/dc-dc-nabijecka/index.html", "kalkulacky/jisteni-12v/index.html"]) {
    const html = await read(route);
    assert.match(html, /phase2-calculator-browser\\.js/);
  }
});
