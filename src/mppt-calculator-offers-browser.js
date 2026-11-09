import { buildAffiliateClickParameters } from "./affiliate-analytics.js";
import { loadCalculatorOffers } from "./calculator-offer-catalog.js?v=20261109-lightweight-cz1";
import { createVerifiedGuideImpressionTracker } from "./guide-offer-impressions.js?v=20261109-mppt-buyer1";
import {
  isMpptOfferStillEligible, mpptOfferExpiresAt, selectMpptCalculatorOffers,
} from "./mppt-calculator-offers.js";

function addText(parent, tag, content, className) {
  const element = parent.ownerDocument.createElement(tag);
  if (className) element.className = className;
  element.textContent = content;
  parent.append(element);
  return element;
}

// Mounted only on the Czech MPPT landing. Reuses the approved, exact-SKU,
// live-feed gate without promising total electrical compatibility from Wp/A
// alone. It never inserts a purchase link for an unverified or expired offer.
export function mountMpptCalculatorBuyers(root, {
  fetchImpl = globalThis.fetch,
  now = Date.now,
  windowRoot = globalThis.window,
} = {}) {
  const section = root?.querySelector?.("[data-mppt-buyers]");
  if (!section || root.dataset.calculatorIntent !== "mppt-sizing" ||
      root.dataset.calculatorLocale !== "cs" || typeof fetchImpl !== "function") return null;
  const list = section.querySelector("[data-mppt-offer-list]");
  const fallback = section.querySelector("[data-mppt-offer-fallback]");
  if (!list || !fallback) return null;
  const documentRoot = section.ownerDocument;
  const impressionTracker = createVerifiedGuideImpressionTracker({
    documentRoot,
    sections: [section],
    getAnalytics: () => windowRoot?.MyPowerSetupAnalytics,
    Observer: windowRoot?.IntersectionObserver,
    now,
    allowedSources: ["mppt-calculator-match"],
  });
  let generation = 0;
  let activeResult = null;
  let expiryTimer = null;

  function cancelExpiry() {
    if (expiryTimer !== null) windowRoot?.clearTimeout?.(expiryTimer);
    expiryTimer = null;
  }

  function clearOffers() {
    cancelExpiry();
    list.replaceChildren();
    list.hidden = true;
    section.dataset.liveOffers = "0";
    impressionTracker?.scan();
  }

  function invalidate() {
    generation++;
    activeResult = null;
    clearOffers();
    fallback.hidden = false;
    section.hidden = true;
  }

  function noOffers(message) {
    clearOffers();
    fallback.textContent = message;
    fallback.hidden = false;
    section.hidden = false;
  }

  function render(payload, calculation, token) {
    if (token !== generation || !activeResult) return;
    section.dataset.buyerFetchState = "selecting";
    const current = now();
    const offers = selectMpptCalculatorOffers(payload, calculation, current);
    clearOffers();
    if (!offers.length) {
      section.dataset.buyerFetchState = "empty";
      noOffers("Pro zadané parametry nyní nemáme čerstvou ověřenou nabídku. Porovnejte proud, Wp, Voc a Isc v průvodci nebo navrhněte celou sestavu v Builderu.");
      return;
    }

    let earliestExpiry = Infinity;
    for (const offer of offers) {
      const expiresAt = mpptOfferExpiresAt(payload, offer);
      if (!Number.isFinite(expiresAt) || expiresAt <= current) continue;
      earliestExpiry = Math.min(earliestExpiry, expiresAt);
      const item = documentRoot.createElement("li");
      addText(item, "strong", offer.name);
      addText(item, "span",
        offer.specs.currentA + " A · FV limit " +
          offer.specs.maxPvWattsBySystemVoltage[calculation.systemVoltage] + " Wp při " +
          calculation.systemVoltage + " V",
        "calculator-mppt-offer-facts");
      addText(item, "span", new Intl.NumberFormat("cs-CZ", {
        style: "currency", currency: "CZK", maximumFractionDigits: 0,
      }).format(offer.priceCzk) + " · cena dle poslední ověřené nabídky",
      "calculator-mppt-offer-facts");

      const link = addText(item, "a", "Ověřit aktuální cenu a parametry →", "calculator-mppt-offer-link");
      link.href = offer.affiliateUrl;
      link.target = "_blank";
      link.rel = "sponsored noopener noreferrer";
      link.dataset.affiliateClick = "";
      link.dataset.productId = offer.id;
      link.dataset.merchant = "vselektro";
      link.dataset.category = "controller";
      link.dataset.source = "mppt-calculator-match";
      link.dataset.offerExpiresAt = String(expiresAt);
      const click = (event) => {
        if (event.type === "auxclick" ? event.button !== 1
          : event.button !== 0 && event.button !== undefined) return;
        // The result must still match the actual unmodified form, with current
        // source evidence. A stale click can never count as an affiliate event.
        if (token !== generation || section.hidden ||
            !isMpptOfferStillEligible(payload, activeResult, offer, now())) {
          event.preventDefault();
          event.stopPropagation();
          noOffers("Nabídka mezitím vypršela. Spusťte nový výpočet a zkontrolujte čerstvé produkty.");
          return;
        }
        windowRoot?.MyPowerSetupAnalytics?.track?.("affiliate_click", buildAffiliateClickParameters(link));
      };
      link.addEventListener("click", click);
      link.addEventListener("auxclick", click);
      list.append(item);
    }
    if (!list.childElementCount) {
      noOffers("Aktuálně nemáme dostatečně čerstvou nabídku. Pokračujte do průvodce nebo Builderu.");
      return;
    }
    list.hidden = false;
    fallback.hidden = true;
    section.dataset.liveOffers = String(list.childElementCount);
    section.hidden = false;
    section.dataset.buyerFetchState = "shown";
    impressionTracker?.scan();
    if (Number.isFinite(earliestExpiry) && windowRoot?.setTimeout) {
      expiryTimer = windowRoot.setTimeout(() => {
        if (token === generation) noOffers("Platnost ověřených cen vypršela. Znovu spusťte výpočet pro aktuální nabídky.");
      }, Math.max(1, earliestExpiry - now() + 1));
    }
  }

  async function update(calculation) {
    invalidate();
    if (!calculation || calculation.panelWatts === undefined) return;
    activeResult = Object.freeze({
      panelWatts: calculation.panelWatts,
      controllerAmps: calculation.controllerAmps,
      systemVoltage: calculation.systemVoltage,
      batteryType: calculation.batteryType,
    });
    const token = generation;
    section.dataset.buyerFetchState = "loading";
    section.dataset.buyerGeneration = String(token);
    section.hidden = false;
    fallback.textContent = "Ověřujeme čerstvé nabídky přesných modelů MPPT…";
    fallback.hidden = false;
    let payload = null;
    try {
      payload = await loadCalculatorOffers(fetchImpl);
      section.dataset.buyerFetchState = payload ? "parsed" : "missing";
    } catch {
      section.dataset.buyerFetchState = "failed";
      // Fail closed: no live feed, no offer, price, or outbound link.
    }
    if (token !== generation || !activeResult) return;
    render(payload, activeResult, token);
  }

  documentRoot.addEventListener?.("visibilitychange", () => {
    if (!documentRoot.hidden && activeResult) void update(activeResult);
  });
  windowRoot?.addEventListener?.("focus", () => {
    if (activeResult) void update(activeResult);
  });
  return Object.freeze({ update, invalidate });
}
