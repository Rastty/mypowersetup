import { buildAttributedAffiliateParameters } from "./affiliate-analytics.js?v=20261115-placement-events1";
import { decorateAwinAffiliateUrl } from "./awin-attribution.js?v=20261115-placement-subids1";
import { loadInverterCalculatorOffers } from "./verified-offer-catalog-fetch.js";
import { createVerifiedGuideImpressionTracker } from "./guide-offer-impressions.js?v=20261115-placement-events1";
import {
  inverterOfferExpiresAt, isInverterOfferStillEligible, selectInverterCalculatorOffers,
} from "./inverter-calculator-offers.js";

import { loadMarketInverterOffers, selectMarketInverterOffers, isMarketInverterStillEligible, marketInverterExpiresAt } from "./market-inverter-calculator-offers.js?v=20261128-market-inverter1";
const LOCAL=Object.freeze({
 sk:{merchant:"padabo_sk",currency:"EUR",numberLocale:"sk-SK",loading:"Overujeme konkrétne sínusové meniče a dostupnosť…",empty:"Pre tieto parametre teraz nemáme čerstvý overený model. Pokračujte do Buildera.",expired:"Platnosť ponúk vypršala. Spustite nový výpočet.",price:" · cena z posledného feedu",link:"Overiť cenu a vybrať správny variant →",facts:" W trvalo · ",peak:" W špička (overte jej trvanie)",variant:"Na spoločnej stránke vyberte presný model "},
 pl:{merchant:"padabo_pl",currency:"PLN",numberLocale:"pl-PL",loading:"Sprawdzamy konkretne przetwornice sinusoidalne i dostępność…",empty:"Dla tych parametrów nie mamy aktualnego zweryfikowanego modelu. Przejdź do Buildera.",expired:"Dane ofert straciły ważność. Uruchom obliczenie ponownie.",price:" · cena z ostatniego feedu",link:"Sprawdź cenę i wybierz właściwy wariant →",facts:" W mocy ciągłej · ",peak:" W mocy szczytowej (sprawdź czas jej utrzymania)",variant:"Na wspólnej stronie wybierz dokładny model "}
});
const add = (parent, tag, text, className) => {
  const element = parent.ownerDocument.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
};

