import test from "node:test";
import assert from "node:assert/strict";
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

test("diagram refuses an incomplete result", () => {
  assert.equal(buildSystemDiagram({ systemVoltage: 12 }, "cs"), "");
});
