import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { refreshCatalogProduct, recommendProducts } from "../src/products.js";
import { addVerifiedVictronChargingProfiles } from "../src/victron-orion-charging-profiles.js";

const models = Object.freeze([
  { id: "svetkaravanu:26963_28360", input: 12, output: 12, current: 30, name: "Nabíječka Victron Energy Orion–Tr Smart DC–DC neizolovaná varianta 12/12 V, 30 A", source: "https://www.victronenergy.com/dc-dc-converters/orion-tr-smart-non-isolated" },
  { id: "svetkaravanu:107361", input: 12, output: 24, current: 10, name: "DC-DC nabíječka Victron Energy Orion-Tr Smart 12/24-10A 240 W izolovaná", source: "https://www.victronenergy.com/dc-dc-converters/orion-tr-smart" },
  { id: "svetkaravanu:107371", input: 24, output: 24, current: 12, name: "DC-DC nabíječka Victron Energy Orion-Tr Smart 24/24-12A 280 W izolovaná", source: "https://www.victronenergy.com/dc-dc-converters/orion-tr-smart" },
]);
async function realCzCatalog() {
  return JSON.parse(await readFile(new URL("../data/products.json", import.meta.url), "utf8"));
}
function setup({input, output, current}) {
  return {
    locale: "cs", systemVoltage: output, batteryType: "lifepo4", batteryAh: 100,
    solarWatts: 250, controllerAmps: 20, inverterWatts: 0,
    charging: {starterVoltage: input, dcDc: {suggestedCurrentAmps: current === 30 ? 15 : 8}, shore: {}},
  };
}

test("three exact approved Czech Orion variants are manufacturer-backed and selectable in real CZ catalog", async () => {
  const catalog = await realCzCatalog();
  assert.equal(catalog.sources.svetkaravanu?.status, "ok");
  for (const model of models) {
    const raw = catalog.products.find(p => p.id === model.id);
    assert.ok(raw, model.id);
    assert.equal(raw.merchant, "svetkaravanu", model.id);
    assert.equal(raw.name, model.name, model.id);
    assert.equal(raw.category, "dc_charger", model.id);
    assert.equal(raw.available, true, model.id);
    assert.equal(raw.priceCurrency, "CZK", model.id);
    assert.ok(raw.priceCzk > 0, model.id);
    const profile = refreshCatalogProduct(raw);
    assert.equal(profile.specs.voltageV, model.output, model.id);
    assert.equal(profile.specs.currentA, model.current, model.id);
    assert.deepEqual(profile.specs.chargingInputVoltagesV, [model.input], model.id);
    assert.deepEqual(profile.specs.chargingVoltagesV, [model.output], model.id);
    assert.deepEqual(profile.specs.chargingBatteryTypes, ["lifepo4", "lead"], model.id);
    assert.equal(profile.specs.chargingProfileEvidenceUrl, model.source, model.id);
    const offer = recommendProducts([raw], setup(model), 3, catalog.sources).dc_charger;
    assert.equal(offer[0]?.product?.id, model.id, model.id);
    assert.deepEqual(recommendProducts([raw], setup(model), 3, {
      svetkaravanu: {status: "stale"}
    }).dc_charger, [], model.id);
  }
});

test("CZ Orion proof fails closed for wrong identity, seller, stock, price, affiliate and technical direction", async () => {
  const catalog = await realCzCatalog();
  for(const model of models) {
    const raw = catalog.products.find(p => p.id === model.id);
    assert.ok(raw);
    const forged = [
      {...raw, id:raw.id+"-other"},
      {...raw, merchant:"unknown"},
      {...raw, name:raw.name+" wrong variant"},
      {...raw, productUrl:raw.productUrl+"/other"},
      {...raw, available:false},
      {...raw, available:null},
      {...raw, staleSource:true},
      {...raw, priceCzk:0},
      {...raw, priceCurrency:"EUR"},
      {...raw, affiliateUrl:raw.affiliateUrl.replace("f34c86c8","bad")},
      {...raw, affiliateUrl:raw.affiliateUrl.replace("38137ac4","other")},
      {...raw, affiliateUrl:raw.affiliateUrl.replace("desturl=","extra=")},
      {...raw, specs:{...raw.specs,currentA:model.current+1}},
      {...raw, specs:{...raw.specs,chargingInputVoltagesV:[model.input===12?24:12]}},
      {...raw, specs:{...raw.specs,chargingVoltagesV:[model.output===12?24:12]}},
      {...raw, specs:{...raw.specs,voltageV:model.output===12?24:12}},
    ];
    for (const bad of forged) {
      const evidence = addVerifiedVictronChargingProfiles(bad, bad.specs);
      assert.equal(evidence.chargingProfileEvidenceUrl, undefined, model.id + " " + bad.name);
    }
  }
});