// First-pass exact nominal watts + DC voltage shortlist for CZ/SK/PL. A product
// is not an installation recommendation: surge watts, BMS and cabling remain
// a required buyer check, explicitly shown alongside the merchant links.
export function mountInverterCalculatorBuyers(root, {
  fetchImpl = globalThis.fetch,
  now = Date.now,
  windowRoot = globalThis.window,
} = {}) {
  const section = root?.querySelector?.("[data-inverter-buyers]");
  const locale=root?.dataset?.calculatorLocale;
  const market=Object.hasOwn(LOCAL,locale)?LOCAL[locale]:null;
  if (!section || root.dataset.calculatorIntent !== "inverter-sizing"
    || (locale !== "cs" && !market) || typeof fetchImpl !== "function") return null;
  const list = section.querySelector("[data-inverter-offer-list]");
  const fallback = section.querySelector("[data-inverter-offer-fallback]");
  if (!list || !fallback) return null;
  const doc = section.ownerDocument;
  const impressions = createVerifiedGuideImpressionTracker({
    documentRoot: doc, sections: [section],
    getAnalytics: () => windowRoot?.MyPowerSetupAnalytics,
    Observer: windowRoot?.IntersectionObserver, now,
    allowedSources: ["inverter-calculator-match"],
    allowedMerchants: [market?.merchant || "solarimport"],
  });
  let generation = 0;
  let active = null;
  let timer = null;

  function clear() {
    if (timer !== null) windowRoot?.clearTimeout?.(timer);
    timer = null;
    list.replaceChildren();
    list.hidden = true;
    section.dataset.liveOffers = "0";
    impressions?.scan();
  }
  function invalidate() {
    generation++;
    active = null;
    clear();
    fallback.hidden = false;
    section.hidden = true;
  }
  function noOffers(message) {
    clear();
    fallback.textContent = message;
    fallback.hidden = false;
    section.hidden = false;
  }

  function show(payload, result, token) {
    if (token !== generation || !active) return;
    const current = now();
    const offers = market ? selectMarketInverterOffers(locale,payload,result,current) : selectInverterCalculatorOffers(payload,result,current);
    clear();
    if (!offers.length) {
      noOffers(market?.empty || "Pro tyto parametry nyní nemáme odpovídající čerstvý model s ověřeným napětím a trvalým výkonem. Další varianty najdete v Builderu.");
      return;
    }
    const expiry = market ? marketInverterExpiresAt(payload) : inverterOfferExpiresAt(payload);
    if (!Number.isFinite(expiry) || expiry <= current) {
      noOffers(market?.expired || "Nabídky vypršely. Spusťte nový výpočet.");
      return;
    }
    for (const offer of offers) {
      const item = doc.createElement("li");
      add(item, "strong", market ? "Dometic SinePower " + offer.specs.inverterManufacturerModel : offer.name);
      add(item, "span", market ? offer.specs.powerW+market.facts+offer.specs.voltageV+" V DC · "+offer.specs.inverterPeakPowerW+market.peak : `${offer.specs.powerW} W trvale · ${offer.specs.voltageV} V DC · čistý sinus`, "calculator-mppt-offer-facts");
      if(market) add(item,"span",market.variant+offer.specs.inverterManufacturerModel+" ("+offer.specs.voltageV+" V / "+offer.specs.powerW+" W).","calculator-mppt-offer-facts");
      add(item, "span", new Intl.NumberFormat(market?.numberLocale || "cs-CZ", {
        style: "currency", currency: market?.currency || "CZK", maximumFractionDigits: market ? 2 : 0,
      }).format(offer.priceCzk) + (market?.price || " · poslední ověřená cena"), "calculator-mppt-offer-facts");
      const link = add(item, "a", market?.link || "Ověřit cenu a špičkový výkon →", "calculator-mppt-offer-link");
      link.href = decorateAwinAffiliateUrl(offer.affiliateUrl, {
        market: market ? locale : "cz", category: "inverter", source: "product-card", placement: "inverter_calculator",
      });
      link.rel = "sponsored noopener noreferrer";
      link.target = "_blank";
      link.dataset.affiliateClick = "";
      link.dataset.source = "inverter-calculator-match";
      link.dataset.category = "inverter";
      link.dataset.merchant = market?.merchant || "solarimport";
      link.dataset.productId = offer.id;
      link.dataset.offerExpiresAt = String(expiry);
      const onClick = event => {
        if (event.type === "auxclick" ? event.button !== 1
          : event.button !== 0 && event.button !== undefined) return;
        if (token !== generation || !active || section.hidden
          || !(market ? isMarketInverterStillEligible(locale,payload,active,offer,now()) : isInverterOfferStillEligible(payload,active,offer,now()))) {
          event.preventDefault();
          event.stopPropagation();
          noOffers(market?.expired || "Nabídka už není aktuální. Spusťte výpočet znovu.");
          return;
        }
        windowRoot?.MyPowerSetupAnalytics?.track?.("affiliate_click", buildAttributedAffiliateParameters(link));
      };
      link.addEventListener("click", onClick);
      link.addEventListener("auxclick", onClick);
      list.append(item);
    }
    list.hidden = false;
    fallback.hidden = true;
    section.hidden = false;
    section.dataset.liveOffers = String(list.childElementCount);
    impressions?.scan();
    if (windowRoot?.setTimeout) {
      timer = windowRoot.setTimeout(() => {
        if (token === generation) noOffers(market?.expired || "Ceny již nejsou aktuálně ověřené. Spusťte nový výpočet.");
      }, Math.max(1, expiry - now() + 1));
    }
  }

  async function update(result) {
    invalidate();
    if (!result || !Number.isSafeInteger(result.inverterWatts)) return;
    active = Object.freeze({ inverterWatts: result.inverterWatts, systemVoltage: result.systemVoltage, largestStartWatts: result.largestStartWatts });
    const token = generation;
    section.hidden = false;
    fallback.textContent = market?.loading || "Ověřujeme konkrétní sinusové měniče a dostupnost…";
    fallback.hidden = false;
    section.dataset.buyerFetchState = "loading";
    const payload = market ? await loadMarketInverterOffers(locale,fetchImpl) : await loadInverterCalculatorOffers(fetchImpl);
    if (token !== generation || !active) return;
    show(payload, active, token);
  }

  doc.addEventListener?.("visibilitychange", () => {
    if (!doc.hidden && active) void update(active);
  });
  windowRoot?.addEventListener?.("focus", () => {
    if (active) void update(active);
  });
  return Object.freeze({ update, invalidate });
}
