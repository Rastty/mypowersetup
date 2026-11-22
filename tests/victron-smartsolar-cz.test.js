import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { addVerifiedSmartSolarChargingProfiles } from "../src/victron-smartsolar-charging-profiles.js";
import { refreshCatalogProduct, recommendProducts } from "../src/products.js";

const specs = { currentA: 30, maxPvVocV: 100, systemVoltagesV: [12,24],
  chargingBatteryTypes: ["lead"], maxPvWattsBySystemVoltage: {12:440,24:880} };
const product = { id: "vselektro:victron-smartsolar-100-30",merchant:"vselektro",
  name:"Solární regulátor Victron Energy MPPT, SmartSolar - 100V/30A",
  category:"controller",categoryPath:"Solární regulátory | MPPT",verifiedAt:"2026-10-13",available:true,
  productUrl:"https://www.vselektro.eu/solarni-regulator-victron-energy-mppt-smartsolar-100v-30a/",
  affiliateUrl:"https://ehub.cz/system/scripts/click.php?a_aid=example&a_bid=example&desturl=x",
  specs };

test("manufacturer proof unlocks only the exact approved 100/30 SmartSolar SKU", () => {
  const verified = addVerifiedSmartSolarChargingProfiles(product, specs);
  assert.deepEqual(verified.chargingBatteryTypes, ["lifepo4","lead"]);
  assert.match(verified.chargingProfileEvidenceUrl, /^https:\/\/www\.victronenergy\.com\/media\/pg\/Manual_SmartSolar_MPPT_100-30/);
  for (const mutation of [
    {id:"other:victron-smartsolar-100-30"}, {merchant:"other"}, {verifiedAt:null},
    {name:product.name+" kit"}, {category:"inverter"},
  ]) assert.equal(addVerifiedSmartSolarChargingProfiles({...product,...mutation}, specs), specs);
  for (const badSpecs of [{...specs,currentA:10},{...specs,maxPvVocV:150},{...specs,systemVoltagesV:[24]}])
    assert.equal(addVerifiedSmartSolarChargingProfiles(product, badSpecs), badSpecs);
});

test("manufacturer-backed variants 100/20 and 100/50 keep only documented voltage limits", () => {
  for (const [suffix,current,voltages,manualName] of [
    ["20",20,[12,24,48],"75-10_up_to_100-20"],
    ["50",50,[12,24],"100-30__100-50"],
  ]) {
    const p={...product,id:`vselektro:victron-smartsolar-100-${suffix}`,name:`Solární regulátor Victron Energy MPPT, SmartSolar - 100V/${suffix}A`};
    const approved=addVerifiedSmartSolarChargingProfiles(p,{...specs,currentA:current,systemVoltagesV:voltages});
    assert.ok(approved.chargingBatteryTypes.includes("lifepo4"));
    assert.ok(approved.chargingProfileEvidenceUrl.includes(manualName));
    assert.equal(addVerifiedSmartSolarChargingProfiles(p,{...specs,currentA:current,systemVoltagesV:[12,24,36]}).chargingProfileEvidenceUrl, undefined);
  }
});

test("CZ product refresh preserves exact evidence and rejects explicit lead-only MPPT for lithium", () => {
  const refreshed=refreshCatalogProduct(product);
  assert.ok(refreshed.specs.chargingBatteryTypes.includes("lifepo4"));
  const setup={locale:"cs",batteryType:"lifepo4",batteryAh:100,systemVoltage:12,
    solarWatts:300,controllerAmps:25,inverterWatts:0,charging:{dcDc:{},shore:{}}};
  assert.deepEqual(recommendProducts([product],setup,3,{vselektro:{status:"ok"}}).controller.map(x=>x.product.id),[product.id]);
  const notVerified={...product,id:"vselektro:unknown-smartsolar",name:product.name+" variant",specs:{...specs}};
  assert.equal(recommendProducts([notVerified],setup,3,{vselektro:{status:"ok"}}).controller.length,0);
  assert.equal(recommendProducts([product],{...setup,controllerAmps:35},3,{vselektro:{status:"ok"}}).controller.length,0);
  assert.equal(recommendProducts([product],setup,3,{vselektro:{status:"stale"}}).controller.length,0);
});

test("Czech purchase plan links only source-backed SmartSolar manual and versioned browser",async()=>{
  const app=await readFile(new URL("../src/app.js", import.meta.url),"utf8");
  const html=await readFile(new URL("../index.html", import.meta.url),"utf8");
  assert.match(app,/function verifiedSmartSolarManualLink\(product\)/);
  assert.match(app,/product\?\.merchant !== "vselektro"/);
  assert.match(app,/category === "controller" \? verifiedSmartSolarManualLink\(product\)/);
  assert.match(html,/\/src\/app\.js\?v=20261122-bms-alternatives1/);
});
