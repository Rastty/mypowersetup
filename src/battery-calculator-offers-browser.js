import { buildAttributedAffiliateParameters } from "./affiliate-analytics.js?v=20261115-placement-events1";
import { decorateAwinAffiliateUrl } from "./awin-attribution.js?v=20261115-placement-subids1";
import { loadCalculatorOffers } from "./calculator-offer-catalog.js?v=20261109-lightweight-cz1";
import { createVerifiedGuideImpressionTracker } from "./guide-offer-impressions.js?v=20261115-placement-events1";
import {
  batteryOfferExpiresAt, isBatteryOfferStillEligible, selectBatteryCalculatorOffers,
} from "./battery-calculator-offers.js";
import { loadMarketBatteryCalculatorOffers,selectMarketBatteryCalculatorOffers,marketBatteryOfferExpiresAt,isMarketBatteryOfferStillEligible } from "./market-battery-calculator-offers.js?v=20261127-market-battery1";
const MARKET_COPY={
 sk:{currency:"EUR",numberLocale:"sk-SK",merchants:["padabo_sk","powerqueen_eu"],loading:"Overujeme aktuálne ponuky konkrétnych batérií…",empty:"Pre túto kapacitu, napätie a chémiu teraz nemáme čerstvú overenú samostatnú batériu. Pokračujte do Buildera; viac batérií automaticky nespájame.",expired:"Platnosť ponúk vypršala. Spustite nový výpočet.",price:" · cena z posledného feedu",link:"Overiť cenu a technické parametre →",current:" A podľa výrobcu (overte skutočné zaťaženie)"},
 pl:{currency:"PLN",numberLocale:"pl-PL",merchants:["padabo_pl"],loading:"Sprawdzamy aktualne oferty konkretnych akumulatorów…",empty:"Dla tej pojemności, napięcia i chemii nie mamy aktualnego zweryfikowanego pojedynczego akumulatora. Przejdź do Buildera; nie łączymy automatycznie kilku akumulatorów.",expired:"Dane ofert straciły ważność. Uruchom obliczenie ponownie.",price:" · cena z ostatniego feedu",link:"Sprawdź cenę i parametry techniczne →",current:" A według producenta (sprawdź rzeczywiste obciążenie)"}
};

