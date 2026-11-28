import {readFile,writeFile} from "node:fs/promises";
import {projectShoreOffers,acceptShoreSnapshot} from "../src/shore-calculator-offers.js";
// This runs inside the existing single catalog writer, AFTER CZ restoration
// (if needed) and independent SK/PL refreshes. Never updates source timestamps.
for(const [locale,full,small] of [
 ["cs","products.json","shore-calculator-offers-cz.json"],
 ["sk","products-sk.json","shore-calculator-offers-sk.json"],
 ["pl","products-pl.json","shore-calculator-offers-pl.json"],
]){
 const payload=JSON.parse(await readFile("data/"+full,"utf8"));
 const projected=projectShoreOffers(locale,payload);
 const json=JSON.stringify(projected)+"\n";
 if(!acceptShoreSnapshot(locale,projected)||Buffer.byteLength(json)>14000)throw Error("SHORE_PROJECTION_UNSAFE "+locale);
 await writeFile("data/"+small,json);
 console.log(locale+": "+projected.products.length+" shore SKUs, "+Buffer.byteLength(json)+" B; source "+projected.generatedAt);
}
