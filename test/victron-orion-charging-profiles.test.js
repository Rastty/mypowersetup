import test from "node:test";
import assert from "node:assert/strict";
import { addVerifiedVictronChargingProfiles } from "../src/victron-orion-charging-profiles.js";
import { refreshCatalogProduct } from "../src/products.js";

const profiles = [
  ["padabo_sk:101357","padabo_sk","DC-DC neizolovaná nabíjačka Victron Energy Orion XS 12/12-50 A",50],
  ["padabo_pl:101357","padabo_pl","Nieizolowana ładowarka DC-DC Victron Energy Orion XS 12/12-50 A",50],
  ["padabo_sk:26963_28360","padabo_sk","Nabíjačka Victron Energy Orion-Tr Smart DC-DC neizolovaná variant 12/12 V, 30 A",30],
  ["padabo_pl:26963_28360","padabo_pl","Ładowarka Victron Energy Orion-Tr Smart DC-DC nieizolowana wersja 12/12 V, 30 A",30],
];

for (const [id, merchant, name, current] of profiles) {
  test(`exact approved ${id} offers manufacturer-backed LiFePO4 and lead charging`, () => {
    const local = id.endsWith(":26963_28360") ? {
      priceCurrency: merchant === "padabo_sk" ? "EUR" : "PLN",
      productUrl: merchant === "padabo_sk"
        ? "https://www.padabo.sk/nabijacka-victron-energy-orion-tr-smart-dc-dc-neizolovana_z26963/"
        : "https://www.padabo.pl/ladowarka-victron-energy-orion-tr-smart-dc-dc-nieizolowana_z26963/",
    } : {};
    const campaign=merchant === "padabo_sk" ? "7aed5c13" : "95d61abf";
    const result = refreshCatalogProduct({
      ...local,
      ...(local.productUrl ? { affiliateUrl: "https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=" + campaign + "&desturl=" + encodeURIComponent(local.productUrl) } : {}),
      id, merchant, name, category: "dc_charger",
      categoryPath:"Elektro pre karavany | Nabíjačky DC-DC",
      description:"", available:true,
      specs:{
        currentA:current,
        chargingVoltagesV:[12],
        chargingInputVoltagesV:[12],
        chargingBatteryTypes:[],
      }
    });
    assert.deepEqual(result.specs.chargingBatteryTypes,["lifepo4","lead"]);
    assert.match(result.specs.chargingProfileEvidenceUrl,/victronenergy\.com/);
  });
}

test("no inference from family name, wrong merchant SKU, voltage, current or category", () => {
  const product={id:"padabo_pl:101357",merchant:"padabo_pl",
    category:"dc_charger",name:"Nieizolowana ładowarka DC-DC Victron Energy Orion XS 12/12-50 A"};
  const specs={currentA:50,chargingVoltagesV:[12],chargingInputVoltagesV:[12],chargingBatteryTypes:[]};
  for (const bad of [
    {id:"padabo_pl:101358"}, {merchant:"padabo_sk"}, {name:"Orion XS 12/12-70 A"},
    {category:"shore_charger"},
  ]) assert.deepEqual(addVerifiedVictronChargingProfiles({...product,...bad},specs),specs);
  for (const bad of [
    {currentA:70}, {chargingVoltagesV:[24]},{chargingInputVoltagesV:[24]},
    {chargingVoltagesV:[12,24]},
  ]) assert.deepEqual(addVerifiedVictronChargingProfiles(product,{...specs,...bad}),{...specs,...bad});
});
