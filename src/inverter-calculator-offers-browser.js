import { buildAttributedAffiliateParameters } from "./affiliate-analytics.js?v=20261110-attributed-products1";
import { decorateAwinAffiliateUrl } from "./awin-attribution.js";
import { loadInverterCalculatorOffers } from "./verified-offer-catalog-fetch.js";
import { createVerifiedGuideImpressionTracker } from "./guide-offer-impressions.js?v=20261110-attributed-guide1";
import {
  inverterOfferExpiresAt, isInverterOfferStillEligible, selectInverterCalculatorOffers,
} from "./inverter-calculator-offers.js";

const add = (parent, tag, text, className) => {
  const element = parent.ownerDocument.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
};

// First-pass exact nominal watts + DC voltage shortlist for CZ only. A product
// is not an installation recommendation: surge watts, BMS and cabling remain
// a required buyer check, explicitly shown alongside the merchant links.
export function mountInverterCalculatorBuyers(root, {
  fetchImpl = globalThis.fetch,
  now = Date.now,
  windowRoot = globalThis.window,
} = {}) {
  const section = root?.querySelector?.("[data-inverter-buyers]");
  if (!section || root.dataset.calculatorIntent !== "inverter-sizing"
    || root.dataset.calculatorLocale !== "cs" || typeof fetchImpl !== "function") return null;
  const list = section.querySelector("[data-inverter-offer-list]");
  const fallback = section.querySelector("[data-inverter-offer-fallback]");
  if (!list || !fallback) return null;
  const doc = section.ownerDocument;
  const impressions = createVerifiedGuideImpressionTracker({
    documentRoot: doc, sections: [section],
    getAnalytics: () => windowRoot?.MyPowerSetupAnalytics,
    Observer: windowRoot?.IntersectionObserver, now,
    allowedSources: ["inverter-calculator-match"],
    allowedMerchants: ["solarimport"],
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
    const offers = selectInverterCalculatorOffers(payload, result, current);
    clear();
    if (!offers.length) {
      noOffers("Pro tyto parametry nyní nemáme odpovídající čerstvý model s ověřeným napětím a trvalým výkonem. Další varianty najdete v Builderu.");
      return;
    }
    const expiry = inverterOfferExpiresAt(payload);
    if (!Number.isFinite(expiry) || expiry <= current) {
      noOffers("Nabídky vypršely. Spusťte nový výpočet.");
      return;
    }
    for (const offer of offers) {
      const item = doc.createElement("li");
      add(item, "strong", offer.name);
      add(item, "span", `${offer.specs.powerW} W trvale · ${offer.specs.voltageV} V DC · čistý sinus`, "calculator-mppt-offer-facts");
      add(item, "span", new Intl.NumberFormat("cs-CZ", {
        style: "currency", currency: "CZK", maximumFractionDigits: 0,
      }).format(offer.priceCzk) + " · poslední ověřená cena", "calculator-mppt-offer-facts");
      const link = add(item, "a", "Ověřit cenu a špičkový výkon →", "calculator-mppt-offer-link");
      link.href = decorateAwinAffiliateUrl(offer.affiliateUrl, {
        market: "cz", category: "inverter", source: "product-card",
      });
      link.rel = "sponsored noopener noreferrer";
      link.target = "_blank";
      link.dataset.affiliateClick = "";
      link.dataset.source = "inverter-calculator-match";
      link.dataset.category = "inverter";
      link.dataset.merchant = "solarimport";
      link.dataset.productId = offer.id;
      link.dataset.offerExpiresAt = String(expiry);
      const onClick = event => {
        if (event.type === "auxclick" ? event.button !== 1
          : event.button !== 0 && event.button !== undefined) return;
        if (token !== generation || !active || section.hidden
          || !isInverterOfferStillEligible(payload, active, offer, now())) {
          event.preventDefault();
          event.stopPropagation();
          noOffers("Nabídka už není aktuální. Spusťte výpočet znovu.");
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
        if (token === generation) noOffers("Ceny již nejsou aktuálně ověřené. Spusťte nový výpočet.");
      }, Math.max(1, expiry - now() + 1));
    }
  }

  async function update(result) {
    invalidate();
    if (!result || !Number.isSafeInteger(result.inverterWatts)) return;
    active = Object.freeze({ inverterWatts: result.inverterWatts, systemVoltage: result.systemVoltage });
    const token = generation;
    section.hidden = false;
    fallback.textContent = "Ověřujeme konkrétní sinusové měniče a dostupnost…";
    fallback.hidden = false;
    section.dataset.buyerFetchState = "loading";
    const payload = await loadInverterCalculatorOffers(fetchImpl);
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
