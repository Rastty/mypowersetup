import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { reviewedMarketBatteryOffers,selectMarketBatteryCalculatorOffers,isMarketBatteryOfferStillEligible,acceptMarketBatterySnapshot,projectMarketBatteryCalculatorOffers,loadMarketBatteryCalculatorOffers } from "../src/market-battery-calculator-offers.js";
import { calculateLanding } from "../src/calculator-landing.js";
const fixture=JSON.parse(await readFile("tests/fixtures/market-battery-calculator-offers.json","utf8"));
for(const locale of ["sk","pl"]){
 const feed=fixture[locale],now=Date.parse(feed.generatedAt)+1000,currency=locale==="sk"?"EUR":"PLN";
 const calc=(voltage,wh=300,type="lifepo4")=>calculateLanding("battery-capacity",{dailyWh:wh,autonomyDays:2,batteryType:type,systemVoltage:voltage},locale).result;
 test(locale+" exact standalone local battery matches across both voltages",()=>{
  assert.equal(reviewedMarketBatteryOffers(locale,feed,now).length,locale==="sk"?7:4);
  for(const voltage of [12,24]){
   const result=calc(voltage),rows=selectMarketBatteryCalculatorOffers(locale,feed,result,now);
   assert.ok(rows.length>=1&&rows.length<=3);
   for(const p of rows){
    assert.equal(p.priceCurrency,currency);assert.equal(p.specs.voltageV,voltage);assert.ok(p.specs.capacityAh>=result.batteryAh);
    assert.ok(p.specs.bmsManufacturerEvidenceUrl&&p.specs.bmsContinuousCurrentA>0);
    assert.ok(isMarketBatteryOfferStillEligible(locale,feed,result,p,now));
    assert.equal(isMarketBatteryOfferStillEligible(locale,feed,result,p,now+73*3600000),false);
   }
   assert.deepEqual(rows.map(p=>p.priceCzk),rows.map(p=>p.priceCzk).sort((a,b)=>a-b));
  }
  assert.deepEqual(selectMarketBatteryCalculatorOffers(locale,feed,calc(12,300,"lead"),now),[]);
  assert.deepEqual(selectMarketBatteryCalculatorOffers(locale,feed,calc(12,9000),now),[]);
 });
 test(locale+" bad identity, stale source, cross-currency, duplicates and missing feed fail closed",async()=>{
  const item=feed.products.find(p=>p.id===`padabo_${locale}:26753`);
  const only=(p)=>({...feed,products:[p]});
  for(const p of [{...item,available:false},{...item,staleSource:true},{...item,marketEligible:false},{...item,priceCzk:0},{...item,priceCurrency:"USD"},{...item,name:"other"},{...item,productUrl:item.productUrl+"?variant=other"},{...item,affiliateUrl:item.affiliateUrl+"&a_bid=invalid"},{...item,specs:{...item.specs,capacityAh:200}}])assert.deepEqual(selectMarketBatteryCalculatorOffers(locale,only(p),calc(12),now),[]);
  assert.deepEqual(selectMarketBatteryCalculatorOffers(locale,{...only(item),products:[item,item]},calc(12),now),[]);
  assert.deepEqual(selectMarketBatteryCalculatorOffers(locale,{...only(item),generatedAt:"2026-02-31T00:00:00Z"},calc(12),now),[]);
  assert.deepEqual(selectMarketBatteryCalculatorOffers(locale,{...only(item),sources:{...feed.sources,[item.merchant]:{status:"stale"}}},calc(12),now),[]);
  assert.deepEqual(selectMarketBatteryCalculatorOffers(locale,fixture[locale==="sk"?"pl":"sk"],calc(12),now),[]);
  const calls=[];assert.equal(await loadMarketBatteryCalculatorOffers(locale,async(path,opts)=>{calls.push(path);assert.equal(opts.cache,"no-store");assert.equal(opts.redirect,"error");return {ok:false,status:404};}),null);
  assert.deepEqual(calls,[`/data/battery-calculator-offers-${locale}.json`]);
  assert.ok(acceptMarketBatterySnapshot(locale,feed));
 });
 test(locale+" committed projection exact source and no full-feed fallback",async()=>{
  const full=JSON.parse(await readFile(`data/products-${locale}.json`,"utf8")),compact=JSON.parse(await readFile(`data/battery-calculator-offers-${locale}.json`,"utf8"));
  assert.deepEqual(compact,projectMarketBatteryCalculatorOffers(locale,full,Date.parse(full.generatedAt)));
 });
}
