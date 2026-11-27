import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { refreshCatalogProduct,recommendProducts } from "../src/products.js";
import { dcdcValueNote } from "../src/reviewed-dcdc-value-profiles.js";
import { buildProductPackages } from "../src/packages.js";
import { assessRecommendationCoverage } from "../src/recommendation-coverage.js";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";
const cat=l=>readFile(new URL("../data/products"+(l==="cs"?"":"-"+l)+".json",import.meta.url),"utf8").then(JSON.parse);
const setup=(locale,input,output,amps)=>({locale,systemVoltage:output,batteryType:"lifepo4",batteryAh:200,
 inverterWatts:0,solarWatts:190,controllerAmps:20,dailyWh:1000,autonomyDays:1,applianceRows:[],
 charging:{starterVoltage:input,dcDc:{enabled:true,suggestedCurrentAmps:amps},shore:{}}});
const cases=[
 ["cs","svetkaravanu:106299",12,12,60],["sk","padabo_sk:106299",12,12,60],["pl","padabo_pl:106299",12,12,60],
 ["cs","svetkaravanu:101357",12,12,50],["cs","solarimport:E7477",24,12,30],["cs","batterycz:E7477",24,12,30],
 ["cs","solarimport:E8959",24,12,20],["cs","batterycz:E8959",24,12,20],["cs","batterycz:E7487",12,24,10],
];
test("nine exact local DC-DC offers have manufacturer-backed lithium charging and strict voltage direction",async()=>{
 for(const [locale,id,input,output,amps] of cases){
  const c=await cat(locale),raw=c.products.find(p=>p.id===id);assert.ok(raw,id);
  if(c.sources[raw.merchant]?.status!=="ok"||raw.available!==true)continue;
  const p=refreshCatalogProduct(raw);
  assert.ok(p.specs.chargingProfileEvidenceUrl,id);
  assert.equal(p.specs.voltageV,output,id);
  assert.equal(p.specs.currentA,amps,id);
  assert.deepEqual(p.specs.chargingBatteryTypes,["lifepo4","lead"],id);
  assert.equal(p.specs.smartAlternatorCompatible,true,id);
  assert.match(dcdcValueNote(p,locale),new RegExp(amps+" A"));
  const inputSetup=setup(locale,input,output,amps);
  assert.equal(recommendProducts([raw],inputSetup,3,c.sources).dc_charger[0]?.product.id,id);
  assert.equal(recommendProducts([raw],setup(locale,input===12?24:12,output,amps),3,c.sources).dc_charger.length,0);
  assert.equal(recommendProducts([raw],setup(locale,input,output===12?24:12,amps),3,c.sources).dc_charger.length,0);
  assert.equal(recommendProducts([raw],setup(locale,input,output,amps+1),3,c.sources).dc_charger.length,0);
  for(const bad of [{...raw,name:raw.name+" wrong"},{...raw,productUrl:raw.productUrl+"wrong"},
   {...raw,affiliateUrl:raw.affiliateUrl.replace("a_bid=","wrong=")},{...raw,available:false},{...raw,staleSource:true},
   {...raw,specs:{...raw.specs,currentA:amps+1}},{...raw,specs:{...raw.specs,chargingInputVoltagesV:[48]}}]){
   assert.equal(recommendProducts([bad],inputSetup,3,c.sources).dc_charger.length,0,id);
  }
 }
});
test("Renogy 60A offers are lower-priced alternatives for 50A requirement in each market",async()=>{
 for(const [l,m] of [["cs","svetkaravanu"],["sk","padabo_sk"],["pl","padabo_pl"]]){
  const c=await cat(l),r=c.products.find(p=>p.id===m+":106299"),v=c.products.find(p=>p.id===m+":101357");
  assert.ok(r&&v,l);
  if(c.sources[m].status!=="ok"||!r.available||!v.available)continue;
  const req=setup(l,12,12,50);
  const rec=recommendProducts([r,v],req,3,c.sources);
  assert.ok(rec.dc_charger.some(x=>x.product.id===r.id),l);
  assert.ok(rec.dc_charger.some(x=>x.product.id===v.id),l);
  assert.ok(r.priceCurrency===v.priceCurrency&&r.priceCzk<v.priceCzk,l);
  assert.equal(recommendProducts([r],setup(l,12,12,60),3,c.sources).dc_charger[0]?.product.id,r.id);
 }
});
