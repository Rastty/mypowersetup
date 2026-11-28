import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateLanding } from "../src/calculator-landing.js";
import { projectMarketInverterOffers,acceptMarketInverterSnapshot,selectMarketInverterOffers,isMarketInverterStillEligible,marketInverterExpiresAt } from "../src/market-inverter-calculator-offers.js";

for(const market of ["sk","pl"])test(market+" inverter purchase choices reuse exact manufacturer proof and fail closed",async()=>{
 const full=JSON.parse(await readFile(`data/products-${market}.json`,"utf8"));
 const compact=JSON.parse(await readFile(`data/inverter-calculator-offers-${market}.json`,"utf8"));
 const now=Date.parse(compact.generatedAt),merchant="padabo_"+market;
 assert.deepEqual(compact,projectMarketInverterOffers(market,full));
 assert.ok(acceptMarketInverterSnapshot(market,compact));
 assert.ok(compact.products.length<=6);
 const result=calculateLanding("inverter-sizing",{largestLoadWatts:1000,otherLoadWatts:0,surgeMultiplier:1,systemVoltage:24},market).result;
 const offers=selectMarketInverterOffers(market,compact,result,now);
 assert.deepEqual(offers.map(p=>p.id),compact.products.filter(p=>p.specs.voltageV===24&&p.specs.powerW>=result.inverterWatts).sort((a,b)=>a.specs.powerW-b.specs.powerW).slice(0,3).map(p=>p.id));
 for(const p of offers){
  assert.equal(p.specs.inverterVariantMustBeSelected,true);
  assert.equal(p.priceCurrency,market==="sk"?"EUR":"PLN");
  assert.equal(isMarketInverterStillEligible(market,compact,result,p,now),true);
  assert.equal(isMarketInverterStillEligible(market,compact,result,p,marketInverterExpiresAt(compact)),false);
 }
 const bad=structuredClone(compact);bad.products.forEach(p=>p.affiliateUrl+="&a_aid=invalid");
 assert.equal(selectMarketInverterOffers(market,bad,result,now).length,0);
 assert.equal(selectMarketInverterOffers(market,{...compact,sources:{[merchant]:{status:"stale"}}},result,now).length,0);
 assert.equal(selectMarketInverterOffers(market,compact,{...result,largestStartWatts:5001},now).length,0);
});
