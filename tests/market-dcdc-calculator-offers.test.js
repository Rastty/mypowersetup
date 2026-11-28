import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {calculateDcDcCharger} from "../src/dc-dc-charger.js";
import {projectMarketDcdcOffers,selectMarketDcdcOffers,marketDcdcExpiresAt,marketDcdcTiming} from "../src/market-dcdc-calculator-offers.js";
for(const locale of ["sk","pl"])test(locale+" DC-DC local choices respect direction and unrounded charging current",async()=>{
 const full=JSON.parse(await readFile(`data/products-${locale}.json`,"utf8")),compact=JSON.parse(await readFile(`data/dcdc-calculator-offers-${locale}.json`,"utf8")),now=Date.parse(compact.generatedAt);
 assert.deepEqual(compact,projectMarketDcdcOffers(locale,full));
 const r=calculateDcDcCharger({batteryCapacityAh:200,replenishPercent:50,targetDriveHours:2,sourceVoltage:14.2,batteryVoltage:12,spareAlternatorCurrentA:60,batteryMaxChargeCurrentA:100,efficiencyPercent:90});
 const offers=selectMarketDcdcOffers(locale,compact,r,now);
 assert.deepEqual(offers.map(p=>p.model.amps),compact.products.filter(p=>p.specs.chargingVoltagesV[0]===12).map(p=>p.specs.currentA).sort((a,b)=>b-a));
 for(const p of offers){assert.equal(p.model.input,12);assert.equal(p.priceCurrency,locale==="sk"?"EUR":"PLN");assert.ok(marketDcdcTiming(r,p).minimumHours>=100/p.model.amps);}
 const tight=calculateDcDcCharger({...r,spareAlternatorCurrentA:34});
 assert.equal(selectMarketDcdcOffers(locale,compact,tight,now).length,0);
 const v24=calculateDcDcCharger({...r,batteryVoltage:24,sourceVoltage:28.4});
 assert.ok(selectMarketDcdcOffers(locale,compact,v24,now).every(p=>p.model.input===24&&p.model.output===24));
 assert.equal(selectMarketDcdcOffers(locale,compact,{...r,sourceVoltage:20},now).length,0);
 assert.equal(selectMarketDcdcOffers(locale,compact,r,marketDcdcExpiresAt(compact)).length,0);
 const bad=structuredClone(compact);bad.products.forEach(p=>p.affiliateUrl+="&a_aid=invalid");assert.equal(selectMarketDcdcOffers(locale,bad,r,now).length,0);
});
