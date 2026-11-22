import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { refreshCatalogProduct, recommendProducts } from "../src/products.js";
import { addVerifiedVictronChargingProfiles } from "../src/victron-orion-charging-profiles.js";

const evidenceUrl="https://www.victronenergy.com/dc-dc-converters/orion-tr-smart";
const variants=[
  ["sk","107361",12,24,10,24],
  ["pl","107361",12,24,10,24],
  ["sk","107371",24,24,12,36],
  ["pl","107371",24,24,12,36],
];

async function approvedOffer(market,id){
 const catalog=JSON.parse(await readFile(new URL("../data/products-"+market+".json",import.meta.url),"utf8"));
 const raw=catalog.products.find(p=>p.id==="padabo_"+market+":"+id);
 assert.ok(raw,"missing approved market SKU "+market+":"+id);
 return {catalog,raw};
}

test("four in-stock exact Orion 24V-output offers get reviewed lithium profiles",async()=>{
 for(const [market,id,starterV,houseV,amp,feedVoltage] of variants){
  const {catalog,raw}=await approvedOffer(market,id);
  assert.equal(catalog.sources["padabo_"+market].status,"ok");
  assert.equal(raw.available,true);
  assert.equal(raw.priceCurrency,market==="sk"?"EUR":"PLN");
  assert.equal(raw.specs.voltageV,feedVoltage);
  const refreshed=refreshCatalogProduct(raw);
  assert.equal(refreshed.specs.voltageV,houseV);
  assert.deepEqual(refreshed.specs.chargingInputVoltagesV,[starterV]);
  assert.deepEqual(refreshed.specs.chargingVoltagesV,[houseV]);
  assert.deepEqual(refreshed.specs.chargingBatteryTypes,["lifepo4","lead"]);
  assert.equal(refreshed.specs.chargingProfileEvidenceUrl,evidenceUrl);
  const setup={
   locale:market,systemVoltage:houseV,batteryType:"lifepo4",batteryAh:100,
   charging:{starterVoltage:starterV,dcDc:{suggestedCurrentAmps:8},shore:{}},
   inverterWatts:0,solarWatts:250,controllerAmps:20
  };
  assert.equal(recommendProducts([raw],setup,3,catalog.sources).dc_charger[0]?.product.id,raw.id);
  assert.deepEqual(recommendProducts([raw],setup,3,{[raw.merchant]:{status:"stale"}}).dc_charger,[]);
 }
});

test("manufacturer lithium evidence requires exact market model, stock, direction, specs and affiliate",async()=>{
 for(const [market,id,starterV,houseV,amp] of variants){
  const {raw}=await approvedOffer(market,id);
  const forged=[
   {...raw,id:raw.id+"-other"},
   {...raw,name:raw.name.replace("Smart","NonSmart")},
   {...raw,merchant:"invalid"},
   {...raw,available:false},
   {...raw,priceCurrency:"USD"},
   {...raw,productUrl:raw.productUrl+"/different"},
   {...raw,affiliateUrl:raw.affiliateUrl.replace("f34c86c8","wrong")},
   {...raw,affiliateUrl:raw.affiliateUrl.replace("desturl=","other=")},
   {...raw,affiliateUrl:raw.affiliateUrl.replace("a_bid=","bad_bid=")},
   {...raw,specs:{...raw.specs,currentA:amp+10}},
   {...raw,specs:{...raw.specs,chargingInputVoltagesV:[houseV===starterV?12:24]}},
   {...raw,specs:{...raw.specs,chargingVoltagesV:[12]}},
   {...raw,specs:{...raw.specs,voltageV:12}},
  ];
  for(const bad of forged){
   const out=addVerifiedVictronChargingProfiles(bad,bad.specs);
   assert.equal(out.chargingProfileEvidenceUrl,undefined,raw.id+":"+JSON.stringify(bad.name));
  }
 }
});

test("published SK and PL versioning retains core CZ Sunstone proof",async()=>{
 for(const market of ["sk","pl"]){
  const html=await readFile(new URL("../"+market+"/index.html",import.meta.url),"utf8");
  const app=await readFile(new URL("../src/app-"+market+".js",import.meta.url),"utf8");
  assert.ok(html.includes("app-"+market+".js?v=20261122-orion-24v1"));
  assert.ok(app.includes("products.js?v=20261122-orion-24v1"));
 }
 const products=await readFile(new URL("../src/products.js",import.meta.url),"utf8");
 assert.ok(products.includes("victron-orion-charging-profiles.js?v=20261122-orion-24v1"));
 const cz=await readFile(new URL("../index.html",import.meta.url),"utf8");
 assert.ok(cz.includes("app.js?v=20261122-sunstone200a1"));
});
