import test from "node:test";
import assert from "node:assert/strict";
import { buildResultShareText, copyText } from "../src/share.js";

const result = {
  dailyWh: 1250,
  batteryAh: 220,
  systemVoltage: 12,
  batteryLabel: "LiFePO4",
  solarWatts: 480,
  inverterWatts: 1200,
  controllerAmps: 50,
};

test("Czech share summary contains useful design values and canonical URL", () => {
  const text = buildResultShareText(result, "cs");
  assert.match(text, /MyPowerSetup — orientační návrh/);
  assert.match(text, /Denní spotřeba: 1,25 kWh/);
  assert.match(text, /Baterie: 220 Ah \(12 V, LiFePO4\)/);
  assert.match(text, /Solární panely: 480 Wp/);
  assert.match(text, /Měnič: 1200 W/);
  assert.match(text, /https:\/\/mypowersetup\.com\//);
});

test("Slovak share summary is localized and handles a DC-only setup", () => {
  const text = buildResultShareText({ ...result, inverterWatts: 0 }, "sk");
  assert.match(text, /MyPowerSetup — orientačný návrh/);
  assert.match(text, /Denná spotreba: 1,25 kWh/);
  assert.match(text, /Menič: nie je potrebný/);
  assert.match(text, /https:\/\/mypowersetup\.com\/sk\//);
});

test("Polish share summary is localized and uses the future Polish route", () => {
  const text = buildResultShareText({ ...result, inverterWatts: 0 }, "pl");
  assert.match(text, /MyPowerSetup — orientacyjny projekt/);
  assert.match(text, /Dzienne zużycie energii: 1,25 kWh/);
  assert.match(text, /Przetwornica: nie jest potrzebna/);
  assert.match(text, /https:\/\/mypowersetup\.com\/pl\//);
});

test("Hungarian share summary is localized for the private market foundation", () => {
  const text = buildResultShareText({ ...result, inverterWatts: 0 }, "hu");
  assert.match(text, /MyPowerSetup — tájékoztató rendszerjavaslat/);
  assert.match(text, /Napi energiafogyasztás: 1,25 kWh/);
  assert.match(text, /Inverter: nem szükséges/);
  assert.match(text, /https:\/\/mypowersetup\.com\/hu\//);
});

for (const [language, title, route] of [
  ["pt", "dimensionamento indicativo", "/pt/"],
  ["ro", "dimensionare orientativă", "/ro/"],
  ["si", "informativni izračun", "/si/"],
]) {
  test(`${language} expansion share summary is localized and keeps a supplied prefilled URL`, () => {
    const resultUrl = `https://mypowersetup.com${route}?loads=fridge,lights&days=2#calculator-preview`;
    const text = buildResultShareText(result, language, resultUrl);
    assert.match(text, new RegExp(title));
    assert.ok(text.includes(resultUrl));
    assert.match(text, /220 Ah/);
    assert.match(text, /480 Wp/);
  });
}

test("copyText prefers the Clipboard API", async () => {
  let copied = "";
  const success = await copyText("návrh", {
    navigator: { clipboard: { writeText: async (text) => { copied = text; } } },
  });
  assert.equal(success, true);
  assert.equal(copied, "návrh");
});

test("copyText falls back to execCommand", async () => {
  const textarea = {
    value: "",
    style: {},
    setAttribute() {},
    select() {},
    remove() {},
  };
  const success = await copyText("zostava", {
    document: {
      body: { append(node) { assert.equal(node, textarea); } },
      createElement(tag) { assert.equal(tag, "textarea"); return textarea; },
      execCommand(command) { assert.equal(command, "copy"); return true; },
    },
  });
  assert.equal(success, true);
  assert.equal(textarea.value, "zostava");
});
