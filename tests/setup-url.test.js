import test from "node:test";
import assert from "node:assert/strict";
import { buildSetupUrl, decodeSetupQuery, encodeSetupQuery } from "../src/setup-url.js";

const config = {
  appliances: [
    { id: "fridge", selected: true, hours: 24, quantity: 1 },
    { id: "notebook", selected: true, hours: 4.05, quantity: 2 },
    { id: "tv", selected: false, hours: 3, quantity: 1 },
  ],
  autonomyDays: "3",
  season: "shoulder",
  batteryType: "lifepo4",
  systemVoltage: "24",
  inverterCableLength: 1.5,
  driveHoursPerDay: 2.5,
  starterVoltage: 12,
  shoreChargeHours: 10,
  roofLength: 3.2,
  roofWidth: 1.4,
};

test("setup query round-trips selected appliances and choices", () => {
  const query = encodeSetupQuery(config);
  const decoded = decodeSetupQuery(query, ["fridge", "notebook", "tv"]);
  assert.deepEqual(decoded, {
    appliances: [
      { id: "fridge", hours: 24, quantity: 1 },
      { id: "notebook", hours: 4.05, quantity: 2 },
    ],
    autonomyDays: "3",
    season: "shoulder",
    batteryType: "lifepo4",
    systemVoltage: "24",
    inverterCableLength: 1.5,
    driveHoursPerDay: 2.5,
    starterVoltage: 12,
    shoreChargeHours: 10,
    roofLength: 3.2,
    roofWidth: 1.4,
  });
});

test("setup URL uses the correct localized calculator", () => {
  assert.match(buildSetupUrl(config, "cs"), /^https:\/\/mypowersetup\.com\/\?loads=/);
  assert.match(buildSetupUrl(config, "sk"), /^https:\/\/mypowersetup\.com\/sk\/\?loads=/);
  assert.match(buildSetupUrl(config, "sk"), /#kalkulator$/);
});

test("decoder rejects an unknown or unsafe configuration", () => {
  assert.equal(decodeSetupQuery("?loads=unknown:2:1", ["fridge"]), null);
  assert.equal(decodeSetupQuery("?loads=fridge:25:1", ["fridge"]), null);
  assert.equal(decodeSetupQuery("?loads=fridge:2:1&voltage=230", ["fridge"]), null);
  assert.equal(decodeSetupQuery("?loads=fridge:2:1&voltage=48", ["fridge"]), null);
  assert.equal(decodeSetupQuery("?loads=fridge:2:1&drive=13", ["fridge"]), null);
  assert.equal(decodeSetupQuery("?loads=fridge:2:1&starter=48", ["fridge"]), null);
  assert.equal(decodeSetupQuery("?loads=fridge:2:1&shore=25", ["fridge"]), null);
  assert.equal(decodeSetupQuery("?loads=fridge:2:1&roofL=3", ["fridge"]), null);
  assert.equal(decodeSetupQuery("?loads=fridge:2:1&roofL=3&roofW=5", ["fridge"]), null);
});

test("AGM configuration uses the calculator's lead identifier", () => {
  const decoded = decodeSetupQuery("?loads=fridge:24:1&battery=lead", ["fridge"]);
  assert.equal(decoded.batteryType, "lead");
  assert.equal(decodeSetupQuery("?loads=fridge:24:1&battery=agm", ["fridge"]), null);
});

test("decoder keeps valid loads and drops malformed extras", () => {
  const decoded = decodeSetupQuery("?loads=fridge:24:1,unknown:2:1,fridge:2:1:extra", ["fridge"]);
  assert.deepEqual(decoded.appliances, [{ id: "fridge", hours: 24, quantity: 1 }]);
});
