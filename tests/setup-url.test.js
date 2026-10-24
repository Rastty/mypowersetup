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
  dcDcInputCableLength: 5.5,
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
    dcDcInputCableLength: 5.5,
    shoreChargeHours: 10,
    roofLength: 3.2,
    roofWidth: 1.4,
  });
});

test("setup URL uses the correct localized calculator", () => {
  assert.match(buildSetupUrl(config, "cs"), /^https:\/\/mypowersetup\.com\/\?loads=/);
  assert.match(buildSetupUrl(config, "sk"), /^https:\/\/mypowersetup\.com\/sk\/\?loads=/);
  assert.match(buildSetupUrl(config, "pl"), /^https:\/\/mypowersetup\.com\/pl\/\?loads=/);
  assert.match(buildSetupUrl(config, "hu"), /^https:\/\/mypowersetup\.com\/hu\/\?loads=/);
  assert.match(buildSetupUrl(config, "sk"), /#kalkulator$/);
});

test("decoder rejects an unknown or unsafe configuration", () => {
  assert.equal(decodeSetupQuery("?loads=unknown:2:1", ["fridge"]), null);
  assert.equal(decodeSetupQuery("?loads=fridge:25:1", ["fridge"]), null);
  assert.equal(decodeSetupQuery("?loads=fridge:2:1&voltage=230", ["fridge"]), null);
  assert.equal(decodeSetupQuery("?loads=fridge:2:1&voltage=48", ["fridge"]), null);
  assert.equal(decodeSetupQuery("?loads=fridge:2:1&drive=13", ["fridge"]), null);
  assert.equal(decodeSetupQuery("?loads=fridge:2:1&starter=48", ["fridge"]), null);
  assert.equal(decodeSetupQuery("?loads=fridge:2:1&dcdcCable=16", ["fridge"]), null);
  assert.equal(decodeSetupQuery("?loads=fridge:2:1&shore=25", ["fridge"]), null);
  assert.equal(decodeSetupQuery("?loads=fridge:2:1&roofL=3", ["fridge"]), null);
  assert.equal(decodeSetupQuery("?loads=fridge:2:1&roofL=3&roofW=5", ["fridge"]), null);
});

test("AGM configuration uses the calculator's lead identifier", () => {
  const decoded = decodeSetupQuery("?loads=fridge:24:1&battery=lead", ["fridge"]);
  assert.equal(decoded.batteryType, "lead");
  assert.equal(decodeSetupQuery("?loads=fridge:24:1&battery=agm", ["fridge"]), null);
});

test("shared calculator never silently drops invalid loads or duplicates", () => {
  const allowed = ["fridge", "notebook", "custom"];
  const invalid = [
    "?loads=fridge:24:1,unknown:2:1",
    "?loads=unknown:2:1,fridge:24:1",
    "?loads=fridge:24:1,fridge:2:1:extra",
    "?loads=fridge:24:1,fridge:2:1",
    "?loads=fridge:24:1,notebook:25:1",
    "?loads=fridge:24:1,notebook:2:0",
    "?loads=fridge:24:1,",
    "?loads=,fridge:24:1",
    "?loads=fridge:24:1,notebook:2:1:extra",
  ];
  for (const query of invalid) {
    assert.equal(decodeSetupQuery(query, allowed), null, query);
  }
  assert.deepEqual(
    decodeSetupQuery("?loads=fridge:24:1,notebook:2:1", allowed).appliances,
    [{ id: "fridge", hours: 24, quantity: 1 }, { id: "notebook", hours: 2, quantity: 1 }],
  );
});

test("custom appliance round-trips its bounded electrical data", () => {
  const customConfig = {
    ...config,
    appliances: [{
      id: "custom",
      selected: true,
      name: "Dieselové topení",
      watts: 42,
      hours: 6.5,
      quantity: 1,
      ac: false,
      surge: 2,
    }],
  };
  const decoded = decodeSetupQuery(encodeSetupQuery(customConfig), ["custom"]);
  assert.deepEqual(decoded.appliances, [{
    id: "custom",
    hours: 6.5,
    quantity: 1,
    name: "Dieselové topení",
    watts: 42,
    ac: false,
    surge: 2,
  }]);
});

test("decoder rejects incomplete or unsafe custom appliance data", () => {
  const base = "?loads=custom:2:1&customName=Topení&customAc=0&customSurge=1";
  assert.equal(decodeSetupQuery(base, ["custom"]), null);
  assert.equal(decodeSetupQuery(`${base}&customWatts=10001`, ["custom"]), null);
  assert.equal(decodeSetupQuery("?loads=custom:2:1&customName=Topení&customWatts=100&customAc=0&customSurge=3", ["custom"]), null);
});

test("shared calculator rejects repeated sizing fields instead of silently choosing the first", () => {
  const base = encodeSetupQuery(config);
  const allowed = ["fridge", "notebook", "tv", "custom"];
  const ambiguous = [
    "&loads=notebook%3A8%3A1",
    "&days=1",
    "&voltage=12",
    "&battery=lead",
    "&drive=12",
    "&starter=24",
    "&dcdcCable=15",
    "&shore=0",
    "&roofL=0.5",
    "&roofW=0.5",
    "&customWatts=500",
  ];
  for (const suffix of ambiguous) {
    assert.equal(decodeSetupQuery(base + suffix, allowed), null, suffix);
  }
  // An analytics campaign may add repeated unrelated UTM keys without changing
  // the electrical design. Only sizing-state duplicates must fail closed.
  assert.deepEqual(
    decodeSetupQuery(base + "&utm_source=one&utm_source=two", allowed),
    decodeSetupQuery(base, allowed),
  );
});

test("custom appliance rejects conflicting duplicate watts even when both values are valid", () => {
  const query = "?loads=custom:2:1&customName=Heating&customWatts=40&customWatts=4000&customAc=1&customSurge=2";
  assert.equal(decodeSetupQuery(query, ["custom"]), null);
});
