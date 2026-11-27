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
    for (const offer of offers) {
      const expiresAt = market ? marketBatteryOfferExpiresAt(payload) : batteryOfferExpiresAt(payload, offer);
      if (!Number.isFinite(expiresAt) || expiresAt <= current) continue;
      earliest = Math.min(earliest, expiresAt);
      const item = documentRoot.createElement("li");
      addText(item, "strong", offer.name);
      addText(item, "span",
        market ? offer.specs.capacityAh + " Ah · " + offer.specs.voltageV + " V LiFePO₄ · " + offer.specs.bmsContinuousCurrentA + market.current : offer.specs.capacityAh + " Ah · 12 V LiFePO₄ · BMS " +
        offer.specs.bmsContinuousCurrentA + " A (ověřte skutečné zatížení)",
        "calculator-mppt-offer-facts");
      addText(item, "span", new Intl.NumberFormat(market?.numberLocale || "cs-CZ", {
        style: "currency", currency: market?.currency || "CZK", maximumFractionDigits: market ? 2 : 0,
      }).format(offer.priceCzk) + (market?.price || " · naposledy ověřená cena"),
      "calculator-mppt-offer-facts");
      const link = addText(item, "a", market?.link || "Ověřit cenu a technické parametry →", "calculator-mppt-offer-link");
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
      list.append(item);
    }
    if (!list.childElementCount) {
      noOffers(market?.expired || "Čerstvé nabídky vypršely. Pokračujte do průvodce nebo celého Builderu.");
      return;
    }
    list.hidden = false;
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
