import {loadShoreOffers,selectShoreOffers} from "./shore-calculator-offers.js?v=20261128-photo1";
import {decorateAwinAffiliateUrl} from "./awin-attribution.js?v=20261115-placement-subids1";
import {buildAttributedAffiliateParameters} from "./affiliate-analytics.js?v=20261115-placement-events1";
import {createVerifiedGuideImpressionTracker} from "./guide-offer-impressions.js?v=20261115-placement-events1";
const COPY={
 cs:{merchant:"svetkaravanu",currency:"CZK",loading:"Ověřujeme aktuální nabídky…",empty:"Pro tento cíl nemáme čerstvou odpovídající nabídku LiFePO₄. Neměňte limity jen kvůli nákupu.",chemistry:"Přímé porovnání zatím pokrývá pouze LiFePO₄ s doloženým rozsahem kapacity. Pro AGM využijte Builder a návod výrobce.",expired:"Nabídka už není aktuální. Spusťte výpočet znovu.",price:" · cena z posledního feedu",time:"Ideální minimum",input:"Modelový odběr AC",variant:"V obchodě vyberte přesně",manual:"Dokumentace výrobce",link:"Ověřit cenu a variantu →",affiliate:"Affiliate odkaz",merchantName:"SvětKaravanů",lowest:"Nejnižší cena z vyhovujících",family:"Fotografie produktové řady",priceLabel:"Cena z posledního feedu"},
 sk:{merchant:"padabo_sk",currency:"EUR",loading:"Overujeme aktuálne ponuky…",empty:"Pre tento cieľ nemáme čerstvú zodpovedajúcu ponuku LiFePO₄. Nemeňte limity len kvôli nákupu.",chemistry:"Priame porovnanie zatiaľ pokrýva iba LiFePO₄ s doloženým rozsahom kapacity. Pre AGM použite Builder a návod výrobcu.",expired:"Ponuka už nie je aktuálna. Spustite výpočet znova.",price:" · cena z posledného feedu",time:"Ideálne minimum",input:"Modelový odber AC",variant:"V obchode vyberte presne",manual:"Dokumentácia výrobcu",link:"Overiť cenu a variant →",affiliate:"Affiliate odkaz",merchantName:"Padabo.sk",lowest:"Najnižšia cena z vyhovujúcich",family:"Fotografia produktového radu",priceLabel:"Cena z posledného feedu"},
 pl:{merchant:"padabo_pl",currency:"PLN",loading:"Sprawdzamy aktualne oferty…",empty:"Nie mamy aktualnej pasującej oferty LiFePO₄ dla tego celu. Nie zmieniaj limitów tylko po to, aby kupić produkt.",chemistry:"Bezpośrednie porównanie obejmuje na razie tylko LiFePO₄ z udokumentowanym zakresem pojemności. Dla AGM użyj kreatora i instrukcji producenta.",expired:"Oferta straciła ważność. Uruchom obliczenie ponownie.",price:" · cena z ostatniego feedu",time:"Idealne minimum",input:"Modelowy prąd AC",variant:"W sklepie wybierz dokładnie",manual:"Dokumentacja producenta",link:"Sprawdź cenę i wariant →",affiliate:"Link afiliacyjny",merchantName:"Padabo.pl",lowest:"Najniższa cena spośród pasujących",family:"Zdjęcie serii produktów",priceLabel:"Cena z ostatniego feedu"}
};
export function mountShoreBuyers(root){
 const locale=root.dataset.locale,c=COPY[locale],section=root.querySelector("[data-shore-buyers]");
 if(!c||!section)return null;
 const doc=root.ownerDocument,list=section.querySelector("[data-shore-offer-list]"),message=section.querySelector("[data-shore-offer-message]");
 const tracker=createVerifiedGuideImpressionTracker({documentRoot:doc,sections:[section],getAnalytics:()=>window.MyPowerSetupAnalytics,allowedSources:["shore-calculator-compare"],allowedMerchants:[c.merchant]});
 const price=new Intl.NumberFormat(locale,{style:"currency",currency:c.currency}),num=new Intl.NumberFormat(locale,{maximumFractionDigits:2});
 const up=n=>Math.ceil(n*100-1e-8)/100;
 let version=0,active=null,timer;
 const add=(parent,tag,text,cls)=>{const x=doc.createElement(tag);x.textContent=text;if(cls)x.className=cls;parent.append(x);return x;};
 function clear(){version++;active=null;clearTimeout(timer);list.replaceChildren();list.hidden=true;message.hidden=true;section.hidden=true;section.dataset.liveOffers="0";tracker?.scan();}
 function empty(value){list.replaceChildren();list.hidden=true;message.textContent=value;message.hidden=false;section.hidden=false;section.dataset.liveOffers="0";tracker?.scan();}
 async function update(input){
  clear();active=Object.freeze({...input});const token=version;
  section.hidden=false;
  if(input.batteryType!=="lifepo4"){empty(c.chemistry);return;}
  empty(c.loading);const payload=await loadShoreOffers(locale);
  if(token!==version||!active)return;
  const offers=selectShoreOffers(locale,payload,active,Date.now());
  if(!offers.length){empty(c.empty);return;}
  for(const [index,p] of offers.entries()){
   const li=doc.createElement("li");
   if(index===0&&offers.length>1)add(li,"span",c.lowest,"shore-offer-lowest");
   const header=doc.createElement("div");header.className="shore-offer-header";li.append(header);
   if(p.imageUrl){
    const figure=doc.createElement("figure");figure.className="shore-offer-photo";
    const image=doc.createElement("img");image.width=102;image.height=102;image.loading="lazy";image.decoding="async";image.referrerPolicy="no-referrer";
    const family=p.model.startsWith("Carbest ");
    image.alt=family?"Carbest":p.model;image.addEventListener("error",()=>figure.remove(),{once:true});
    figure.append(image);if(family)add(figure,"figcaption",c.family);header.append(figure);image.src=p.imageUrl;
   }
   const facts=doc.createElement("div");facts.className="shore-offer-heading";header.append(facts);
   add(facts,"strong",p.model+" · "+p.voltage+" V / "+p.amps+" A");
   add(facts,"span",c.merchantName,"shore-offer-merchant");
   add(facts,"span",price.format(p.price),"shore-offer-price");
   add(facts,"small",c.priceLabel);
   const fit=doc.createElement("div");fit.className="shore-offer-fit";li.append(fit);
   for(const [label,value] of [[c.time,num.format(up(p.minimumHours))+" h"],[c.input,num.format(up(p.inputA))+" A"]]){
    const cell=doc.createElement("div");add(cell,"small",label);add(cell,"strong",value);fit.append(cell);
   }
   add(li,"span",c.variant+" "+p.model+" ("+p.minAh+"–"+p.maxAh+" Ah).");
   const manual=add(li,"a",c.manual,"shore-offer-manual");manual.href=p.manual;manual.target="_blank";manual.rel="noopener noreferrer";
   const link=add(li,"a",c.link,"shore-offer-link");link.href=decorateAwinAffiliateUrl(p.affiliateUrl,{market:locale==="cs"?"cz":locale,category:"shore_charger",source:"product-card",placement:"shore_calculator"});
   link.target="_blank";link.rel="sponsored noopener noreferrer";link.dataset.affiliateClick="";link.dataset.productId=p.id;link.dataset.category="shore_charger";link.dataset.merchant=p.merchant;link.dataset.source="shore-calculator-compare";link.dataset.offerExpiresAt=String(p.expiry);
   li.insertBefore(link,manual);add(li,"small",c.affiliate);
   const check=event=>{if(event.defaultPrevented||(event.type==="auxclick"?event.button!==1:event.button!==0&&event.button!==undefined))return;
    if(token!==version||!active||!selectShoreOffers(locale,payload,active,Date.now()).some(x=>x.id===p.id&&x.price===p.price&&x.affiliateUrl===p.affiliateUrl)){event.preventDefault();event.stopPropagation();empty(c.expired);return;}
    window.MyPowerSetupAnalytics?.track?.("affiliate_click",buildAttributedAffiliateParameters(link));};
   link.addEventListener("click",check);link.addEventListener("auxclick",check);list.append(li);
  }
  message.hidden=true;list.hidden=false;section.dataset.liveOffers=String(offers.length);tracker?.scan();
  timer=setTimeout(()=>{if(token===version)empty(c.expired);},Math.max(1,Math.min(...offers.map(x=>x.expiry))-Date.now()+1));
 }
 doc.addEventListener("visibilitychange",()=>{if(!doc.hidden&&active)void update(active);});
 window.addEventListener("focus",()=>{if(active)void update(active);});
 return {update,clear};
}
