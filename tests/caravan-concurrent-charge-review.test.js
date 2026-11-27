import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { refreshCatalogProduct } from "../src/products.js";
import { reviewedBatteryChargingLimit,reviewConcurrentCharging,concurrentChargeReviewMarkup } from "../src/caravan-concurrent-charge-review.js";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";
import { purchaseReadyCaravanPackages } from "../src/caravan-package-readiness.js";
const cat=l=>readFile(new URL("../data/products"+(l==="cs"?"":"-"+l)+".json",import.meta.url),"utf8").then(JSON.parse);
const product=(id,category,amps)=>({id,category,name:id,merchant:"fixture",available:true,affiliateUrl:"https://example.test/offer/"+id,priceCzk:100,priceCurrency:"EUR",specs:{currentA:amps}});
const item=(category,product)=>({category,product,score:90,fit:1});
const setup=l=>({locale:l,systemVoltage:12,batteryAh:100,batteryType:"lifepo4",inverterWatts:0,charging:{dcDc:{suggestedCurrentAmps:30},shore:{suggestedCurrentAmps:15}}});
test("six reviewed NG SKUs distinguish charging 30/100A from 50A sustained discharge",async()=>{
 for(const [l,m] of [["cs","svetkaravanu"],["sk","padabo_sk"],["pl","padabo_pl"]]){
  const c=await cat(l);
  for(const [id,v] of [["107356_32721",12],["107358",24]]){
   const raw=c.products.find(p=>p.id===m+":"+id);assert.ok(raw,l);
   if(c.sources[m].status!=="ok"||!raw.available)continue;
   const b=refreshCatalogProduct(raw),limit=reviewedBatteryChargingLimit(b);
   assert.equal(limit?.recommendedA,30,l);
   assert.equal(limit?.maxA,100,l);
   assert.equal(limit?.voltageV,v,l);
   assert.equal(reviewedBatteryChargingLimit({...b,affiliateUrl:"https://example.test/wrong"}),null);
   assert.equal(reviewedBatteryChargingLimit({...b,recommendedQuantity:2}),null);
   assert.equal(reviewedBatteryChargingLimit({...b,staleSource:true}),null);
   assert.equal(reviewedBatteryChargingLimit({...b,specs:{...b.specs,bmsManufacturerModel:"BAT512120740"}}),null);
  }
 }
});
test("actual nameplate sum differentiates recommended, maximum and unknown; every alternate basket checked",async()=>{
 const c=await cat("cs"),raw=c.products.find(p=>p.id==="svetkaravanu:107356_32721");assert.ok(raw);
 if(c.sources.svetkaravanu.status!=="ok"||!raw.available)return;
 const b=refreshCatalogProduct(raw);
 const panel=item("solar_panel",product("panel","solar_panel",null));
 const make=(a,d,s)=>[item("battery",b),panel,item("controller",product("mppt","controller",a)),item("dc_charger",product("dcdc","dc_charger",d)),item("shore_charger",product("shore","shore_charger",s))];
 for(const [amps,status,sum] of [[[10,10,10],"within_nameplate_limit",30],[[30,30,40],"over_recommended",100],[[30,60,20],"over_max",110],[[20,null,10],"unknown",30],[[100,20,null],"over_max",120]]){
  const review=reviewConcurrentCharging(make(...amps));assert.equal(review.status,status);assert.equal(review.sumA,sum);
  for(const locale of ["cs","sk","pl"])assert.match(concurrentChargeReviewMarkup(review,locale),new RegExp('data-concurrent-charge-review="'+status+'"'));
 }
 const unknown=make(30,60,20).map(x=>x.category==="battery"?{...x,product:product("unknown","battery",100)}:x);
 assert.equal(reviewConcurrentCharging(unknown).status,"unknown","generic currentA is not charge limit evidence");
 const makePlan=(locale,items)=>{
  const rec=Object.fromEntries(items.map(x=>[x.category,[x]]));
  return buildCaravanBuyerChecklist({coverage:{required:items.map(x=>x.category)},recommendations:rec,setup:setup(locale),locale});
 };
 for(const locale of ["cs","sk","pl"]){
  const ok=make(20,30,15),bad=make(30,60,20);
  const plan=makePlan(locale,ok),held=makePlan(locale,bad);
  assert.equal(plan.complete,true);
  assert.equal(plan.concurrentChargeReview.status,"over_recommended");
  assert.equal(held.readyCount,5);
  assert.equal(held.complete,false);
  assert.equal(held.manualDesign,true);
  const variants=[{id:"recommended",items:ok,requiredCategoryCount:5},{id:"reserve",items:bad,requiredCategoryCount:5}];
  assert.deepEqual(purchaseReadyCaravanPackages(variants,plan).map(x=>x.id),["recommended"]);
  assert.deepEqual(purchaseReadyCaravanPackages(variants,held),[]);
 }
});