const CARD_COPY={
 cs:{merchants:{vselektro:"VSelektro.eu"},capacity:"Kapacita",margin:"Nad požadované minimum",current:"Doložený trvalý / nešpičkový limit",runtime:"Modelová výdrž bez dobíjení",day:"d",price:"Cena z posledního feedu",link:"Ověřit cenu a dostupnost →",affiliate:"Affiliate odkaz",lowest:"Nejnižší cena ze zobrazených",count:n=>n+" odpovídající nabídky podle kapacity",fit:"Kapacitně vyhovuje",details:"Ověřte BMS, nabíjení a montáž. Výpočet výdrže používá 80 % využitelnosti a 15 % rezervu; nejde o měřenou výdrž.",spec:"Parametry výrobce",mount:"Podsedadlový model – ověřte rozměry."},
 sk:{merchants:{padabo_sk:"Padabo.sk",powerqueen_eu:"Power Queen EU"},capacity:"Kapacita",margin:"Nad požadované minimum",current:"Doložený trvalý / nešpičkový limit",runtime:"Modelová výdrž bez dobíjania",day:"d",price:"Cena z posledného feedu",link:"Overiť cenu a dostupnosť →",affiliate:"Affiliate odkaz",lowest:"Najnižšia cena zo zobrazených",count:n=>n+" ponuky podľa kapacity",fit:"Kapacitne vyhovuje",details:"Overte BMS, nabíjanie a montáž. Výdrž používa 80 % využiteľnosti a 15 % rezervu; nejde o meranú výdrž.",spec:"Údaje výrobcu",mount:"Podsedadlový model – overte rozmery."},
 pl:{merchants:{padabo_pl:"Padabo.pl"},capacity:"Pojemność",margin:"Ponad wymagane minimum",current:"Udokumentowany limit ciągły / nieszczytowy",runtime:"Modelowy czas bez ładowania",day:"d",price:"Cena z ostatniego feedu",link:"Sprawdź cenę i dostępność →",affiliate:"Link afiliacyjny",lowest:"Najniższa cena spośród pokazanych",count:n=>n+" ofert według pojemności",fit:"Spełnia wymóg pojemności",details:"Sprawdź BMS, ładowanie i montaż. Model czasu pracy przyjmuje 80% użyteczności i 15% zapasu; nie jest to pomiar.",spec:"Dane producenta",mount:"Model pod siedzenie – sprawdź wymiary."}
};
// Exact photos observed in the corresponding approved full merchant feed
// on 2026-11-28. Never use an arbitrary feed URL or a similar-model photo.
// CZ photos were not established in the compact projection; omit them.
const BATTERY_PHOTOS=Object.freeze({
 "padabo_sk:26753":"https://data.svetkaravanu.cz/data/tmp/102/8/152518_102.jpg?1704379090_1",
 "padabo_sk:26754":"https://data.svetkaravanu.cz/data/tmp/102/0/152520_102.jpg?1704379091_1",
 "padabo_sk:26755":"https://data.svetkaravanu.cz/data/tmp/102/2/152522_102.jpg?1704379091_1",
 "padabo_sk:107358":"https://data.svetkaravanu.cz/data/tmp/102/8/191118_102.jpg?1772808346_1",
 "padabo_pl:26753":"https://data.svetkaravanu.cz/data/tmp/102/8/152518_102.jpg?1704379090_1",
 "padabo_pl:26754":"https://data.svetkaravanu.cz/data/tmp/102/0/152520_102.jpg?1704379091_1",
 "padabo_pl:26755":"https://data.svetkaravanu.cz/data/tmp/102/2/152522_102.jpg?1704379091_1",
 "padabo_pl:107358":"https://data.svetkaravanu.cz/data/tmp/102/8/191118_102.jpg?1772808346_1",
 "powerqueen_eu:7881294676188":"https://cdn.shopify.com/s/files/1/0652/8086/8572/files/PQ-25.6V200Ah-A250.webp?v=1773826393",
 "powerqueen_eu:7752840380636":"https://cdn.shopify.com/s/files/1/0652/8086/8572/files/PQ-25.6V100Ah-A160.webp?v=1773826324",
 "powerqueen_eu:7752838578396":"https://cdn.shopify.com/s/files/1/0652/8086/8572/files/PQ-12.8V200Ah-Plus-A160.webp?v=1749462405"
});
const UNDER_SEAT=new Set(["vselektro:sunstone-slpo12-200m-hc200a","padabo_sk:26754","padabo_sk:26755","padabo_pl:26754","padabo_pl:26755"]);

function addText(parent, tag, value, className) {
  const node = parent.ownerDocument.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  parent.append(node);
  return node;
}

