import { buildAttributedAffiliateParameters } from "./affiliate-analytics.js?v=20261115-placement-events1";
import { decorateAwinAffiliateUrl } from "./awin-attribution.js?v=20261115-placement-subids1";
import { createVerifiedGuideImpressionTracker } from "./guide-offer-impressions.js?v=20261115-placement-events1";
import { loadMarketDcdcOffers,selectMarketDcdcOffers,marketDcdcExpiresAt,isMarketDcdcStillEligible,marketDcdcTiming } from "./market-dcdc-calculator-offers.js?v=20261128-market-dcdc1";
const COPY=Object.freeze({
 sk:{currency:"EUR",number:"sk-SK",loading:"Overujeme dostupné nabíjačky…",empty:"Pre zadané napätie a prúdový limit nemáme čerstvú overenú ponuku. Nezvyšujte limit len kvôli nákupu.",expired:"Ponuka už nie je aktuálna. Spustite nový výpočet.",price:" · cena z posledného feedu",link:"Overiť cenu a parametre →",output:" A výstup",isolated:"izolovaná",nonisolated:"neizolovaná",variant:"Na stránke predajcu vyberte variant 12/12 V, 30 A.",timing:"Ideálny dolný odhad: najmenej ",fit:" h; skutočné dobíjanie môže trvať dlhšie.",slow:" h; zadaný čas jazdy nestačí ani pri plnom prúde."},
 pl:{currency:"PLN",number:"pl-PL",loading:"Sprawdzamy dostępne ładowarki…",empty:"Nie mamy aktualnej zweryfikowanej oferty dla podanego napięcia i limitu prądu. Nie zwiększaj limitu tylko po to, aby kupić produkt.",expired:"Oferta straciła ważność. Uruchom obliczenie ponownie.",price:" · cena z ostatniego feedu",link:"Sprawdź cenę i parametry →",output:" A wyjściowe",isolated:"izolowana",nonisolated:"nieizolowana",variant:"Na stronie sprzedawcy wybierz wariant 12/12 V, 30 A.",timing:"Idealne minimum: ",fit:" h; rzeczywiste ładowanie może potrwać dłużej.",slow:" h; podany czas jazdy nie wystarczy nawet przy pełnym prądzie."}
});
export function mountMarketDcdcBuyers(root,{fetchImpl=globalThis.fetch,now=Date.now,windowRoot=globalThis.window}={}){
 const locale=root?.dataset?.calculatorLocale,copy=Object.hasOwn(COPY,locale)?COPY[locale]:null;
 const section=root?.querySelector?.("[data-dcdc-buyers]");
 if(!copy||!section||typeof fetchImpl!=="function")return null;
 const doc=section.ownerDocument,list=section.querySelector("[data-dcdc-offer-list]"),fallback=section.querySelector("[data-dcdc-offer-fallback]");
 if(!list||!fallback)return null;
 const merchant="padabo_"+locale;
 const tracker=createVerifiedGuideImpressionTracker({documentRoot:doc,sections:[section],getAnalytics:()=>windowRoot?.MyPowerSetupAnalytics,Observer:windowRoot?.IntersectionObserver,now,allowedSources:["dcdc-calculator-compare"],allowedMerchants:[merchant]});
 const price=new Intl.NumberFormat(copy.number,{style:"currency",currency:copy.currency}),number=new Intl.NumberFormat(copy.number,{maximumFractionDigits:1});
 let generation=0,active=null,timer=null;
 const append=(parent,tag,value,cls)=>{const node=doc.createElement(tag);node.textContent=value;if(cls)node.className=cls;parent.append(node);return node;};
 function clear(){if(timer!==null)windowRoot?.clearTimeout?.(timer);timer=null;list.replaceChildren();list.hidden=true;section.dataset.liveOffers="0";tracker?.scan();}
 function invalidate(){generation++;active=null;clear();section.hidden=true;}
 function empty(message){clear();fallback.textContent=message;fallback.hidden=false;section.hidden=false;}
 async function update(result){
  invalidate();if(!result)return;active=result;const token=generation;section.hidden=false;fallback.hidden=false;fallback.textContent=copy.loading;
  const payload=await loadMarketDcdcOffers(locale,fetchImpl);
  if(token!==generation||!active)return;
  const offers=selectMarketDcdcOffers(locale,payload,result,now()),expiry=marketDcdcExpiresAt(payload);
  if(!offers.length||!Number.isFinite(expiry)||expiry<=now()){empty(copy.empty);return;}
  for(const offer of offers){
   const m=offer.model,t=marketDcdcTiming(result,offer),item=doc.createElement("li");
   append(item,"strong",offer.name);
   append(item,"span",m.input+" → "+m.output+" V · "+m.amps+copy.output+" · "+(m.isolated?copy.isolated:copy.nonisolated),"calculator-mppt-offer-facts");
   append(item,"span",price.format(offer.priceCzk)+copy.price,"calculator-mppt-offer-facts");
   append(item,"span",copy.timing+number.format(t.minimumHours)+(t.meets?copy.fit:copy.slow),"calculator-mppt-offer-facts");
   if(m.variant)append(item,"span",copy.variant,"calculator-mppt-offer-facts");
   const link=append(item,"a",copy.link,"calculator-mppt-offer-link");
   link.href=decorateAwinAffiliateUrl(offer.affiliateUrl,{market:locale,category:"dc_charger",source:"product-card",placement:"dcdc_calculator"});
   link.target="_blank";link.rel="sponsored noopener noreferrer";link.dataset.affiliateClick="";link.dataset.productId=offer.id;link.dataset.merchant=merchant;link.dataset.category="dc_charger";link.dataset.source="dcdc-calculator-compare";link.dataset.ctaVariant=t.meets?"dcdc-ideal-target-only":"dcdc-longer-drive";link.dataset.offerExpiresAt=String(expiry);
   const click=event=>{if(event.defaultPrevented||(event.type==="auxclick"?event.button!==1:event.button!==0&&event.button!==undefined))return;
    if(token!==generation||!active||section.hidden||!isMarketDcdcStillEligible(locale,payload,active,offer,now())){event.preventDefault();event.stopPropagation();empty(copy.expired);return;}
    windowRoot?.MyPowerSetupAnalytics?.track?.("affiliate_click",buildAttributedAffiliateParameters(link));};
   link.addEventListener("click",click);link.addEventListener("auxclick",click);list.append(item);
  }
  fallback.hidden=true;list.hidden=false;section.dataset.liveOffers=String(list.childElementCount);tracker?.scan();
  timer=windowRoot?.setTimeout?.(()=>{if(token===generation)empty(copy.expired);},Math.max(1,expiry-now()+1))??null;
 }
 doc.addEventListener?.("visibilitychange",()=>{if(!doc.hidden&&active)void update(active);});
 windowRoot?.addEventListener?.("focus",()=>{if(active)void update(active);});
 return Object.freeze({update,invalidate});
}
