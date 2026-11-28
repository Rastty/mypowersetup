import { addVerifiedSmartSolarChargingProfiles } from "./victron-smartsolar-charging-profiles.js";
const MAX_AGE=72*3600000;
const config=locale=>locale==="sk"?{market:"sk-SK",currency:"EUR",merchant:"padabo_sk"}:locale==="pl"?{market:"pl-PL",currency:"PLN",merchant:"padabo_pl"}:null;
const BLUE=Object.freeze({
  "padabo_sk:101984": {
    "name": "Solárny regulátor MPPT Victron Energy BlueSolar 100/30",
    "url": "https://www.padabo.sk/solarny-regulator-mppt-victron-energy-bluesolar-100-30_z101984/",
    "bid": "7aed5c13"
  },
  "padabo_pl:101984": {
    "name": "Kontroler słoneczny MPPT Victron Energy BlueSolar 100/30",
    "url": "https://www.padabo.pl/kontroler-sloneczny-mppt-victron-energy-bluesolar-100-30_z101984/",
    "bid": "95d61abf"
  }
});
const BLUE_TECH="https://www.victronenergy.com/media/pg/Manual_BlueSolar_100-30__100-50/en/technical-specifications.html";
const BLUE_PROFILE="https://www.victronenergy.com/media/pg/Manual_BlueSolar_100-30__100-50/en/configuration-and-settings.html";
function generated(payload){
 const stamp=payload?.generatedAt;
 if(typeof stamp!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(stamp))return NaN;
 const date=Date.parse(stamp);
 return Number.isFinite(date)&&new Date(date).toISOString().slice(0,19)===stamp.slice(0,19)?date:NaN;
}
export function marketMpptExpiresAt(payload){const d=generated(payload);return Number.isFinite(d)?d+MAX_AGE:null;}
function proof(p){
 const raw=p.specs,blue=BLUE[p.id];
 if(!raw||typeof raw.currentA!=="number")return null;
 if(!blue){
  // Use only the independently reviewed fields, not arbitrary pre-enriched feed values.
  const specs=addVerifiedSmartSolarChargingProfiles(p,{currentA:raw.currentA});
  return specs.chargingProfileEvidenceUrl?specs:null;
 }
 if(p.name!==blue.name||p.productUrl!==blue.url||raw.currentA!==30)return null;
 try{const a=new URL(p.affiliateUrl);
 if(a.origin!=="https://ehub.cz"||a.pathname!=="/system/scripts/click.php"||a.username||a.password||a.hash||a.searchParams.size!==3||["a_aid","a_bid","desturl"].some(k=>a.searchParams.getAll(k).length!==1)||a.searchParams.get("a_aid")!=="f34c86c8"||a.searchParams.get("a_bid")!==blue.bid||a.searchParams.get("desturl")!==blue.url)return null;
 }catch{return null;}
 return {currentA:30,systemVoltagesV:[12,24],maxPvWattsBySystemVoltage:{12:440,24:880},maxPvVocV:100,maxPvIscA:35,chargingBatteryTypes:["lifepo4","lead"],chargingProfileEvidenceUrl:BLUE_PROFILE,mpptTechnicalEvidenceUrl:BLUE_TECH};
}
function reviewed(locale,payload,now){
 const cfg=config(locale),date=generated(payload);
 if(!cfg||payload?.market!==cfg.market||!Array.isArray(payload.products)||payload.sources?.[cfg.merchant]?.status!=="ok"||!Number.isFinite(date)||date>now||now-date>=MAX_AGE)return [];
 const counts=new Map();
 for(const p of payload.products)counts.set(p?.id,(counts.get(p?.id)||0)+1);
 return payload.products.filter(p=>p&&counts.get(p.id)===1&&p.merchant===cfg.merchant&&p.category==="controller"&&["24828","101984","101985"].some(id=>p.id===cfg.merchant+":"+id)&&p.available===true&&p.staleSource!==true&&p.marketEligible!==false&&p.priceCurrency===cfg.currency&&Number.isFinite(p.priceCzk)&&p.priceCzk>0).map(p=>({...p,specs:proof(p)})).filter(p=>p.specs);
}
export function acceptMarketMpptSnapshot(locale,payload){
 const cfg=config(locale);
 return Boolean(cfg&&payload?.schemaVersion===1&&payload.projection==="controller"&&payload.market===cfg.market&&Number.isFinite(generated(payload))&&["ok","stale"].includes(payload.sources?.[cfg.merchant]?.status)&&Array.isArray(payload.products)&&payload.products.length<=3&&payload.products.every(p=>p&&p.merchant===cfg.merchant&&p.category==="controller"&&p.priceCurrency===cfg.currency));
}
export function projectMarketMpptOffers(locale,full,now=Date.parse(full?.generatedAt)){
 const cfg=config(locale);if(!cfg)throw Error("UNKNOWN_MPPT_MARKET");
 const ids=new Set(reviewed(locale,full,now).map(p=>p.id));
 return {schemaVersion:1,projection:"controller",market:cfg.market,generatedAt:full?.generatedAt??null,sources:{[cfg.merchant]:{status:full?.sources?.[cfg.merchant]?.status==="ok"?"ok":"stale"}},products:(full?.products||[]).filter(p=>ids.has(p.id)).map(p=>({id:p.id,name:p.name,merchant:p.merchant,category:p.category,available:p.available,staleSource:p.staleSource===true,marketEligible:p.marketEligible!==false,priceCzk:p.priceCzk,priceCurrency:p.priceCurrency,productUrl:p.productUrl,affiliateUrl:p.affiliateUrl,specs:{currentA:p.specs.currentA}}))};
}
export function selectMarketMpptOffers(locale,payload,c,now=Date.now()){
 if(!acceptMarketMpptSnapshot(locale,payload)||![12,24].includes(c?.systemVoltage)||!Number.isSafeInteger(c.panelWatts)||c.panelWatts<50||c.panelWatts>5000||c.panelWatts%10||!Number.isSafeInteger(c.controllerAmps)||c.controllerAmps<10||c.controllerAmps>500||c.controllerAmps%10||!["lifepo4","lead"].includes(c.batteryType))return [];
 return reviewed(locale,payload,now).filter(p=>p.specs.systemVoltagesV.includes(c.systemVoltage)&&p.specs.chargingBatteryTypes.includes(c.batteryType)&&p.specs.currentA>=c.controllerAmps&&p.specs.maxPvWattsBySystemVoltage[c.systemVoltage]>=c.panelWatts).sort((a,b)=>a.specs.currentA-b.specs.currentA||a.priceCzk-b.priceCzk).slice(0,3);
}
export function isMarketMpptStillEligible(locale,payload,result,offer,now=Date.now()){
 return selectMarketMpptOffers(locale,payload,result,now).some(p=>p.id===offer?.id&&p.priceCzk===offer.priceCzk&&p.affiliateUrl===offer.affiliateUrl);
}
export async function loadMarketMpptOffers(locale,fetchImpl=fetch,timeoutMs=15000){
 if(!config(locale))return null;
 try{const response=await fetchImpl(`/data/mppt-calculator-offers-${locale}.json`,{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(timeoutMs)});if(!response.ok)return null;const payload=await response.json();return acceptMarketMpptSnapshot(locale,payload)?payload:null;}catch{return null;}
}
