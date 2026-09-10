import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodeSetupQuery } from "../src/setup-url.js";
import { APPLIANCES } from "../src/catalog.js";

const SCENARIOS = [
  {
    path: "pruvodce/modelove-sestavy/vikend-v-karavanu/index.html",
    canonical: "https://mypowersetup.com/pruvodce/modelove-sestavy/vikend-v-karavanu/",
    expectedLoads: ["fridge", "lights", "phones", "pump"],
    expectedDays: "2",
    expectedSeason: "summer",
  },
  {
    path: "pruvodce/modelove-sestavy/rodinna-dovolena/index.html",
    canonical: "https://mypowersetup.com/pruvodce/modelove-sestavy/rodinna-dovolena/",
    expectedLoads: ["fridge", "lights", "phones", "tv", "pump"],
    expectedDays: "2",
    expectedSeason: "summer",
  },
  {
    path: "pruvodce/modelove-sestavy/prace-z-karavanu/index.html",
    canonical: "https://mypowersetup.com/pruvodce/modelove-sestavy/prace-z-karavanu/",
    expectedLoads: ["fridge", "lights", "phones", "laptop", "pump"],
    expectedDays: "2",
    expectedSeason: "shoulder",
  },
];

function extractPresetHref(html) {
  const match = html.match(/href="(\/\?loads=[^"]+#kalkulator)"/);
  assert.ok(match, "scenario must expose a prefilled calculator CTA");
  return match[1].replaceAll("&amp;", "&");
}

test("CZ scenario pages are canonical, indexable and carry valid calculator presets", () => {
  const allowedIds = APPLIANCES.map((item) => item.id);
  for (const scenario of SCENARIOS) {
    const html = readFileSync(scenario.path, "utf8");
    assert.match(html, new RegExp(`<link rel="canonical" href="${scenario.canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">`));
    assert.doesNotMatch(html, /noindex/i);
    assert.match(html, /utm_source=scenario_page/);

    const href = extractPresetHref(html);
    const parsed = new URL(href, "https://mypowersetup.com");
    const config = decodeSetupQuery(parsed.search, allowedIds);
    assert.ok(config, `${scenario.path} preset must decode`);
    assert.deepEqual(config.appliances.map((item) => item.id), scenario.expectedLoads);
    assert.equal(config.autonomyDays, scenario.expectedDays);
    assert.equal(config.season, scenario.expectedSeason);
    assert.equal(config.batteryType, "lifepo4");
    assert.equal(config.systemVoltage, "auto");
  }
});

test("scenario hub, sitemap and robots expose all landing pages", () => {
  const hub = readFileSync("pruvodce/modelove-sestavy/index.html", "utf8");
  const sitemap = readFileSync("sitemap-scenarios.xml", "utf8");
  const robots = readFileSync("robots.txt", "utf8");

  assert.match(robots, /Sitemap: https:\/\/mypowersetup\.com\/sitemap-scenarios\.xml/);
  for (const scenario of SCENARIOS) {
    const path = new URL(scenario.canonical).pathname;
    assert.ok(hub.includes(`href="${path}"`), `${path} must be linked from the scenario hub`);
    assert.ok(sitemap.includes(`<loc>${scenario.canonical}</loc>`), `${path} must be in the scenario sitemap`);
  }
});
