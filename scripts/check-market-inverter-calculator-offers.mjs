import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { projectMarketInverterOffers,acceptMarketInverterSnapshot,selectMarketInverterOffers } from "../src/market-inverter-calculator-offers.js";
for (const market of ["sk","pl"]){
 const full=JSON.parse(await readFile(`data/products-${market}.json`,"utf8"));
 const path=`/data/inverter-calculator-offers-${market}.json`;
 const raw=await readFile(path.slice(1),"utf8"),compact=JSON.parse(raw);
 assert.deepEqual(compact,projectMarketInverterOffers(market,full));
 assert.ok(acceptMarketInverterSnapshot(market,compact));
 assert.ok(Buffer.byteLength(raw)<12000);
 const now=Date.parse(compact.generatedAt);
 for(const voltage of [12,24])for(const watts of [600,1000,1500,2000]){
  for(const p of selectMarketInverterOffers(market,compact,{systemVoltage:voltage,inverterWatts:watts,largestStartWatts:watts},now)){
   assert.equal(p.specs.voltageV,voltage);assert.ok(p.specs.powerW>=watts);assert.equal(p.specs.inverterVariantMustBeSelected,true);
  }
 }
 if(process.argv.includes("--live")){
  const response=await fetch("https://mypowersetup.com"+path,{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(20000)});
  assert.ok(response.ok);assert.equal((await response.text()).trimEnd(),raw.trimEnd());
 }
 console.log(JSON.stringify({market,reviewedProducts:compact.products.length,status:process.argv.includes("--live")?"exact-public-source":"exact-source"}));
}
