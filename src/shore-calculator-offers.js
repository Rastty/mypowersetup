import {addVerifiedCarbestShoreProfile} from "./carbest-shore-profiles.js";
import {addVerifiedDometicMcaShoreProfile} from "./dometic-mca-shore-profiles.js";
import {estimateShoreCharge} from "./shore-charge-estimator.js?v=20261128-1";
const AGE=72*3600000;
const MARKETS=Object.freeze({
 cs:{merchant:"svetkaravanu",currency:"CZK",path:"/data/shore-calculator-offers-cz.json",market:"cs-CZ"},
 sk:{merchant:"padabo_sk",currency:"EUR",path:"/data/shore-calculator-offers-sk.json",market:"sk-SK"},
 pl:{merchant:"padabo_pl",currency:"PLN",path:"/data/shore-calculator-offers-pl.json",market:"pl-PL"}
});
const SKU=/^(25869_(27324|27325|27326)|24087_(26040|26042)|24088_26048)$/;
function time(v){
 if(typeof v!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(v))return NaN;
 const n=Date.parse(v);return Number.isFinite(n)&&new Date(n).toISOString().slice(0,19)===v.slice(0,19)?n:NaN;
}
export function shoreOfferExpiry(locale,payload,now=Date.now()){
 const c=Object.hasOwn(MARKETS,locale)?MARKETS[locale]:null,t=time(payload?.generatedAt);
 if(!c||!Number.isFinite(t)||t>now||now-t>=AGE||payload?.sources?.[c.merchant]?.status!=="ok"||payload.sources[c.merchant].recommendationsDisabled===true||!Array.isArray(payload.products))return null;
 if(payload.market!==c.market && !(locale==="cs"&&payload.market==null&&payload.projection==null))return null;
 return t+AGE;
}
// Compact same-source view; preserve source generation time, never create
// fresh commercial evidence from an old or quarantined catalog.
export function projectShoreOffers(locale,payload){
 const c=Object.hasOwn(MARKETS,locale)?MARKETS[locale]:null;
 if(!c||!Array.isArray(payload?.products))throw Error("SHORE_SOURCE_INVALID");
 if(payload.market!==c.market&&!(locale==="cs"&&payload.market==null))throw Error("SHORE_SOURCE_MARKET");
 const counts=new Map();
 for(const p of payload.products)counts.set(p?.id,(counts.get(p?.id)||0)+1);
 const products=[];
 const source=payload.sources?.[c.merchant];
 if(source?.status==="ok"&&source.recommendationsDisabled!==true&&Number.isFinite(time(payload.generatedAt))){
  for(const p of payload.products){
   if(!p||typeof p.id!=="string"||!p.id.startsWith(c.merchant+":")||!SKU.test(p.id.slice(c.merchant.length+1))||counts.get(p.id)!==1||p.merchant!==c.merchant||p.category!=="shore_charger"||p.available!==true||p.staleSource===true||p.marketEligible===false||p.priceCurrency!==c.currency||!Number.isFinite(p.priceCzk)||p.priceCzk<=0)continue;
   const s=p.specs;
   if(!s||typeof p.name!=="string"||typeof p.productUrl!=="string"||typeof p.affiliateUrl!=="string")continue;
   products.push({id:p.id,name:p.name,merchant:p.merchant,category:p.category,priceCzk:p.priceCzk,priceCurrency:p.priceCurrency,available:p.available,staleSource:p.staleSource,marketEligible:p.marketEligible,productUrl:p.productUrl,affiliateUrl:p.affiliateUrl,description:typeof p.description==="string"?p.description.slice(0,500):"",specs:{voltageV:s.voltageV,currentA:s.currentA,chargingVoltagesV:s.chargingVoltagesV,batteryType:s.batteryType}});
  }
 }
 return {schemaVersion:1,projection:"shore_charger",market:c.market,generatedAt:payload.generatedAt,sources:{[c.merchant]:{status:source?.status||"unavailable",recommendationsDisabled:source?.recommendationsDisabled===true}},products:products.sort((a,b)=>a.id.localeCompare(b.id))};
}
export function acceptShoreSnapshot(locale,payload){
 const c=Object.hasOwn(MARKETS,locale)?MARKETS[locale]:null;
 if(!c||payload?.schemaVersion!==1||payload.projection!=="shore_charger"||payload.market!==c.market||!Number.isFinite(time(payload.generatedAt))||typeof payload.sources?.[c.merchant]?.status!=="string"||!Array.isArray(payload.products)||payload.products.length>6)return false;
 const seen=new Set();
 return payload.products.every(p=>{
  if(typeof p?.id!=="string"||!p.id.startsWith(c.merchant+":")||!SKU.test(p.id.slice(c.merchant.length+1))||seen.has(p.id)||p.merchant!==c.merchant||p.category!=="shore_charger"||p.priceCurrency!==c.currency||typeof p.name!=="string"||typeof p.productUrl!=="string"||typeof p.affiliateUrl!=="string")return false;
  seen.add(p.id);return true;
 });
}
export async function loadShoreOffers(locale,fetchImpl=fetch){
 const c=Object.hasOwn(MARKETS,locale)?MARKETS[locale]:null;if(!c)return null;
 try{const response=await fetchImpl(c.path,{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(15000)});if(!response.ok)return null;const payload=await response.json();return acceptShoreSnapshot(locale,payload)?payload:null;}catch{return null;}
}
export function selectShoreOffers(locale,payload,input,now=Date.now()){
 const expiry=shoreOfferExpiry(locale,payload,now),e=estimateShoreCharge(input);
 // Capacity range evidence is specific to LiFePO4. Other chemistry gets no
 // direct offers, rather than assuming a documented range applies to AGM.
 if(!expiry||!e||input.batteryType!=="lifepo4")return [];
 const c=MARKETS[locale],counts=new Map();
 for(const p of payload.products)counts.set(p?.id,(counts.get(p?.id)||0)+1);
 const result=[];
 for(const p of payload.products){
  if(!p||typeof p.id!=="string"||!p.id.startsWith(c.merchant+":")||!SKU.test(p.id.slice(c.merchant.length+1))||counts.get(p.id)!==1||p.merchant!==c.merchant||p.category!=="shore_charger"||p.available!==true||p.staleSource===true||p.marketEligible===false||p.priceCurrency!==c.currency||!Number.isFinite(p.priceCzk)||p.priceCzk<=0)continue;
  const raw=p.specs;if(!raw||!Number.isFinite(raw.currentA)||![12,24].includes(raw.voltageV))continue;
  // Strip any mutable feed-supplied proof; only independent exact-SKU
  // profile functions can authorize a candidate.
  const baseline={voltageV:raw.voltageV,currentA:raw.currentA,chargingVoltagesV:raw.chargingVoltagesV};
  const s=addVerifiedDometicMcaShoreProfile(p,addVerifiedCarbestShoreProfile(p,baseline));
  const capacity=Number(input.capacityAh);
  if(!s.chargingProfileEvidenceUrl||!s.chargingManufacturerModel||s.chargingCapacityRangeChemistry!=="lifepo4"||!s.chargingBatteryTypes?.includes("lifepo4")||s.voltageV!==Number(input.systemVoltage)||!s.chargingInputVoltagesV?.includes(230)||!Number.isFinite(s.chargingCapacityMinAh)||!Number.isFinite(s.chargingCapacityMaxAh)||capacity<s.chargingCapacityMinAh||capacity>s.chargingCapacityMaxAh)continue;
  const model=estimateShoreCharge({...input,chargerA:s.currentA});
  if(!model?.within||!model.targetMet||model.minimumHours===null)continue;
  result.push({id:p.id,name:p.name,merchant:p.merchant,price:p.priceCzk,currency:c.currency,affiliateUrl:p.affiliateUrl,model:s.chargingManufacturerModel,voltage:s.voltageV,amps:s.currentA,minAh:s.chargingCapacityMinAh,maxAh:s.chargingCapacityMaxAh,manual:s.chargingProfileEvidenceUrl,minimumHours:model.minimumHours,inputA:model.inputA,expiry});
 }
 return result.sort((a,b)=>a.price-b.price||a.amps-b.amps||a.id.localeCompare(b.id)).slice(0,3);
}
