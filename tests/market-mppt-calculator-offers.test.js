import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateLanding } from "../src/calculator-landing.js";
import { projectMarketMpptOffers,selectMarketMpptOffers,marketMpptExpiresAt,isMarketMpptStillEligible } from "../src/market-mppt-calculator-offers.js";
for(const market of ["sk","pl"])test(market+" MPPT exact local purchase choices",async()=>{
 const full=JSON.parse(await readFile(`data/products-${market}.json`,"utf8")),compact=JSON.parse(await readFile(`data/mppt-calculator-offers-${market}.json`,"utf8"));
 const now=Date.parse(compact.generatedAt);
 assert.deepEqual(compact,projectMarketMpptOffers(market,full));
 const result=calculateLanding("mppt-sizing",{panelWatts:400,systemVoltage:12,batteryType:"lifepo4"},market).result;
 const offers=selectMarketMpptOffers(market,compact,result,now);
 assert.deepEqual(offers.map(p=>p.id),compact.products.filter(p=>p.specs.currentA===50).map(p=>p.id));
 const low={...result,systemVoltage:24,controllerAmps:20};
 assert.equal(selectMarketMpptOffers(market,compact,low,now).length,compact.products.length);
 for(const p of offers){assert.equal(p.priceCurrency,market==="sk"?"EUR":"PLN");assert.equal(p.specs.maxPvVocV,100);assert.ok(isMarketMpptStillEligible(market,compact,result,p,now));assert.equal(isMarketMpptStillEligible(market,compact,result,p,marketMpptExpiresAt(compact)),false);}
 const bad=structuredClone(compact);bad.products.forEach(p=>p.affiliateUrl+="&a_aid=invalid");
 assert.equal(selectMarketMpptOffers(market,bad,low,now).length,0);
 assert.equal(selectMarketMpptOffers(market,compact,{...low,panelWatts:1500},now).length,0);
});
