import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { addVerifiedVictronChargingProfiles } from "../src/victron-orion-charging-profiles.js";
import { recommendProducts, refreshCatalogProduct } from "../src/products.js";

const exact=[
  ["sk","padabo_sk:26963_28360","EUR"],
  ["pl","padabo_pl:26963_28360","PLN"],
];
const manufacturer="https://www.victronenergy.com/dc-dc-converters/orion-tr-smart-non-isolated";

test("source-approved Orion-Tr Smart 12/12-30 supports LiFePO4 in SK and PL purchase choices",async()=>{
 for(const [locale,id,currency] of exact){
  const catalog=JSON.parse(await readFile(new URL("../data/products-"+locale+".json",import.meta.url),"utf8"));
  const raw=catalog.products.find(p=>p.id===id);
  assert.ok(raw,id);assert.equal(raw.available,true,id);
  assert.equal(raw.priceCurrency,currency,id);
  assert.equal(catalog.sources[raw.merchant]?.status,"ok",id);
  const proof=refreshCatalogProduct(raw);
  assert.deepEqual(proof.specs.chargingBatteryTypes,["lifepo4","lead"],id);
  assert.equal(proof.specs.chargingProfileEvidenceUrl,manufacturer,id);
  const setup={
    locale,systemVoltage:12,batteryType:"lifepo4",
    charging:{starterVoltage:12,dcDc:{suggestedCurrentAmps:25},shore:{}},
    batteryAh:100,solarWatts:250,controllerAmps:20,inverterWatts:0,
  };
  assert.equal(recommendProducts([raw],setup,3,catalog.sources).dc_charger[0]?.product.id,id);
  assert.deepEqual(recommendProducts([raw],setup,3,{[raw.merchant]:{status:"stale"}}).dc_charger,[]);
 }
});

test("a wrong merchant, affiliate destination, market, variant, price currency or out-of-stock row cannot inherit lithium proof",async()=>{
 for(const [locale,id] of exact){
  const catalog=JSON.parse(await readFile(new URL("../data/products-"+locale+".json",import.meta.url),"utf8"));
  const raw=catalog.products.find(p=>p.id===id);
  const mutations=[
    {...raw,merchant:"padabo_bad"},
    {...raw,priceCurrency:"USD"},
    {...raw,productUrl:"https://wrong.example/other"},
    {...raw,name:raw.name+" 24/24"},
    {...raw,id:raw.id.replace("28360","28361")},
    {...raw,available:false},
    {...raw,affiliateUrl:raw.affiliateUrl.replace("f34c86c8","bad")},
    {...raw,affiliateUrl:raw.affiliateUrl.replace("desturl=","desturl2=")},
    {...raw,affiliateUrl:raw.affiliateUrl.replace("a_bid=","b_bid=")},
    {...raw,specs:{...raw.specs,currentA:60}},
  ];
  for(const altered of mutations){
    const result=addVerifiedVictronChargingProfiles(altered,altered.specs);
    assert.equal(result.chargingProfileEvidenceUrl,undefined,id+" "+altered.name);
  }
 }
});
