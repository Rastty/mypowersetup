import { buildAttributedAffiliateParameters } from "./affiliate-analytics.js?v=20261110-attributed-products1";
import { decorateAwinAffiliateUrl } from "./awin-attribution.js";
import { loadSolarCalculatorOffers } from "./verified-offer-catalog-fetch.js";
import { createVerifiedGuideImpressionTracker } from "./guide-offer-impressions.js?v=20261110-attributed-guide1";
import {
  isSolarOfferStillEligible, selectSolarCalculatorOffers, solarOfferExpiresAt,
} from "./solar-calculator-offers.js";

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
  if (!section || root.dataset.calculatorIntent !== "solar-sizing"
    || root.dataset.calculatorLocale !== "cs" || typeof fetchImpl !== "function") return null;
  const list = section.querySelector("[data-solar-offer-list]");
  const fallback = section.querySelector("[data-solar-offer-fallback]");
  if (!list || !fallback) return null;
  const doc = section.ownerDocument;
  const impressions = createVerifiedGuideImpressionTracker({
    documentRoot: doc, sections: [section],
    getAnalytics: () => windowRoot?.MyPowerSetupAnalytics,
    Observer: windowRoot?.IntersectionObserver, now,
    allowedSources: ["solar-calculator-match"], allowedMerchants: ["solarimport"],
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
    const offers = selectSolarCalculatorOffers(payload, result, current);
    clear();
    if (!offers.length) {
      noOffers("Pro zadaný výkon a napětí nyní nemáme vhodné čerstvé nabídky. Ověřte rozměry střechy, zapojení panelů a parametry MPPT v průvodci nebo Builderu.");
      return;
    }
    const expiry = solarOfferExpiresAt(payload);
    if (!Number.isFinite(expiry) || expiry <= current) {
      noOffers("Ceny již nejsou ověřené. Spusťte výpočet znovu.");
      return;
    }
    for (const offer of offers) {
      const item = doc.createElement("li");
      add(item, "strong", offer.name);
      add(item, "span", `${offer.recommendedQuantity} × ${offer.specs.powerW} Wp = ${offer.recommendedQuantity * offer.specs.powerW} Wp nominálně · rámové panely`, "calculator-mppt-offer-facts");
      add(item, "span", new Intl.NumberFormat("cs-CZ", {
        style: "currency", currency: "CZK", maximumFractionDigits: 0,
      }).format(offer.recommendedQuantity * offer.priceCzk) + " za uvedený počet · cena podle posledního feedu", "calculator-mppt-offer-facts");
      const link = add(item, "a", "Ověřit cenu, rozměry a dostupnost →", "calculator-mppt-offer-link");
      link.href = decorateAwinAffiliateUrl(offer.affiliateUrl, {
        market: "cz", category: "solar_panel", source: "product-card",
      });
      link.rel = "sponsored noopener noreferrer";
      link.target = "_blank";
      link.dataset.affiliateClick = "";
      link.dataset.source = "solar-calculator-match";
      link.dataset.category = "solar_panel";
      link.dataset.merchant = "solarimport";
      link.dataset.productId = offer.id;
      link.dataset.offerExpiresAt = String(expiry);
      const onClick = event => {
        if (event.type === "auxclick" ? event.button !== 1
          : event.button !== 0 && event.button !== undefined) return;
        if (token !== generation || !active || section.hidden
          || !isSolarOfferStillEligible(payload, active, offer, now())) {
          event.preventDefault();
          event.stopPropagation();
          noOffers("Nabídka mezitím vypršela. Spusťte nový výpočet.");
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
        if (token === generation) noOffers("Platnost ověřených nabídek vypršela. Spusťte nový výpočet.");
      }, Math.max(1, expiry - now() + 1));
    }
  }

  async function update(result) {
    invalidate();
    if (!result || !Number.isSafeInteger(result.solarWatts)) return;
    active = Object.freeze({ solarWatts: result.solarWatts, systemVoltage: result.systemVoltage });
    const token = generation;
    section.hidden = false;
    fallback.textContent = "Ověřujeme ceny a dostupnost konkrétních panelů…";
    fallback.hidden = false;
    section.dataset.buyerFetchState = "loading";
    const payload = await loadSolarCalculatorOffers(fetchImpl);
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
