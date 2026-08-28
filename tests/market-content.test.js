import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { MARKET_CONTENT, marketSolarScenarios, requiredBatteryAh, requiredSolarWp } from "../src/market-content.js";
import { renderHungarianGuide } from "../src/guides-hu.js";

const solarPages = {
  cs: "pruvodce/kolik-w-solarnich-panelu/index.html",
  sk: "sk/sprievodca/kolko-w-solarnych-panelov/index.html",
  pl: "pl/poradnik/ile-wat-paneli-solarnych-do-kampera/index.html",
};

test("market scenarios use the same conservative solar formula as the calculator", () => {
  assert.equal(requiredSolarWp(600, 4.5), 205);
  assert.equal(requiredSolarWp(500, 4.5), 171);
  assert.equal(requiredSolarWp(650, 3), 333);
  assert.equal(requiredSolarWp(850, 3), 435);
});

test("market battery scenarios use the shared reserve and chemistry limits", () => {
  assert.equal(requiredBatteryAh(600, 2, "lifepo4", 12), 144);
  assert.equal(requiredBatteryAh(600, 2, "lead", 12), 230);
  assert.equal(requiredBatteryAh(450, 2, "lifepo4", 12), 108);
  assert.equal(requiredBatteryAh(900, 2, "lifepo4", 12), 216);
});

test("every localization has distinct terminology and two quantified local scenarios", () => {
  assert.deepEqual(Object.keys(MARKET_CONTENT), ["cs", "sk", "pl", "hu"]);
  const labels = [];
  for (const [locale, market] of Object.entries(MARKET_CONTENT)) {
    assert.ok(market.primaryTerms.length >= 2, `${locale} terminology`);
    const scenarios = marketSolarScenarios(locale);
    assert.equal(scenarios.length, 2);
    assert.equal(market.batteryScenarios.length, 2);
    for (const scenario of scenarios) {
      assert.ok(scenario.requiredWp >= 150);
      labels.push(scenario.label);
    }
  }
  assert.equal(new Set(labels).size, labels.length, "local scenarios must not be translated duplicates");
});

test("battery guides contain distinct local scenarios and an existing-setup decision", async () => {
  const files = {
    cs: "pruvodce/kapacita-baterie-do-karavanu/index.html",
    sk: "sk/sprievodca/kapacita-baterie-do-karavanu/index.html",
    pl: "pl/poradnik/pojemnosc-akumulatora-do-kampera/index.html",
  };
  for (const [locale, file] of Object.entries(files)) {
    const html = await readFile(file, "utf8");
    for (const scenario of MARKET_CONTENT[locale].batteryScenarios) assert.ok(html.includes(scenario.label));
    assert.match(html, /100\s?Ah/);
  }
  const hungarian = renderHungarianGuide("battery");
  for (const scenario of MARKET_CONTENT.hu.batteryScenarios) assert.ok(hungarian.includes(scenario.label));
});

test("published solar guides contain their market scenarios and official location check", async () => {
  for (const [locale, file] of Object.entries(solarPages)) {
    const html = await readFile(file, "utf8");
    for (const scenario of MARKET_CONTENT[locale].solarScenarios) assert.ok(html.includes(scenario.label));
    assert.ok(html.includes("joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis"));
  }
});

test("private Hungarian solar guide contains Hungarian scenarios and PVGIS guidance", () => {
  const html = renderHungarianGuide("solar");
  for (const scenario of MARKET_CONTENT.hu.solarScenarios) assert.ok(html.includes(scenario.label));
  assert.ok(html.includes("PVGIS"));
  assert.ok(html.includes("joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis"));
});
