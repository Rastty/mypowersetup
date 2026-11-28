import { addReviewedDometicDpsiInverterSpecs } from "./dometic-dpsi-inverter-profiles.js";
const MAX_AGE=72*3600000;
const VARIANTS=new Set(["30466","30467","30472","30473","30474","30475"]);
const config=locale=>locale==="sk"?{market:"sk-SK",currency:"EUR",merchant:"padabo_sk"}:locale==="pl"?{market:"pl-PL",currency:"PLN",merchant:"padabo_pl"}:null;
function generated(payload){
 const stamp=payload?.generatedAt;
 if(typeof stamp!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(stamp))return NaN;
 const date=Date.parse(stamp);
 return Number.isFinite(date)&&new Date(date).toISOString().slice(0,19)===stamp.slice(0,19)?date:NaN;
}
export function marketInverterExpiresAt(payload){const d=generated(payload);return Number.isFinite(d)?d+MAX_AGE:null;}
function reviewed(locale,payload,now){
 const cfg=config(locale),date=generated(payload);
 if(!cfg||payload?.market!==cfg.market||!Array.isArray(payload.products)||payload.sources?.[cfg.merchant]?.status!=="ok"||!Number.isFinite(date)||date>now||now-date>=MAX_AGE)return [];
 const counts=new Map();
 for(const p of payload.products)counts.set(p?.id,(counts.get(p?.id)||0)+1);
 return payload.products.filter(p=>p&&counts.get(p.id)===1&&p.merchant===cfg.merchant&&p.category==="inverter"&&typeof p.id==="string"&&p.id.startsWith(cfg.merchant+":104292_")&&VARIANTS.has(p.id.split("_").at(-1))&&p.marketEligible!==false&&p.priceCurrency===cfg.currency).map(p=>({...p,specs:addReviewedDometicDpsiInverterSpecs(p,p.specs)})).filter(p=>p.specs?.inverterVariantMustBeSelected===true&&p.specs?.pureSine===true&&Number.isFinite(p.specs?.inverterPeakPowerW)&&Number.isFinite(p.specs?.powerW));
}
export function acceptMarketInverterSnapshot(locale,payload){
 const cfg=config(locale);
 return Boolean(cfg&&payload?.schemaVersion===1&&payload.projection==="inverter"&&payload.market===cfg.market&&Number.isFinite(generated(payload))&&["ok","stale"].includes(payload.sources?.[cfg.merchant]?.status)&&Array.isArray(payload.products)&&payload.products.length<=6&&payload.products.every(p=>p&&p.merchant===cfg.merchant&&p.category==="inverter"&&p.priceCurrency===cfg.currency));
}
export function projectMarketInverterOffers(locale,full,now=Date.parse(full?.generatedAt)){
 const cfg=config(locale);if(!cfg)throw Error("UNKNOWN_INVERTER_MARKET");
 const ids=new Set(reviewed(locale,full,now).map(p=>p.id));
 return {schemaVersion:1,projection:"inverter",market:cfg.market,generatedAt:full?.generatedAt??null,sources:{[cfg.merchant]:{status:full?.sources?.[cfg.merchant]?.status==="ok"?"ok":"stale"}},products:(full?.products||[]).filter(p=>ids.has(p.id)).map(p=>({id:p.id,name:p.name,merchant:p.merchant,category:p.category,available:p.available,staleSource:p.staleSource===true,marketEligible:p.marketEligible!==false,priceCzk:p.priceCzk,priceCurrency:p.priceCurrency,productUrl:p.productUrl,affiliateUrl:p.affiliateUrl,specs:{voltageV:p.specs.voltageV,powerW:p.specs.powerW,pureSine:p.specs.pureSine}}))};
}
export function selectMarketInverterOffers(locale,payload,result,now=Date.now()){
 if(!acceptMarketInverterSnapshot(locale,payload)||![12,24].includes(result?.systemVoltage)||!Number.isSafeInteger(result.inverterWatts)||result.inverterWatts<100||result.inverterWatts>5000||result.inverterWatts%100||!Number.isSafeInteger(result.largestStartWatts)||result.largestStartWatts<0)return [];
 return reviewed(locale,payload,now).filter(p=>p.specs.voltageV===result.systemVoltage&&p.specs.powerW>=result.inverterWatts&&p.specs.inverterPeakPowerW>=result.largestStartWatts).sort((a,b)=>a.specs.powerW-b.specs.powerW||a.priceCzk-b.priceCzk).slice(0,3);
}
export function isMarketInverterStillEligible(locale,payload,result,offer,now=Date.now()){
 return selectMarketInverterOffers(locale,payload,result,now).some(p=>p.id===offer?.id&&p.priceCzk===offer.priceCzk&&p.affiliateUrl===offer.affiliateUrl);
}
export async function loadMarketInverterOffers(locale,fetchImpl=fetch,timeoutMs=15000){
 if(!config(locale))return null;
 try{const response=await fetchImpl(`/data/inverter-calculator-offers-${locale}.json`,{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(timeoutMs)});if(!response.ok)return null;const payload=await response.json();return acceptMarketInverterSnapshot(locale,payload)?payload:null;}catch{return null;}
}
