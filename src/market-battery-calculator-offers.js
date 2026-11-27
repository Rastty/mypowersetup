import { addReviewedBatteryContinuousSpecs, verifiedBatteryContinuousDischargeAmps } from "./caravan-bms-manufacturer-proof.js?v=20261122-pq200a1-24vhigh1-pq100a1";
const MAX_AGE = 72 * 60 * 60 * 1000;
const MARKETS = Object.freeze({ sk:{market:"sk-SK",currency:"EUR",bid:"7aed5c13",merchants:["padabo_sk","powerqueen_eu"]}, pl:{market:"pl-PL",currency:"PLN",bid:"95d61abf",merchants:["padabo_pl"]} });
const PQ = new Set(["powerqueen_eu:7752838578396","powerqueen_eu:7881294676188","powerqueen_eu:7752840380636"]);
// Single exact standalone Carbest SKUs; manufacturer non-peak maximum discharge
// is distinct from short-time surge and not inferred from feed currentA.
// Li100, Li100BH6 and Li200BHD are 12.8 V LiFePO4. Check mounting and loads.
const CARBEST = Object.freeze({
  "padabo_sk:26753": {
    "name": "Batéria LiFePO4 Carbest Li100",
    "url": "https://www.padabo.sk/bateria-lifepo4-carbest-li100_z26753/",
    "capacityAh": 100,
    "model": "Li100",
    "maxDischargeA": 100,
    "evidenceUrl": "https://www.reimo.com/detail/index/sArticle/81819/sCategory/558"
  },
  "padabo_sk:26754": {
    "name": "Batéria Carbest LiFePO4 Li100BH6 pre VW T5/T6",
    "url": "https://www.padabo.sk/bateria-carbest-lifepo4-li100bh6-pre-vw-t5-t6_z26754/",
    "capacityAh": 100,
    "model": "Li100BH6",
    "maxDischargeA": 100,
    "evidenceUrl": "https://www.reimo.com/cs/camping-shop/solarni-systemy/cluny-slunecni-soustavy/67628/baterie-lifepo4-li100bt-hh6-podsedlova-baterie-vw-t6.1/t6/t5"
  },
  "padabo_sk:26755": {
    "name": "LiFePO4 batéria Carbest Li200BHD pre Fiat Ducato 12,8 V",
    "url": "https://www.padabo.sk/lifepo4-bateria-carbest-li200bhd-pre-fiat-ducato-12-8-v_z26755/",
    "capacityAh": 200,
    "model": "Li200BHD",
    "maxDischargeA": 150,
    "evidenceUrl": "https://www.reimo.com/en/camping-shop/solar-panels-for-motorhomes-solar-panels-for-caravans/marine-solar-panels-solar-panels-for-boats/67629/lifepo4-battery-li200bhd-under-seat-battery-fiat-ducato?c=366"
  },
  "padabo_pl:26753": {
    "name": "Akumulator LiFePO4 Carbest Li100",
    "url": "https://www.padabo.pl/akumulator-lifepo4-carbest-li100_z26753/",
    "capacityAh": 100,
    "model": "Li100",
    "maxDischargeA": 100,
    "evidenceUrl": "https://www.reimo.com/detail/index/sArticle/81819/sCategory/558"
  },
  "padabo_pl:26754": {
    "name": "Akumulator Carbest LiFePO4 Li100BH6 do VW T5/T6",
    "url": "https://www.padabo.pl/akumulator-carbest-lifepo4-li100bh6-do-vw-t5-t6_z26754/",
    "capacityAh": 100,
    "model": "Li100BH6",
    "maxDischargeA": 100,
    "evidenceUrl": "https://www.reimo.com/cs/camping-shop/solarni-systemy/cluny-slunecni-soustavy/67628/baterie-lifepo4-li100bt-hh6-podsedlova-baterie-vw-t6.1/t6/t5"
  },
  "padabo_pl:26755": {
    "name": "Akumulator LiFePO4 Carbest Li200BHD do Fiat Ducato 12,8 V",
    "url": "https://www.padabo.pl/akumulator-lifepo4-carbest-li200bhd-do-fiat-ducato-12-8-v_z26755/",
    "capacityAh": 200,
    "model": "Li200BHD",
    "maxDischargeA": 150,
    "evidenceUrl": "https://www.reimo.com/en/camping-shop/solar-panels-for-motorhomes-solar-panels-for-caravans/marine-solar-panels-solar-panels-for-boats/67629/lifepo4-battery-li200bhd-under-seat-battery-fiat-ducato?c=366"
  }
});
function config(locale){return Object.hasOwn(MARKETS,locale)?MARKETS[locale]:null;}
function generatedDate(payload){
 const stamp=payload?.generatedAt;
 if(typeof stamp!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(stamp))return NaN;
 const date=Date.parse(stamp);
 return Number.isFinite(date)&&new Date(date).toISOString().slice(0,19)===stamp.slice(0,19)?date:NaN;
}
export function marketBatteryOfferExpiresAt(payload){const date=generatedDate(payload);return Number.isFinite(date)?date+MAX_AGE:null;}
function exactCarbest(p,cfg){
 const item=Object.hasOwn(CARBEST,p.id)?CARBEST[p.id]:null;
 if(!item||p.name!==item.name||p.productUrl!==item.url||p.specs?.voltageV!==12
   ||p.specs.capacityAh!==item.capacityAh||p.specs.capacityWh!==item.capacityAh*12.8
   ||(p.specs.bmsContinuousCurrentA!=null&&p.specs.bmsContinuousCurrentA!==item.maxDischargeA))return null;
 try{
  const a=new URL(p.affiliateUrl);
  if(a.origin!=="https://ehub.cz"||a.pathname!=="/system/scripts/click.php"||a.username||a.password||a.hash||a.searchParams.size!==3
    ||["a_aid","a_bid","desturl"].some(k=>a.searchParams.getAll(k).length!==1)
    ||a.searchParams.get("a_aid")!=="f34c86c8"||a.searchParams.get("a_bid")!==cfg.bid||a.searchParams.get("desturl")!==item.url)return null;
 }catch{return null;}
 return {...p,specs:{...p.specs,bmsContinuousCurrentA:item.maxDischargeA,bmsManufacturerModel:item.model,bmsManufacturerEvidenceUrl:item.evidenceUrl,bmsEvidenceKind:"manufacturer_non_peak_max"}};
}
function reviewedProduct(locale,p,payload){
 const cfg=config(locale);
 if(!cfg||!p||p.category!=="battery"||!cfg.merchants.includes(p.merchant)
   ||payload.sources?.[p.merchant]?.status!=="ok"||p.available!==true||p.staleSource===true||p.marketEligible===false
   ||p.priceCurrency!==cfg.currency||!Number.isFinite(p.priceCzk)||p.priceCzk<=0
   ||p.specs?.batteryType!=="lifepo4"||![12,24].includes(p.specs?.voltageV)||!Number.isSafeInteger(p.specs?.capacityAh))return null;
 if(p.merchant===`padabo_${locale}`&&Object.hasOwn(CARBEST,p.id))return exactCarbest(p,cfg);
 // Shared variant parents excluded: clickout must land on exact capacity.
 if(p.id!==`padabo_${locale}:107358`&&!(locale==="sk"&&PQ.has(p.id)))return null;
 const reviewed={...p,specs:addReviewedBatteryContinuousSpecs(p,p.specs)};
 return verifiedBatteryContinuousDischargeAmps(reviewed)!==null?reviewed:null;
}
export function reviewedMarketBatteryOffers(locale,payload,now=Date.now()){
 const cfg=config(locale),generated=generatedDate(payload);
 if(!cfg||payload?.market!==cfg.market||!Array.isArray(payload.products)||!Number.isFinite(generated)||generated>now||now-generated>=MAX_AGE)return [];
 const counts=new Map(),urls=new Map();
 for(const p of payload.products){counts.set(p?.id,(counts.get(p?.id)||0)+1);urls.set(p?.productUrl,(urls.get(p?.productUrl)||0)+1);}
 return payload.products.filter(p=>counts.get(p?.id)===1&&urls.get(p?.productUrl)===1)
  .map(p=>reviewedProduct(locale,p,payload)).filter(Boolean);
}
export function selectMarketBatteryCalculatorOffers(locale,payload,result,now=Date.now()){
 if(!acceptMarketBatterySnapshot(locale,payload)||result?.batteryType!=="lifepo4"
   ||![12,24].includes(result.systemVoltage)||!Number.isSafeInteger(result.batteryAh)||result.batteryAh<10||result.batteryAh>2000||result.batteryAh%10
   ||!Number.isFinite(result.batteryWh)||result.batteryWh<=0
   ||!Number.isSafeInteger(result.dailyWh)||result.dailyWh<50||result.dailyWh>20000
   ||!Number.isInteger(result.autonomyDays)||result.autonomyDays<1||result.autonomyDays>7)return [];
 return reviewedMarketBatteryOffers(locale,payload,now).filter(p=>p.specs.voltageV===result.systemVoltage&&p.specs.capacityAh>=result.batteryAh)
  .sort((a,b)=>a.priceCzk-b.priceCzk||a.specs.capacityAh-b.specs.capacityAh||a.id.localeCompare(b.id)).slice(0,3);
}
export function isMarketBatteryOfferStillEligible(locale,payload,result,offer,now=Date.now()){
 return selectMarketBatteryCalculatorOffers(locale,payload,result,now).some(p=>p.id===offer?.id&&p.priceCzk===offer.priceCzk&&p.affiliateUrl===offer.affiliateUrl&&p.specs.capacityAh===offer.specs?.capacityAh);
}
export function acceptMarketBatterySnapshot(locale,payload){
 const cfg=config(locale);
 return Boolean(cfg&&payload?.schemaVersion===1&&payload.projection==="battery"&&payload.market===cfg.market
   &&Number.isFinite(generatedDate(payload))&&Array.isArray(payload.products)&&payload.products.length<=(locale==="sk"?7:4)
   &&cfg.merchants.every(m=>["ok","stale"].includes(payload.sources?.[m]?.status))
   &&payload.products.every(p=>p&&p.category==="battery"&&cfg.merchants.includes(p.merchant)&&p.priceCurrency===cfg.currency));
}
export function projectMarketBatteryCalculatorOffers(locale,full,now=Date.now()){
 const cfg=config(locale);
 if(!cfg)throw new Error("UNKNOWN_BATTERY_MARKET");
 const reviewed=reviewedMarketBatteryOffers(locale,full,now);
 const ids=new Set(reviewed.map(p=>p.id));
 return {schemaVersion:1,projection:"battery",market:cfg.market,generatedAt:full?.generatedAt??null,
 sources:Object.fromEntries(cfg.merchants.map(k=>[k,{status:full?.sources?.[k]?.status==="ok"?"ok":"stale"}])),
 products:(full?.products||[]).filter(p=>ids.has(p.id)).map(p=>({id:p.id,name:p.name,merchant:p.merchant,category:p.category,available:p.available,staleSource:p.staleSource===true,marketEligible:p.marketEligible!==false,priceCzk:p.priceCzk,priceCurrency:p.priceCurrency,productUrl:p.productUrl,affiliateUrl:p.affiliateUrl,description:p.merchant==="powerqueen_eu"?p.description:"",specs:{voltageV:p.specs.voltageV,batteryType:p.specs.batteryType,capacityAh:p.specs.capacityAh,capacityWh:p.specs.capacityWh,currentA:p.specs.currentA,powerW:p.specs.powerW,...(p.specs.bmsContinuousCurrentA!=null?{bmsContinuousCurrentA:p.specs.bmsContinuousCurrentA}:{})}}))};
}
export async function loadMarketBatteryCalculatorOffers(locale,fetchImpl=fetch,timeoutMs=15000){
 if(!config(locale))return null;
 try{const response=await fetchImpl(`/data/battery-calculator-offers-${locale}.json`,{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(timeoutMs)});
 if(!response.ok)return null;
 const payload=await response.json();return acceptMarketBatterySnapshot(locale,payload)?payload:null;
 }catch{return null;}
}
