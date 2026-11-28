import {readFile,writeFile} from "node:fs/promises";
import {projectShoreOffers,acceptShoreSnapshot} from "../src/shore-calculator-offers.js";

export async function stageCzShoreOffers({stagePath,source,products,previousGeneratedAt,observedAt}){
 if(!stagePath)return false;
 // Only a successful observation of the exact approved merchant can advance
 // the source timestamp. A failed merchant clears the cards, never renews them.
 const ok=source?.status==="ok"&&source.recommendationsDisabled!==true;
 let prior=previousGeneratedAt;
 if(!ok){
  try{const p=JSON.parse(await readFile("data/shore-calculator-offers-cz.json","utf8"));if(acceptShoreSnapshot("cs",p))prior=p.generatedAt;}catch{}
 }
 const generatedAt=ok?observedAt:prior;
 if(!Number.isFinite(Date.parse(generatedAt)))return false;
 const snapshot=projectShoreOffers("cs",{generatedAt,sources:{svetkaravanu:source||{status:"unavailable"}},products:ok?products.filter(p=>p.merchant==="svetkaravanu"):[]});
 const json=JSON.stringify(snapshot)+"\n";
 if(!acceptShoreSnapshot("cs",snapshot)||Buffer.byteLength(json)>14000)throw Error("CZ_SHORE_STAGE_INVALID");
 await writeFile(stagePath,json,{flag:"wx"});
 console.log("CZ independent shore stage: "+snapshot.products.length+" SKU; source "+snapshot.generatedAt);
 return true;
}
