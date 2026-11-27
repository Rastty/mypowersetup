import test from "node:test";
import assert from "node:assert/strict";
import { reviewShoreBatteryCapacity } from "../src/caravan-shore-capacity-review.js";
import { buildProductPackages } from "../src/packages.js";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";
import { purchaseReadyCaravanPackages } from "../src/caravan-package-readiness.js";
import { renderLocalizedCaravanBuyerPlan } from "../src/caravan-buyer-plan-localized.js";
const candidate=(id,category,specs,score=90,available=true)=>({score,fit:1,product:{id,category,name:id,merchant:"fixture",available,priceCurrency:"EUR",priceCzk:100,affiliateUrl:"https://example.test/offer/"+id,specs}});
const battery=candidate("actual-150Ah","battery",{voltageV:12,batteryType:"lifepo4",capacityAh:150});
const panel=candidate("pv","solar_panel",{}),mppt=candidate("mppt","controller",{});
const shore=(id,min,max,score=90,stock=true)=>candidate(id,"shore_charger",{chargingCapacityRangeChemistry:"lifepo4",chargingCapacityMinAh:min,chargingCapacityMaxAh:max,currentA:15,voltageV:12},score,stock);
const tooSmall=shore("range-50-100",50,100,99);
const fits=shore("range-50-150",50,150,90);
const unknown=candidate("unknown-range","shore_charger",{currentA:15},98);
const required=["battery","solar_panel","controller","shore_charger"];
const input=locale=>({locale,systemVoltage:12,batteryType:"lifepo4",batteryAh:100,solarWatts:100,controllerAmps:10,inverterWatts:0,charging:{shore:{enabled:true,suggestedCurrentAmps:10},dcDc:{}}});
const recommendations={battery:[battery],solar_panel:[panel],controller:[mppt],shore_charger:[tooSmall,unknown,fits]};
const make=(locale,rec=recommendations,packages=[])=>buildCaravanBuyerChecklist({coverage:{required},packages,recommendations:rec,setup:input(locale),locale});
test("actual 150Ah battery replaces a charger fitting only calculated 100Ah in all three markets",()=>{
 for(const locale of ["cs","sk","pl"]){
  const packages=buildProductPackages(recommendations,input(locale));
  const selected=packages.find(x=>x.id==="recommended").items.find(x=>x.category==="shore_charger");
  assert.equal(selected.product.id,fits.product.id);
  const plan=make(locale,recommendations,packages);
  assert.equal(plan.complete,true);
  assert.equal(plan.rows.find(x=>x.category==="shore_charger").product.id,fits.product.id);
  assert.deepEqual(plan.rows.find(x=>x.category==="shore_charger").shoreCapacityReview,{status:"within_reviewed_range",actualAh:150,minAh:50,maxAh:150});
  assert.equal(purchaseReadyCaravanPackages(packages,plan)[0]?.id,"recommended");
  // Partial plans also repair the wrong top-ranked technical choice.
  assert.equal(make(locale).rows.find(x=>x.category==="shore_charger").product.id,fits.product.id);
  const bad={...packages[0],id:"economy",items:packages[0].items.map(x=>x.category==="shore_charger"?{category:"shore_charger",...tooSmall}:x)};
  assert.deepEqual(purchaseReadyCaravanPackages([bad],plan),[]);
 }
});
test("no documented replacement with matching actual capacity holds only charger checkout",()=>{
 for(const locale of ["cs","sk","pl"]){
  const rec={...recommendations,shore_charger:[tooSmall,unknown,{...fits,product:{...fits.product,available:false}}]};
  const plan=make(locale,rec,buildProductPackages(rec,input(locale)));
  assert.equal(plan.complete,false);
  assert.equal(plan.readyCount,3);
  assert.equal(plan.rows.find(x=>x.category==="shore_charger").missingReason,"shore_capacity_review");
  assert.equal(plan.rows.find(x=>x.category==="shore_charger").product,null);
  assert.deepEqual(purchaseReadyCaravanPackages(buildProductPackages(rec,input(locale)),plan),[]);
  if(locale!=="cs"){
   const target={innerHTML:""};
   renderLocalizedCaravanBuyerPlan({target,plan,locale,purchaseUrl:p=>p.affiliateUrl,purchaseCta:()=>"Shop",merchantLabel:id=>id,trackEvent:()=>{}});
   assert.ok(target.innerHTML.includes(locale==="sk"?"skutočnú kapacitu":"rzeczywistej pojemności"));
   assert.ok(!target.innerHTML.includes('data-product-id="'+tooSmall.product.id+'"'));
  }
 }
});
test("range check is conservative when battery topology or capacity is unknown",()=>{
 assert.equal(reviewShoreBatteryCapacity({...battery.product,recommendedQuantity:2},fits.product).status,"manual_review");
 assert.equal(reviewShoreBatteryCapacity({...battery.product,specs:{}},fits.product).status,"manual_review");
 assert.equal(reviewShoreBatteryCapacity(battery.product,unknown.product),null);
 assert.equal(reviewShoreBatteryCapacity({...battery.product,specs:{...battery.product.specs,capacityAh:50}},fits.product).status,"within_reviewed_range");
});
