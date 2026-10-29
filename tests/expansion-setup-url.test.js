import test from "node:test";
import assert from "node:assert/strict";
import { buildExpansionSetupUrl, decodeExpansionSetupQuery, encodeExpansionSetupQuery } from "../src/expansion-setup-url.js";

const config = Object.freeze({
  appliances: [
    { id: "fridge", selected: true },
    { id: "lights", selected: true },
    { id: "pump", selected: false },
    { id: "laptop", selected: true },
  ],
  autonomyDays: "3",
  season: "shoulder",
  batteryType: "lifepo4",
  systemVoltage: "12",
});

const allowedIds = ["fridge", "lights", "pump", "laptop", "tv", "coffee"];

test("expansion setup query round-trips only calculator sizing state", () => {
  const query = encodeExpansionSetupQuery(config);
  const decoded = decodeExpansionSetupQuery(query, allowedIds);
  assert.deepEqual([...decoded.applianceIds], ["fridge", "lights", "laptop"]);
  assert.equal(decoded.autonomyDays, "3");
  assert.equal(decoded.season, "shoulder");
  assert.equal(decoded.batteryType, "lifepo4");
  assert.equal(decoded.systemVoltage, "12");
  assert.doesNotMatch(query, /utm_|affiliate|merchant/i);
});

test("expansion setup URLs use the correct public market route and calculator anchor", () => {
  assert.match(buildExpansionSetupUrl(config, "pt"), /^https:\/\/mypowersetup\.com\/pt\/\?loads=/);
  assert.match(buildExpansionSetupUrl(config, "ro"), /^https:\/\/mypowersetup\.com\/ro\/\?loads=/);
  assert.match(buildExpansionSetupUrl(config, "si"), /^https:\/\/mypowersetup\.com\/si\/\?loads=/);
  assert.match(buildExpansionSetupUrl(config, "pt"), /#calculator-preview$/);
});

test("expansion setup decoder fails closed on unknown loads and invalid sizing choices", () => {
  assert.equal(decodeExpansionSetupQuery("?loads=fridge,unknown&days=2", allowedIds), null);
  assert.equal(decodeExpansionSetupQuery("?loads=fridge&days=9", allowedIds), null);
  assert.equal(decodeExpansionSetupQuery("?loads=fridge&season=monsoon", allowedIds), null);
  assert.equal(decodeExpansionSetupQuery("?loads=fridge&battery=unsafe", allowedIds), null);
  assert.equal(decodeExpansionSetupQuery("?loads=fridge&voltage=48", allowedIds), null);
});

test("expansion setup URL rejects unsupported markets", () => {
  assert.throws(() => buildExpansionSetupUrl(config, "xx"), /EXPANSION_SETUP_MARKET_UNSUPPORTED/);
});


test("expansion shared electrical sizing never accepts repeated query keys", () => {
  const base = encodeExpansionSetupQuery(config);
  for (const suffix of [
    "&loads=tv", "&days=1", "&season=winter", "&battery=lead",
    "&voltage=24",
  ]) {
    assert.equal(decodeExpansionSetupQuery(base + suffix, allowedIds), null, suffix);
  }
  assert.equal(decodeExpansionSetupQuery(base + "&usage=fridge:24:1&usage=fridge:2:1", allowedIds), null);
  // Unrelated campaign tags are not electrical inputs.
  assert.deepEqual(
    decodeExpansionSetupQuery(base + "&utm_source=a&utm_source=b", allowedIds),
    decodeExpansionSetupQuery(base, allowedIds),
  );
});

test("expansion shared load tokens and usage records cannot be silently discarded", () => {
  for (const query of [
    "?loads=fridge,fridge",
    "?loads=fridge,",
    "?loads=,fridge",
    "?loads=fridge,,lights",
    "?loads=fridge&usage=",
    "?loads=fridge&usage=fridge:2:1;",
    "?loads=fridge&usage=;fridge:2:1",
    "?loads=fridge&usage=fridge:2:1;;",
  ]) {
    assert.equal(decodeExpansionSetupQuery(query, allowedIds), null, query);
  }
  assert.deepEqual(
    decodeExpansionSetupQuery("?loads=fridge,lights&usage=fridge:24:1;lights:4:2", allowedIds).applianceState,
    { fridge: { hours: 24, quantity: 1 }, lights: { hours: 4, quantity: 2 } },
  );
});

test("expansion custom load rejects conflicting duplicate electrical measurements", () => {
  const base = "?loads=custom&custom_name=Pump&custom_watts=45&custom_hours=2&custom_qty=1&custom_ac=0&custom_surge=1";
  assert.ok(decodeExpansionSetupQuery(base, [...allowedIds, "custom"]));
  for (const suffix of [
    "&custom_name=Other", "&custom_watts=4500", "&custom_hours=20",
    "&custom_qty=20", "&custom_ac=1", "&custom_surge=5",
  ]) {
    assert.equal(decodeExpansionSetupQuery(base + suffix, [...allowedIds, "custom"]), null, suffix);
  }
});
