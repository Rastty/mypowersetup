import { verifiedBatteryContinuousDischargeAmps } from "./caravan-bms-manufacturer-proof.js?v=20261122-pq200a1-24vhigh1-pq100a1";
// Manufacturer charge and discharge ratings are DIFFERENT. The exact
// SuperPack NG 100Ah models have a recommended charging current of 30A and
// max continuous charging current 100A, not the 50A recommended discharge.
// https://www.victronenergy.com/media/pg/Lithium_SuperPack_NG/en/technical-data.html
const EVIDENCE="https://www.victronenergy.com/media/pg/Lithium_SuperPack_NG/en/technical-data.html";
const CHARGING=Object.freeze({
 BAT512110740:{recommendedA:30,maxA:100,voltageV:12},
 BAT524110740:{recommendedA:30,maxA:100,voltageV:24},
});
const CATEGORIES=["controller","dc_charger","shore_charger"];
export function reviewedBatteryChargingLimit(battery){
 if(!battery||battery.staleSource===true||battery.marketEligible===false
   ||(battery.recommendedQuantity??1)!==1||verifiedBatteryContinuousDischargeAmps(battery)!==50)return null;
 const s=battery.specs,m=CHARGING[s.bmsManufacturerModel];
 if(!m||s.bmsManufacturerEvidenceUrl!==EVIDENCE||s.capacityAh!==100||s.voltageV!==m.voltageV)return null;
 return {...m,model:s.bmsManufacturerModel,evidenceUrl:EVIDENCE};
}
// This is a conservative SUM OF NAMEPLATE output-current ratings, not a
// prediction of simultaneous delivered current or configured charge settings.
// Do not use panel watts, inverter discharge current or minimum calculated Ah
// to infer charge limits. Unavailable/missing rows and non-single quantities
// are explicitly unknown, never treated as zero.
export function reviewConcurrentCharging(items){
 if(!Array.isArray(items))return null;
 const sources=items.filter(x=>CATEGORIES.includes(x.category));
 if(!sources.length)return null;
 const battery=items.find(x=>x.category==="battery"&&x.ready!==false)?.product;
 const limit=reviewedBatteryChargingLimit(battery);
 const components=sources.map(({category,product,ready,quantity})=>{
  const a=product?.specs?.currentA;
  return {category,amps:ready!==false&&product&&(quantity??product.recommendedQuantity??1)===1
    &&Number.isFinite(a)&&a>0?a:null};
 });
 const known=components.filter(c=>c.amps!==null);
 const sumA=Number(known.reduce((n,c)=>n+c.amps,0).toFixed(2));
 const allKnown=known.length===components.length;
 let status="unknown";
 if(limit&&sumA>limit.maxA)status="over_max";
 else if(limit&&sumA>limit.recommendedA)status="over_recommended";
 else if(limit&&allKnown)status="within_nameplate_limit";
 return {status,components,sumA,allKnown,limit};
}
const COPY={
 cs:{labels:{controller:"MPPT",dc_charger:"DC–DC",shore_charger:"síť"},title:"Kontrola souběžného nabíjení",known:"Součet jmenovitých výstupních proudů",partial:"Známá část součtu",unknown:"Nedoložený proud",limit:"Výrobce baterie: doporučeno",max:"max. trvale",over:"Součet překračuje maximální trvalý nabíjecí proud. Kompletní balíček není potvrzen, dokud odborník nenavrhne koordinované omezení zdrojů.",advice:"Součet překračuje doporučený nabíjecí proud. Ověřte nastavení všech zdrojů, aby souběžný proud odpovídal baterii.",ok:"Součet nepřekračuje doložený limit; nejde o ověření skutečného nastavení ani montáže.",missing:"Pro tuto baterii nemáme doložený nabíjecí limit nebo některý proud zdroje. Ověřte souběh u výrobce a odborníka.",proof:"Specifikace baterie"},
 sk:{labels:{controller:"MPPT",dc_charger:"DC–DC",shore_charger:"sieť"},title:"Kontrola súbežného nabíjania",known:"Súčet menovitých výstupných prúdov",partial:"Známa časť súčtu",unknown:"Nedoložený prúd",limit:"Výrobca batérie: odporúčané",max:"max. trvalo",over:"Súčet prekračuje maximálny trvalý nabíjací prúd. Kompletný balík nie je potvrdený, kým odborník nenavrhne koordinované obmedzenie zdrojov.",advice:"Súčet prekračuje odporúčaný nabíjací prúd. Overte nastavenie všetkých zdrojov.",ok:"Súčet neprekračuje doložený limit; nejde o overenie nastavenia ani montáže.",missing:"Pre túto batériu nemáme doložený nabíjací limit alebo niektorý prúd zdroja. Overte súbeh u výrobcu a odborníka.",proof:"Špecifikácia batérie"},
 pl:{labels:{controller:"MPPT",dc_charger:"DC–DC",shore_charger:"sieć"},title:"Kontrola jednoczesnego ładowania",known:"Suma znamionowych prądów wyjściowych",partial:"Znana część sumy",unknown:"Niepotwierdzony prąd",limit:"Producent akumulatora: zalecane",max:"maks. ciągły",over:"Suma przekracza maksymalny ciągły prąd ładowania. Kompletny zestaw nie jest potwierdzony, dopóki specjalista nie zaprojektuje skoordynowanego ograniczenia źródeł.",advice:"Suma przekracza zalecany prąd ładowania. Sprawdź ustawienia wszystkich źródeł.",ok:"Suma nie przekracza udokumentowanego limitu; nie jest to potwierdzenie ustawień ani montażu.",missing:"Brak udokumentowanego limitu ładowania akumulatora lub prądu źródła. Sprawdź jednoczesne ładowanie u producenta i specjalisty.",proof:"Specyfikacja akumulatora"}
};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export function concurrentChargeReviewMarkup(review,locale){
 const t=COPY[locale];if(!review||!t)return "";
 const f=n=>new Intl.NumberFormat(locale==="cs"?"cs-CZ":locale==="sk"?"sk-SK":"pl-PL",{maximumFractionDigits:2}).format(n);
 const parts=review.components.map(c=>t.labels[c.category]+": "+(c.amps===null?t.unknown:f(c.amps)+" A")).join(" · ");
 const summary=(review.allKnown?t.known:t.partial)+": "+f(review.sumA)+" A";
 const message=review.status==="over_max"?t.over:review.status==="over_recommended"?t.advice:review.status==="within_nameplate_limit"?t.ok:t.missing;
 const limit=review.limit;
 return `<div class="caravan-buying-plan-note" data-concurrent-charge-review="${esc(review.status)}"><strong>${esc(t.title)}</strong><p>${esc(summary)} · ${esc(parts)}</p>${limit?`<p>${esc(t.limit)} ${f(limit.recommendedA)} A; ${esc(t.max)} ${f(limit.maxA)} A. <a href="${esc(limit.evidenceUrl)}" target="_blank" rel="noopener noreferrer">${esc(t.proof)}</a></p>`:""}<p>${esc(message)}${!review.allKnown&&review.status!=="unknown"?" "+esc(t.missing):""}</p></div>`;
}
