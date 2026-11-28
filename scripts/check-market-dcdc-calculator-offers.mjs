import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {projectMarketDcdcOffers,acceptMarketDcdcSnapshot} from "../src/market-dcdc-calculator-offers.js";
for(const locale of ["sk","pl"]){
 const path=`/data/dcdc-calculator-offers-${locale}.json`,raw=await readFile(path.slice(1),"utf8"),compact=JSON.parse(raw),full=JSON.parse(await readFile(`data/products-${locale}.json`,"utf8"));
 assert.deepEqual(compact,projectMarketDcdcOffers(locale,full));assert.ok(acceptMarketDcdcSnapshot(locale,compact));assert.ok(Buffer.byteLength(raw)<8000);
 if(process.argv.includes("--live")){const response=await fetch("https://mypowersetup.com"+path,{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(20000)});assert.ok(response.ok);assert.equal((await response.text()).trimEnd(),raw.trimEnd());}
 console.log(JSON.stringify({locale,reviewedProducts:compact.products.length,status:process.argv.includes("--live")?"exact-public-source":"exact-source"}));
}
