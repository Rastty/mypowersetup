import { buildAttributedAffiliateParameters } from "./affiliate-analytics.js?v=20261110-attributed-products1";
import { decorateAwinAffiliateUrl } from "./awin-attribution.js";
import { loadSolarCalculatorOffers, loadSkSolarCalculatorOffers } from "./verified-offer-catalog-fetch.js";
import { createVerifiedGuideImpressionTracker } from "./guide-offer-impressions.js?v=20261110-attributed-guide1";
import {
  isSolarOfferStillEligible, selectSolarCalculatorOffers, solarOfferExpiresAt,
} from "./solar-calculator-offers.js";
import {
  isSkSolarOfferStillEligible, selectSkSolarCalculatorOffers, skSolarExpiresAt,
} from "./sk-solar-calculator-offers.js";

// One result/analytics/expiry implementation; only feed, approved SKUs and
// customer-facing currency/copy differ between the two markets.
const MARKETS = Object.freeze({
  cs: Object.freeze({
    analyticsMarket: "cz", merchant: "solarimport", currency: "CZK", numberLocale: "cs-CZ",
    load: loadSolarCalculatorOffers, select: selectSolarCalculatorOffers,
    eligible: isSolarOfferStillEligible, expiresAt: solarOfferExpiresAt,
    loading: "Ověřujeme ceny a dostupnost konkrétních panelů…",
    empty: "Pro zadaný výkon a napětí nyní nemáme vhodné čerstvé nabídky. Ověřte rozměry střechy, zapojení panelů a parametry MPPT v průvodci nebo Builderu.",
    expired: "Platnost ověřených nabídek vypršela. Spusťte nový výpočet.",
    invalid: "Nabídka mezitím vypršela. Spusťte nový výpočet.",
    price: "za uvedený počet · cena podle posledního feedu",
    count: "nominálně · rámové panely",
    link: "Ověřit cenu, rozměry a dostupnost →",
  }),
  sk: Object.freeze({
    analyticsMarket: "sk", merchant: "padabo_sk", currency: "EUR", numberLocale: "sk-SK",
    load: loadSkSolarCalculatorOffers, select: selectSkSolarCalculatorOffers,
    eligible: isSkSolarOfferStillEligible, expiresAt: skSolarExpiresAt,
    loading: "Overujeme ceny a dostupnosť konkrétnych panelov…",
    empty: "Pre zadaný výkon a napätie teraz nemáme vhodné aktuálne ponuky. Overte rozmery strechy, zapojenie panelov a parametre MPPT v sprievodcovi.",
    expired: "Platnosť overených ponúk vypršala. Spustite nový výpočet.",
    invalid: "Ponuka už nie je aktuálna. Spustite nový výpočet.",
    price: "za uvedený počet · cena podľa posledného feedu",
    count: "menovitý výkon · rámové panely",
    link: "Overiť cenu, rozmery a dostupnosť →",
  }),
});

const add = (parent, tag, content, className) => {
  const element = parent.ownerDocument.createElement(tag);
  if (className) element.className = className;
  element.textContent = content;
  parent.append(element);
  return element;
};

export function mountSolarCalculatorBuyers(root, {
  fetchImpl = globalThis.fetch, now = Date.now, windowRoot = globalThis.window,
} = {}) {
  const section = root?.querySelector?.("[data-solar-buyers]");
  const market = MARKETS[root?.dataset?.calculatorLocale];
  if (!section || root.dataset.calculatorIntent !== "solar-sizing"
    || !market || typeof fetchImpl !== "function") return null;
  const list = section.querySelector("[data-solar-offer-list]");
  const fallback = section.querySelector("[data-solar-offer-fallback]");
  if (!list || !fallback) return null;
  const doc = section.ownerDocument;
  const impressions = createVerifiedGuideImpressionTracker({
    documentRoot: doc, sections: [section],
    getAnalytics: () => windowRoot?.MyPowerSetupAnalytics,
    Observer: windowRoot?.IntersectionObserver, now,
    allowedSources: ["solar-calculator-match"], allowedMerchants: [market.merchant],
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
    const offers = market.select(payload, result, current);
    clear();
    if (!offers.length) {
      noOffers(market.empty);
      return;
    }
    const expiry = market.expiresAt(payload);
    if (!Number.isFinite(expiry) || expiry <= current) {
      noOffers(market.expired);
      return;
    }
    for (const offer of offers) {
      const item = doc.createElement("li");
      add(item, "strong", offer.name);
      add(item, "span", `${offer.recommendedQuantity} × ${offer.specs.powerW} Wp = ${offer.recommendedQuantity * offer.specs.powerW} Wp ${market.count}`, "calculator-mppt-offer-facts");
      add(item, "span", new Intl.NumberFormat(market.numberLocale, {
        style: "currency", currency: market.currency, maximumFractionDigits: market.currency === "EUR" ? 2 : 0,
      }).format(offer.recommendedQuantity * offer.priceCzk) + ` ${market.price}`, "calculator-mppt-offer-facts");
      const link = add(item, "a", market.link, "calculator-mppt-offer-link");
      link.href = decorateAwinAffiliateUrl(offer.affiliateUrl, {
        market: market.analyticsMarket, category: "solar_panel", source: "product-card",
      });
      link.rel = "sponsored noopener noreferrer";
      link.target = "_blank";
      link.dataset.affiliateClick = "";
      link.dataset.source = "solar-calculator-match";
      link.dataset.category = "solar_panel";
      link.dataset.merchant = market.merchant;
      link.dataset.productId = offer.id;
      link.dataset.offerExpiresAt = String(expiry);
      const onClick = event => {
        if (event.type === "auxclick" ? event.button !== 1
          : event.button !== 0 && event.button !== undefined) return;
        if (token !== generation || !active || section.hidden
          || !market.eligible(payload, active, offer, now())) {
          event.preventDefault();
          event.stopPropagation();
          noOffers(market.invalid);
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
        if (token === generation) noOffers(market.expired);
      }, Math.max(1, expiry - now() + 1));
    }
  }

  async function update(result) {
    invalidate();
    if (!result || !Number.isSafeInteger(result.solarWatts)) return;
    active = Object.freeze({ solarWatts: result.solarWatts, systemVoltage: result.systemVoltage });
    const token = generation;
    section.hidden = false;
    fallback.textContent = market.loading;
    fallback.hidden = false;
    section.dataset.buyerFetchState = "loading";
    const payload = await market.load(fetchImpl);
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
