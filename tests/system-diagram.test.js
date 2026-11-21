import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildSystemDiagram } from "../src/system-diagram.js";

const baseResult = {
  systemVoltage: 12,
  solarWatts: 400,
  controllerAmps: 40,
  batteryAh: 200,
  inverterWatts: 1200,
};

test("diagram renders the calculated Czech system without inventing fuse values", () => {
  const html = buildSystemDiagram(baseResult, "cs");
  assert.match(html, /400 Wp/);
  assert.match(html, /40 A/);
  assert.match(html, /200 Ah · 12 V/);
  assert.match(html, /1200 W/);
  assert.match(html, /DC jištění a odpojení/);
  assert.match(html, /hodnotu jištění určete/);
  assert.doesNotMatch(html, /pojistka[^<]*\d+\s*A/i);
});

test("diagram omits the inverter branch for a DC-only setup", () => {
  const html = buildSystemDiagram({ ...baseResult, inverterWatts: 0 }, "cs");
  assert.match(html, /větev měniče není potřeba/);
  assert.doesNotMatch(html, /diagram-node-(?:inverter|ac)/);
});

test("mixed DC and AC loads have independently protected branches, not an AC-only diagram", () => {
  const html = buildSystemDiagram({
    ...baseResult,
    applianceRows: [{ name: "Fridge", ac: false }, { name: "Coffee maker", ac: true }],
  }, "cs");
  assert.match(html, /diagram-path-dc/);
  assert.match(html, /diagram-path-ac/);
  assert.match(html, /DC spotřebiče/);
  assert.match(html, /Měnič s čistým sinusem/);
  assert.equal((html.match(/diagram-node-protection/g) || []).length, 2);
  assert.doesNotMatch(html, /převodník 24→12/);
});

test("24 V mixed-load diagram checks DC rating and does not invent a converter in the basket", () => {
  for (const [locale, text] of [
    ["cs", "Ověřit napětí"], ["sk", "Overiť napätie"],
    ["pl", "Sprawdź napięcie"], ["hu", "Feszültségellenőrzés"],
  ]) {
    const html = buildSystemDiagram({
      ...baseResult, systemVoltage: 24,
      applianceRows: [{ ac: false }, { ac: true }],
    }, locale);
    assert.match(html, new RegExp(text), locale);
    assert.match(html, /24→12 V/, locale);
    assert.match(html, /diagram-node-dc/, locale);
    assert.match(html, /diagram-node-ac/, locale);
    assert.doesNotMatch(html, /diagram-node-converter/, locale);
  }
  const acOnly = buildSystemDiagram({ ...baseResult, systemVoltage: 24, applianceRows: [{ ac: true }] }, "cs");
  assert.doesNotMatch(acOnly, /diagram-path-dc/);
  assert.doesNotMatch(acOnly, /převodník 24→12/);
});

test("diagram has localized Slovak safety copy", () => {
  const html = buildSystemDiagram(baseResult, "sk");
  assert.match(html, /Solárne panely/);
  assert.match(html, /DC istenie a odpojenie/);
  assert.match(html, /hodnotu istenia určite/);
});

test("diagram has localized Polish safety copy", () => {
  const html = buildSystemDiagram(baseResult, "pl");
  assert.match(html, /Panele fotowoltaiczne/);
  assert.match(html, /Zabezpieczenie i odłączanie DC/);
  assert.match(html, /wartość zabezpieczenia dobierz/);
});

test("diagram has localized Hungarian safety copy", () => {
  const html = buildSystemDiagram(baseResult, "hu");
  assert.match(html, /Napelemek/);
  assert.match(html, /Tiszta szinuszos inverter/);
  assert.match(html, /telepítési feltételek alapján/);
});

test("diagram refuses an incomplete result", () => {
  assert.equal(buildSystemDiagram({ systemVoltage: 12 }, "cs"), "");
});

test("all core markets serve the updated mixed-load diagram rather than cached modules", async () => {
  for (const [market, app] of [["cs", "app.js"], ["sk", "app-sk.js"], ["pl", "app-pl.js"], ["hu", "app-hu.js"]]) {
    const source = await readFile(new URL(`../src/${app}`, import.meta.url), "utf8");
    assert.match(source, /system-diagram\.js\?v=20261119-diagram-dc-ac2/, market);
    const htmlPath = market === "cs" ? "../index.html" : `../${market}/index.html`;
    const html = await readFile(new URL(htmlPath, import.meta.url), "utf8");
    const entry = market === "cs" ? "app.js" : market === "hu" ? "app-hu-browser.js" : `app-${market}.js`;
    assert.ok(html.includes(`/src/${entry}?v=${["cs", "sk", "pl"].includes(market) ? "20261121-caravan-plan1" : "20261119-voltage-guide1"}`), market);
  }
  const huBrowser = await readFile(new URL("../src/app-hu-browser.js", import.meta.url), "utf8");
  assert.match(huBrowser, /app-hu\.js\?v=20261119-diagram-dc-ac2/);
});
