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
