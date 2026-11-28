import { addVerifiedVictronChargingProfiles } from "./victron-orion-charging-profiles.js";
const MAX_AGE=72*3600000;
const config=locale=>locale==="sk"?{market:"sk-SK",currency:"EUR",merchant:"padabo_sk"}:locale==="pl"?{market:"pl-PL",currency:"PLN",merchant:"padabo_pl"}:null;
const MODELS=Object.freeze({
  "padabo_sk:26963_28360": {
    "name": "Nabíjačka Victron Energy Orion-Tr Smart DC-DC neizolovaná variant 12/12 V, 30 A",
    "url": "https://www.padabo.sk/nabijacka-victron-energy-orion-tr-smart-dc-dc-neizolovana_z26963/",
    "bid": "7aed5c13",
    "input": 12,
    "output": 12,
    "amps": 30,
    "model": "Orion-Tr Smart 12/12-30 A",
    "variant": true,
    "isolated": false
  },
  "padabo_sk:101357": {
    "name": "DC-DC neizolovaná nabíjačka Victron Energy Orion XS 12/12-50 A",
    "url": "https://www.padabo.sk/dc-dc-neizolovana-nabijacka-victron-energy-orion-xs-12-12-50-a_z101357/",
    "bid": "7aed5c13",
    "input": 12,
    "output": 12,
    "amps": 50,
    "model": "Orion XS 12/12-50 A",
    "variant": false,
    "isolated": false
  },
  "padabo_sk:107361": {
    "name": "Izolovaná nabíjačka Victron Energy Orion-Tr Smart 12/24-10A 240 W (DC-DC)",
    "url": "https://www.padabo.sk/izolovana-nabijacka-victron-energy-orion-tr-smart-12-24-10a-240-w-dc-dc_z107361/",
    "bid": "7aed5c13",
    "input": 12,
    "output": 24,
    "amps": 10,
    "model": "Orion-Tr Smart 12/24-10 A",
    "variant": false,
    "isolated": true
  },
  "padabo_sk:107371": {
    "name": "Izolovaná nabíjačka Victron Energy Orion-Tr Smart 24/24-12A 280 W (DC-DC)",
    "url": "https://www.padabo.sk/izolovana-nabijacka-victron-energy-orion-tr-smart-24-24-12a-280-w-dc-dc_z107371/",
    "bid": "7aed5c13",
    "input": 24,
    "output": 24,
    "amps": 12,
    "model": "Orion-Tr Smart 24/24-12 A",
    "variant": false,
    "isolated": true
  },
  "padabo_pl:26963_28360": {
    "name": "Ładowarka Victron Energy Orion-Tr Smart DC-DC nieizolowana wersja 12/12 V, 30 A",
    "url": "https://www.padabo.pl/ladowarka-victron-energy-orion-tr-smart-dc-dc-nieizolowana_z26963/",
    "bid": "95d61abf",
    "input": 12,
    "output": 12,
    "amps": 30,
    "model": "Orion-Tr Smart 12/12-30 A",
    "variant": true,
    "isolated": false
  },
  "padabo_pl:101357": {
    "name": "Nieizolowana ładowarka DC-DC Victron Energy Orion XS 12/12-50 A",
    "url": "https://www.padabo.pl/nieizolowana-ladowarka-dc-dc-victron-energy-orion-xs-12-12-50-a_z101357/",
    "bid": "95d61abf",
    "input": 12,
    "output": 12,
    "amps": 50,
    "model": "Orion XS 12/12-50 A",
    "variant": false,
    "isolated": false
  },
  "padabo_pl:107361": {
    "name": "Ładowarka DC-DC Victron Energy Orion-Tr Smart 12/24-10A 240 W izolowana",
    "url": "https://www.padabo.pl/ladowarka-dc-dc-victron-energy-orion-tr-smart-12-24-10a-240-w-izolowana_z107361/",
    "bid": "95d61abf",
    "input": 12,
    "output": 24,
    "amps": 10,
    "model": "Orion-Tr Smart 12/24-10 A",
    "variant": false,
    "isolated": true
  },
  "padabo_pl:107371": {
    "name": "Ładowarka DC-DC Victron Energy Orion-Tr Smart 24/24-12A 280 W izolowana",
    "url": "https://www.padabo.pl/ladowarka-dc-dc-victron-energy-orion-tr-smart-24-24-12a-280-w-izolowana_z107371/",
    "bid": "95d61abf",
    "input": 24,
    "output": 24,
    "amps": 12,
    "model": "Orion-Tr Smart 24/24-12 A",
    "variant": false,
    "isolated": true
  }
});
function generated(payload){
 const stamp=payload?.generatedAt;
 if(typeof stamp!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(stamp))return NaN;
 const date=Date.parse(stamp);
 return Number.isFinite(date)&&new Date(date).toISOString().slice(0,19)===stamp.slice(0,19)?date:NaN;
}
export function marketDcdcExpiresAt(payload){const d=generated(payload);return Number.isFinite(d)?d+MAX_AGE:null;}
function proof(p){
 const m=Object.hasOwn(MODELS,p.id)?MODELS[p.id]:null,s=p.specs;
 if(!m||!s||p.name!==m.name||p.productUrl!==m.url||s.currentA!==m.amps)return null;
 try{const a=new URL(p.affiliateUrl);
 if(a.origin!=="https://ehub.cz"||a.pathname!=="/system/scripts/click.php"||a.username||a.password||a.hash||a.searchParams.size!==3||["a_aid","a_bid","desturl"].some(k=>a.searchParams.getAll(k).length!==1)||a.searchParams.get("a_aid")!=="f34c86c8"||a.searchParams.get("a_bid")!==m.bid||a.searchParams.get("desturl")!==m.url)return null;
 }catch{return null;}
 const specs=addVerifiedVictronChargingProfiles(p,{currentA:s.currentA,voltageV:s.voltageV,chargingInputVoltagesV:s.chargingInputVoltagesV,chargingVoltagesV:s.chargingVoltagesV});
 if(!specs.chargingProfileEvidenceUrl||specs.chargingInputVoltagesV?.[0]!==m.input||specs.chargingVoltagesV?.[0]!==m.output)return null;
 return {...m,chargingProfileEvidenceUrl:specs.chargingProfileEvidenceUrl};
}
function reviewed(locale,payload,now){
 const cfg=config(locale),date=generated(payload);
 if(!cfg||payload?.market!==cfg.market||!Array.isArray(payload.products)||payload.sources?.[cfg.merchant]?.status!=="ok"||!Number.isFinite(date)||date>now||now-date>=MAX_AGE)return [];
 const counts=new Map();
 for(const p of payload.products)counts.set(p?.id,(counts.get(p?.id)||0)+1);
 return payload.products.filter(p=>p&&counts.get(p.id)===1&&p.merchant===cfg.merchant&&p.category==="dc_charger"&&p.available===true&&p.staleSource!==true&&p.marketEligible!==false&&p.priceCurrency===cfg.currency&&Number.isFinite(p.priceCzk)&&p.priceCzk>0).map(p=>({...p,model:proof(p)})).filter(p=>p.model);
}
export function acceptMarketDcdcSnapshot(locale,payload){
 const cfg=config(locale);
 return Boolean(cfg&&payload?.schemaVersion===1&&payload.projection==="dc_charger"&&payload.market===cfg.market&&Number.isFinite(generated(payload))&&["ok","stale"].includes(payload.sources?.[cfg.merchant]?.status)&&Array.isArray(payload.products)&&payload.products.length<=4&&payload.products.every(p=>p&&p.merchant===cfg.merchant&&p.category==="dc_charger"&&p.priceCurrency===cfg.currency));
}
export function projectMarketDcdcOffers(locale,full,now=Date.parse(full?.generatedAt)){
 const cfg=config(locale);if(!cfg)throw Error("UNKNOWN_DCDC_MARKET");
 const ids=new Set(reviewed(locale,full,now).map(p=>p.id));
 return {schemaVersion:1,projection:"dc_charger",market:cfg.market,generatedAt:full?.generatedAt??null,sources:{[cfg.merchant]:{status:full?.sources?.[cfg.merchant]?.status==="ok"?"ok":"stale"}},products:(full?.products||[]).filter(p=>ids.has(p.id)).map(p=>({id:p.id,name:p.name,merchant:p.merchant,category:p.category,available:p.available,staleSource:p.staleSource===true,marketEligible:p.marketEligible!==false,priceCzk:p.priceCzk,priceCurrency:p.priceCurrency,productUrl:p.productUrl,affiliateUrl:p.affiliateUrl,specs:{currentA:p.specs.currentA,voltageV:p.specs.voltageV,chargingInputVoltagesV:p.specs.chargingInputVoltagesV,chargingVoltagesV:p.specs.chargingVoltagesV}}))};
}
export function selectMarketDcdcOffers(locale,payload,r,now=Date.now()){
 if(!acceptMarketDcdcSnapshot(locale,payload)||![12,24].includes(r?.batteryVoltage)||![r.sourceVoltage,r.spareAlternatorCurrentA,r.batteryMaxChargeCurrentA,r.efficiencyPercent,r.recommendedChargerCurrentA,r.feasibleOutputCurrentA,r.batteryCapacityAh,r.replenishPercent,r.targetDriveHours].every(v=>Number.isFinite(v)&&v>0)||r.efficiencyPercent>100||r.replenishPercent>100)return [];
 const input=r.sourceVoltage>=12.5&&r.sourceVoltage<=15.5?12:r.sourceVoltage>=25&&r.sourceVoltage<=30?24:null;
 if(!input)return [];
 // Use charging voltage, not nominal battery voltage, for the more conservative buyer filter.
 // This is still only a model: manufacturer input current and actual charging voltage must be checked.
 const ceiling=Math.min(r.feasibleOutputCurrentA,r.recommendedChargerCurrentA,r.batteryMaxChargeCurrentA,r.spareAlternatorCurrentA*r.sourceVoltage*(r.efficiencyPercent/100)/(r.batteryVoltage===12?14.6:29.2));
 return reviewed(locale,payload,now).filter(p=>p.model.input===input&&p.model.output===r.batteryVoltage&&p.model.amps<=ceiling).sort((a,b)=>b.model.amps-a.model.amps||a.priceCzk-b.priceCzk).slice(0,3);
}
export function marketDcdcTiming(r,offer){
 const hours=r.batteryCapacityAh*r.replenishPercent/100/offer.model.amps;
 return {minimumHours:Math.ceil(hours*10-1e-10)/10,meets:hours<=r.targetDriveHours+1e-9};
}
export function isMarketDcdcStillEligible(locale,payload,result,offer,now=Date.now()){
 return selectMarketDcdcOffers(locale,payload,result,now).some(p=>p.id===offer?.id&&p.priceCzk===offer.priceCzk&&p.affiliateUrl===offer.affiliateUrl);
}
export async function loadMarketDcdcOffers(locale,fetchImpl=fetch,timeoutMs=15000){
 if(!config(locale))return null;
 try{const response=await fetchImpl(`/data/dcdc-calculator-offers-${locale}.json`,{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(timeoutMs)});if(!response.ok)return null;const payload=await response.json();return acceptMarketDcdcSnapshot(locale,payload)?payload:null;}catch{return null;}
}
