import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { projectMarketMpptOffers,acceptMarketMpptSnapshot,selectMarketMpptOffers } from "../src/market-mppt-calculator-offers.js";
for (const market of ["sk","pl"]){
 const full=JSON.parse(await readFile(`data/products-${market}.json`,"utf8"));
 const path=`/data/mppt-calculator-offers-${market}.json`;
 const raw=await readFile(path.slice(1),"utf8"),compact=JSON.parse(raw);
 assert.deepEqual(compact,projectMarketMpptOffers(market,full));
 assert.ok(acceptMarketMpptSnapshot(market,compact));
 assert.ok(Buffer.byteLength(raw)<8000);
 const now=Date.parse(compact.generatedAt);
 for(const p of selectMarketMpptOffers(market,compact,{systemVoltage:12,panelWatts:400,controllerAmps:40,batteryType:"lifepo4"},now))assert.equal(p.specs.currentA,50);
 if(process.argv.includes("--live")){
  const response=await fetch("https://mypowersetup.com"+path,{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(20000)});
  assert.ok(response.ok);assert.equal((await response.text()).trimEnd(),raw.trimEnd());
 }
 console.log(JSON.stringify({market,reviewedProducts:compact.products.length,status:process.argv.includes("--live")?"exact-public-source":"exact-source"}));
}
