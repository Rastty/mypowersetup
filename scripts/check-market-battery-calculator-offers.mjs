import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { projectMarketBatteryCalculatorOffers,acceptMarketBatterySnapshot,reviewedMarketBatteryOffers } from "../src/market-battery-calculator-offers.js";
for (const market of ["sk","pl"]){
 const full=JSON.parse(await readFile(`data/products-${market}.json`,"utf8"));
 const compact=JSON.parse(await readFile(`data/battery-calculator-offers-${market}.json`,"utf8"));
 assert.deepEqual(compact,projectMarketBatteryCalculatorOffers(market,full,Date.parse(full.generatedAt)));
 assert.ok(acceptMarketBatterySnapshot(market,compact));
 assert.equal(reviewedMarketBatteryOffers(market,compact,Date.parse(compact.generatedAt)).length,compact.products.length);
 console.log(JSON.stringify({market,reviewedProducts:compact.products.length,status:"exact-source",bytes:JSON.stringify(compact).length}));
}
