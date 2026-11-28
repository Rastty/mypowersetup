import {readFile,writeFile} from "node:fs/promises";
import {projectShoreOffers,acceptShoreSnapshot} from "../src/shore-calculator-offers.js";
// Existing single catalog writer, AFTER CZ restoration and SK/PL refreshes.
// In Actions the CZ view comes ONLY from the current run staging file, not
// from the restored full catalog. Missing stage retains the previous view
// with its original expiry. Standalone local regeneration remains supported.
for(const [locale,full,small] of [
 ["cs","products.json","shore-calculator-offers-cz.json"],
 ["sk","products-sk.json","shore-calculator-offers-sk.json"],
 ["pl","products-pl.json","shore-calculator-offers-pl.json"],
]){
 let projected;
 if(locale==="cs"&&process.env.MPS_CZ_SHORE_STAGE_PATH){
  try{projected=JSON.parse(await readFile(process.env.MPS_CZ_SHORE_STAGE_PATH,"utf8"));}
  catch(error){if(error.code!=="ENOENT")throw error;console.warn("CZ shore: no current observation; retaining original snapshot and expiry");continue;}
 }else{
  const payload=JSON.parse(await readFile("data/"+full,"utf8"));
  projected=projectShoreOffers(locale,payload);
 }
 const json=JSON.stringify(projected)+"\n";
 if(!acceptShoreSnapshot(locale,projected)||Buffer.byteLength(json)>14000)throw Error("SHORE_PROJECTION_UNSAFE "+locale);
 await writeFile("data/"+small,json);
 console.log(locale+": "+projected.products.length+" shore SKUs, "+Buffer.byteLength(json)+" B; source "+projected.generatedAt);
}
