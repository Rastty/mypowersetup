import { buildAttributedAffiliateParameters } from "./affiliate-analytics.js?v=20261110-attributed-products1";
import { createVerifiedGuideImpressionTracker } from "./guide-offer-impressions.js?v=20261110-drive-variant2";
import { loadDcdcGuideOffers } from "./verified-offer-catalog-fetch.js";
import {
  classifyDcdcOfferOutcome, dcdcReviewedModel, dcdcCalculatorOfferExpiresAt, dcdcOfferDriveTime,
  isDcdcOfferStillEligible, selectDcdcCalculatorOffers, supportsDcdcBuyerShortlist,
} from "./dcdc-calculator-offers.js?v=20261110-outcome1";

function appendText(parent, tag, text, className) {
  const element = parent.ownerDocument.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

// Only after explicit submit and within the current output ceiling. This
// is a product comparison, NEVER an installation or BMS signoff.
export function mountDcdcCalculatorBuyers(root, {
  fetchImpl = globalThis.fetch,
  now = Date.now,
  windowRoot = globalThis.window,
} = {}) {
  const section = root?.querySelector?.("[data-dcdc-buyers]");
  if (!section || root.dataset.calculatorIntent !== "dcdc-sizing"
    || typeof fetchImpl !== "function") return null;
  const list = section.querySelector("[data-dcdc-offer-list]");
  const fallback = section.querySelector("[data-dcdc-offer-fallback]");
  if (!list || !fallback) return null;

  const documentRoot = section.ownerDocument;
  const tracker = createVerifiedGuideImpressionTracker({
    documentRoot, sections: [section],
    getAnalytics: () => windowRoot?.MyPowerSetupAnalytics,
    Observer: windowRoot?.IntersectionObserver,
    now,
    allowedSources: ["dcdc-calculator-compare"],
  });
  const formatter = new Intl.NumberFormat("cs-CZ", {
    style: "currency", currency: "CZK", maximumFractionDigits: 0,
  });
  const formatHours = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 });
  let generation = 0;
  let active = null;
  let expiryTimer = null;

  function clear() {
    if (expiryTimer !== null) windowRoot?.clearTimeout?.(expiryTimer);
    expiryTimer = null;
    list.replaceChildren();
    list.hidden = true;
    section.dataset.liveOffers = "0";
    tracker?.scan();
  }

  function invalidate() {
    generation += 1;
    active = null;
    clear();
    section.hidden = true;
    section.dataset.buyerFetchState = "invalidated";
  }

  function showFallback(message) {
    clear();
    fallback.textContent = message;
    fallback.hidden = false;
    section.hidden = false;
  }

  function render(payload, result, token) {
    if (token !== generation || !active) return null;
    clear();
    const outcome = classifyDcdcOfferOutcome(payload, result, now());
    const current = now();
    const offers = selectDcdcCalculatorOffers(payload, result, current);
    if (!offers.length) {
      showFallback(supportsDcdcBuyerShortlist(result)
        ? "Pro zadané limity není dostupný žádný dostatečně čerstvý ověřený model 12→12 V. Podívejte se do průvodce nebo upravte návrh; nepřekračujte bezpečné proudové limity."
        : "Zde porovnáváme pouze ověřené modely pro 12V vstup a 12V servisní baterii. Pro 24V nebo neurčité vstupní napětí použijte průvodce a ověřte vhodný model u výrobce.");
      section.dataset.buyerFetchState = "empty";
      return outcome;
    }

    let earliestExpiry = Infinity;
    for (const offer of offers) {
      const model = dcdcReviewedModel(offer.id);
      const timing = dcdcOfferDriveTime(result, offer);
      const expiresAt = dcdcCalculatorOfferExpiresAt(payload, offer);
      if (!model || !timing || !Number.isFinite(expiresAt) || expiresAt <= current) continue;
      earliestExpiry = Math.min(earliestExpiry, expiresAt);
      const item = documentRoot.createElement("li");
      appendText(item, "strong", offer.name);
      appendText(item, "span",
        model.outputA + " A výstup · 12→12 V · " + model.isolation + " · pouze model k porovnání",
        "calculator-mppt-offer-facts");
      appendText(item, "span",
        formatter.format(offer.priceCzk) + " · poslední ověřená cena z feedu",
        "calculator-mppt-offer-facts");
      const timingText = timing.meetsIdealTarget
        ? "Ideální dolní odhad dobití: nejméně " + formatHours.format(timing.displayedMinimumHours)
          + " h. Do cíle " + formatHours.format(timing.targetDriveHours)
          + " h se vejde jen za předpokladu plného stálého proudu; reálně to může trvat déle."
        : "Pozor: cíl " + formatHours.format(timing.targetDriveHours)
          + " h tento model nestihne ani při stálém plném proudu. "
          + "Ideální dolní odhad je nejméně " + formatHours.format(timing.displayedMinimumHours)
          + " h; skutečné dobíjení může trvat déle.";
      const timingLine = appendText(item, "span", timingText, "calculator-mppt-offer-facts");
      timingLine.dataset.dcdcTimeFit = timing.meetsIdealTarget ? "ideal-only" : "too-slow";

      const link = appendText(item, "a", "Ověřit cenu, profil a vstupní proud →", "calculator-mppt-offer-link");
      link.href = offer.affiliateUrl;
      link.target = "_blank";
      link.rel = "sponsored noopener noreferrer";
      link.dataset.affiliateClick = "";
      link.dataset.productId = offer.id;
      link.dataset.merchant = "vselektro";
      link.dataset.category = "dc_charger";
      link.dataset.source = "dcdc-calculator-compare";
      link.dataset.ctaVariant = timing.meetsIdealTarget ? "dcdc-ideal-target-only" : "dcdc-longer-drive";
      link.dataset.offerExpiresAt = String(expiresAt);
      const click = event => {
        if (event.defaultPrevented) return;
        if (event.type === "auxclick" ? event.button !== 1
          : event.button !== 0 && event.button !== undefined) return;
        if (token !== generation || !active || section.hidden ||
            !isDcdcOfferStillEligible(payload, active, offer, now())) {
          event.preventDefault();
          event.stopPropagation();
          showFallback("Nabídka už není čerstvá nebo jste změnili zadání. Znovu spusťte výpočet.");
          return;
        }
        windowRoot?.MyPowerSetupAnalytics?.track?.("affiliate_click", buildAttributedAffiliateParameters(link));
      };
      link.addEventListener("click", click);
      link.addEventListener("auxclick", click);
      item.append(link);
      list.append(item);
    }
    if (!list.childElementCount) {
      showFallback("Platnost ověřených nabídek mezitím vypršela. Znovu spusťte výpočet.");
      return "unavailable";
    }
    list.hidden = false;
    fallback.hidden = true;
    section.hidden = false;
    section.dataset.liveOffers = String(list.childElementCount);
    section.dataset.buyerFetchState = "shown";
    tracker?.scan();

    if (Number.isFinite(earliestExpiry) && windowRoot?.setTimeout) {
      expiryTimer = windowRoot.setTimeout(() => {
        if (token === generation) showFallback(
          "Platnost ověřených cen vypršela. Pro aktuální nabídky spusťte výpočet znovu.");
      }, Math.max(1, earliestExpiry - now() + 1));
    }
    return "shown";
  }

  // Exactly one consent-gated event per *explicit* submitted calculation,
  // including "no purchase link" outcomes. Focus and visibility refreshes
  // may recheck a source but must not inflate this calculation denominator.
  function trackOutcome(outcome, explicit) {
    if (!explicit || !["shown", "no_safe_match", "unavailable", "unsupported"].includes(outcome)) return;
    windowRoot?.MyPowerSetupAnalytics?.track?.("dcdc_offers_" + outcome);
  }

  async function update(result, { explicit = true } = {}) {
    invalidate();
    if (!result) return;
    active = result;
    const token = generation;
    section.hidden = false;
    section.dataset.buyerFetchState = "loading";
    fallback.hidden = false;
    if (!supportsDcdcBuyerShortlist(result)) {
      trackOutcome(render(null, result, token), explicit);
      return;
    }
    fallback.textContent = "Ověřujeme čerstvé nabídky 12→12 V modelů pod zadaným proudovým limitem…";
    let payload = null;
    try {
      payload = await loadDcdcGuideOffers(fetchImpl);
    } catch {
      // Never render prices or outbound links from untrusted/failed feeds.
    }
    if (token !== generation || !active) return;
    trackOutcome(render(payload, active, token), explicit);
  }

  documentRoot.addEventListener?.("visibilitychange", () => {
    if (!documentRoot.hidden && active) void update(active, { explicit: false });
  });
  windowRoot?.addEventListener?.("focus", () => {
    if (active) void update(active, { explicit: false });
  });
  return Object.freeze({ update, invalidate });
}
