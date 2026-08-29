import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateSetup } from "../src/engine.js";
import { publicizeHungarianHtml } from "../src/publication-hu.js";
import { injectHungarianSystemGuideLink } from "../src/system-guide-link-hu.js";
import {
  HU_SYSTEM_VOLTAGE_GUIDE_ROUTE,
  renderHungarianSystemVoltageGuide,
} from "../src/system-voltage-guide-hu.js";
import { renderHungarianGuide } from "../src/guides-hu.js";

test("Hungarian voltage guide stays private before launch and becomes canonical only through publicizer", async () => {
  const privateHtml = renderHungarianSystemVoltageGuide();
  assert.match(privateHtml, /<html lang="hu">/);
  assert.match(privateHtml, /noindex,nofollow,noarchive/);
  assert.match(privateHtml, /2,4 kWh/);
  assert.match(privateHtml, /1,2 kW/);
  assert.match(privateHtml, /Balaton/);
  assert.match(privateHtml, /nem általános villamos szabvány/);
  await assert.rejects(readFile(`${HU_SYSTEM_VOLTAGE_GUIDE_ROUTE.slice(1)}index.html`, "utf8"));

  const publicHtml = publicizeHungarianHtml(privateHtml, HU_SYSTEM_VOLTAGE_GUIDE_ROUTE);
  assert.doesNotMatch(publicHtml, /noindex/);
  assert.match(publicHtml, new RegExp(`rel="canonical" href="https://mypowersetup\\.com${HU_SYSTEM_VOLTAGE_GUIDE_ROUTE.replaceAll("/", "\\/")}"`));
});

test("Hungarian guide hub gains system and voltage links only through launch injection", () => {
  const privateHub = renderHungarianGuide("hub");
  assert.doesNotMatch(privateHub, /12 V vagy 24 V döntési útmutató/);
  const launchHub = injectHungarianSystemGuideLink(privateHub);
  assert.match(launchHub, /Teljes lakóautó-kapcsolási útmutató/);
  assert.match(launchHub, /12 V vagy 24 V döntési útmutató/);
  assert.match(launchHub, new RegExp(HU_SYSTEM_VOLTAGE_GUIDE_ROUTE.replaceAll("/", "\\/")));
});

test("documented 12/24 V threshold remains aligned with calculator engine", () => {
  const base = { locale: "hu", systemVoltage: "auto", season: "summer", batteryType: "lifepo4", autonomyDays: 1 };
  const small = calculateSetup({
    ...base,
    appliances: [{ selected: true, name: "Hűtő", watts: 50, hours: 8, quantity: 1, ac: false }],
  });
  assert.equal(small.systemVoltage, 12);

  const largeBattery = calculateSetup({
    ...base,
    autonomyDays: 2,
    appliances: [{ selected: true, name: "Napi DC terhelés", watts: 100, hours: 10, quantity: 1, ac: false }],
  });
  assert.ok(largeBattery.batteryWh > 2400);
  assert.equal(largeBattery.systemVoltage, 24);

  const largeInverter = calculateSetup({
    ...base,
    appliances: [{ selected: true, name: "AC készülék", watts: 1300, hours: 0.1, quantity: 1, ac: true, surge: 1 }],
  });
  assert.ok(largeInverter.inverterWatts > 1200);
  assert.equal(largeInverter.systemVoltage, 24);
});