// Direct product discovery for CZ/SK/PL; analytics remains consent-gated.
// This is an initial Ah/voltage/chemistry filter, never an installation signoff.
export function mountBatteryCalculatorBuyers(root, {
  fetchImpl = globalThis.fetch,
  now = Date.now,
  windowRoot = globalThis.window,
} = {}) {
  const section = root?.querySelector?.("[data-battery-buyers]");
  const locale=root?.dataset?.calculatorLocale;
  const market=Object.hasOwn(MARKET_COPY,locale)?MARKET_COPY[locale]:null;
  if (!section || root.dataset.calculatorIntent !== "battery-capacity" ||
      (locale !== "cs" && !market) || typeof fetchImpl !== "function") return null;
  const list = section.querySelector("[data-battery-offer-list]");
  const fallback = section.querySelector("[data-battery-offer-fallback]");
  if (!list || !fallback) return null;
  const documentRoot = section.ownerDocument;
  const cardCopy = CARD_COPY[locale];
  const count = section.querySelector('[data-battery-offer-count]');
  const num = new Intl.NumberFormat(market?.numberLocale || 'cs-CZ',{maximumFractionDigits:1});
  const price = new Intl.NumberFormat(market?.numberLocale || 'cs-CZ',{style:'currency',currency:market?.currency || 'CZK',maximumFractionDigits:market?2:0});
  const impressions = createVerifiedGuideImpressionTracker({
    documentRoot, sections: [section],
    getAnalytics: () => windowRoot?.MyPowerSetupAnalytics,
    Observer: windowRoot?.IntersectionObserver, now,
    allowedSources: ["battery-calculator-match"], allowedMerchants: market?.merchants || ["vselektro"],
  });
  let version = 0;
  let active = null;
  let timer = null;

  const clear = () => {
    if (timer !== null) windowRoot?.clearTimeout?.(timer);
    timer = null;
    list.replaceChildren();
    if(count) count.hidden=true;
    list.hidden = true;
    section.dataset.liveOffers = "0";
    impressions?.scan();
  };
  const invalidate = () => {
    version++;
    active = null;
    clear();
    fallback.hidden = false;
    section.hidden = true;
  };
  const noOffers = (message) => {
    clear();
    fallback.textContent = message;
    fallback.hidden = false;
    section.hidden = false;
  };

  function render(payload, result, expectedVersion) {
    if (!active || expectedVersion !== version) return;
    const current = now();
    const offers = market ? selectMarketBatteryCalculatorOffers(locale,payload,result,current) : selectBatteryCalculatorOffers(payload, result, current);
    clear();
    if (!offers.length) {
      noOffers(market ? market.empty : result.systemVoltage !== 12 || result.batteryType !== "lifepo4"
        ? "Ověřené samostatné baterie zde máme pouze pro 12 V LiFePO₄. U 24 V nebo AGM nebudeme nabízet nesprávnou variantu. Proveďte výběr v kompletním Builderu."
        : "Pro tuto potřebnou kapacitu nyní nemáme jedinou čerstvou ověřenou baterii. Nepředpokládáme automaticky bezpečné paralelní zapojení více kusů.");
      return;
    }
    let earliest = Infinity;
    const lowest=Math.min(...offers.map(p=>p.priceCzk));
    for (const offer of offers) {
      const expiresAt = market ? marketBatteryOfferExpiresAt(payload) : batteryOfferExpiresAt(payload, offer);
      if (!Number.isFinite(expiresAt) || expiresAt <= current) continue;
      earliest = Math.min(earliest, expiresAt);
      const item = documentRoot.createElement("li");
      item.className="battery-offer-card";
      if(offers.length>1&&offer.priceCzk===lowest)addText(item,"span",cardCopy.lowest,"battery-offer-lowest");
      const heading=documentRoot.createElement("div");heading.className="battery-offer-header";item.append(heading);
      const photo=Object.hasOwn(BATTERY_PHOTOS,offer.id)?BATTERY_PHOTOS[offer.id]:null;
      if(photo){
        const img=documentRoot.createElement("img");img.className="battery-offer-photo";img.width=104;img.height=104;img.loading="lazy";img.decoding="async";img.referrerPolicy="no-referrer";img.alt=offer.name;
        img.addEventListener("error",()=>img.remove(),{once:true});heading.append(img);img.src=photo;
      }
      const main=documentRoot.createElement("div");main.className="battery-offer-title";heading.append(main);
      addText(main,"strong",offer.name);
      addText(main,"span",cardCopy.merchants[offer.merchant]||offer.merchant,"battery-offer-merchant");
      addText(main,"span",price.format(offer.priceCzk),"battery-offer-price");
      addText(main,"small",cardCopy.price,"calculator-mppt-offer-facts");
      addText(item,"span",cardCopy.fit+" · "+offer.specs.voltageV+" V LiFePO₄","battery-offer-fit");
      const facts=documentRoot.createElement("dl");facts.className="battery-offer-metrics";item.append(facts);
      const reserve=offer.specs.capacityAh-result.batteryAh;
      const days=Math.floor((offer.specs.capacityAh*offer.specs.voltageV*0.8/1.15/result.dailyWh)*10)/10;
      for(const [label,value] of [[cardCopy.capacity,num.format(offer.specs.capacityAh)+" Ah"],[cardCopy.margin,"+"+num.format(reserve)+" Ah"],[cardCopy.current,num.format(offer.specs.bmsContinuousCurrentA)+" A"],[cardCopy.runtime,num.format(days)+" "+cardCopy.day]]){
        const cell=documentRoot.createElement("div");addText(cell,"dt",label);addText(cell,"dd",value);facts.append(cell);
      }
      if(UNDER_SEAT.has(offer.id))addText(item,"small",cardCopy.mount,"calculator-mppt-offer-facts");
      const link = addText(item, "a", cardCopy.link, "calculator-mppt-offer-link battery-offer-cta");
      link.href = decorateAwinAffiliateUrl(offer.affiliateUrl, {
        market: market ? locale : "cz", category: "battery", source: "product-card", placement: "battery_calculator",
      });
      link.target = "_blank";
      link.rel = "sponsored noopener noreferrer";
      link.dataset.affiliateClick = "";
      link.dataset.productId = offer.id;
      link.dataset.category = "battery";
      link.dataset.merchant = market ? offer.merchant : "vselektro";
      link.dataset.source = "battery-calculator-match";
      link.dataset.offerExpiresAt = String(expiresAt);
      const click = event => {
        if (event.type === "auxclick" ? event.button !== 1
            : event.button !== 0 && event.button !== undefined) return;
        // A link is never a valid conversion event after form input changes,
        // source expiry, or while a newer fetch has superseded this result.
        if (expectedVersion !== version || !active || section.hidden ||
            !(market ? isMarketBatteryOfferStillEligible(locale,payload,active,offer,now()) : isBatteryOfferStillEligible(payload, active, offer, now()))) {
          event.preventDefault();
          event.stopPropagation();
          noOffers(market?.expired || "Tato nabídka už není aktuálně ověřena. Znovu spusťte výpočet.");
          return;
        }
        windowRoot?.MyPowerSetupAnalytics?.track?.("affiliate_click", buildAttributedAffiliateParameters(link));
      };
      link.addEventListener("click", click);
      link.addEventListener("auxclick", click);
      addText(item,"small",cardCopy.affiliate,"calculator-mppt-offer-facts");
      list.append(item);
    }
    if (!list.childElementCount) {
      noOffers(market?.expired || "Čerstvé nabídky vypršely. Pokračujte do průvodce nebo celého Builderu.");
      return;
    }
    list.hidden = false;
    if(count){count.textContent=String(list.childElementCount)+" · "+cardCopy.fit;count.hidden=false;}
    fallback.hidden = true;
    section.hidden = false;
    section.dataset.liveOffers = String(list.childElementCount);
    section.dataset.buyerFetchState = "shown";
    impressions?.scan();
    if (Number.isFinite(earliest) && windowRoot?.setTimeout) {
      timer = windowRoot.setTimeout(() => {
        if (expectedVersion === version) noOffers(
          market?.expired || "Nabídky vypršely. Pro ověření cen a dostupnosti znovu spusťte výpočet.");
      }, Math.max(1, earliest - now() + 1));
    }
  }

  async function update(result) {
    invalidate();
    if (!result || result.batteryAh === undefined) return;
    active = Object.freeze({
      batteryAh: result.batteryAh, batteryWh: result.batteryWh,
      batteryType: result.batteryType, systemVoltage: result.systemVoltage,
      dailyWh: result.dailyWh, autonomyDays: result.autonomyDays,
    });
    const token = version;
    section.hidden = false;
    section.dataset.buyerFetchState = "loading";
    fallback.textContent = market?.loading || "Ověřujeme aktuální nabídky konkrétních baterií…";
    fallback.hidden = false;
    let payload = null;
    try {
      payload = market ? await loadMarketBatteryCalculatorOffers(locale,fetchImpl) : await loadCalculatorOffers(fetchImpl);
    } catch {
      // No trustworthy live feed: no prices and no affiliate purchase links.
    }
    if (!active || token !== version) return;
    render(payload, active, token);
  }

  documentRoot.addEventListener?.("visibilitychange", () => {
    if (!documentRoot.hidden && active) void update(active);
  });
  windowRoot?.addEventListener?.("focus", () => {
    if (active) void update(active);
  });
  return Object.freeze({ update, invalidate });
}
