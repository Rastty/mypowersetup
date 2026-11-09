import { buildAffiliateClickParameters } from "./affiliate-analytics.js";
import { createVerifiedGuideImpressionTracker } from "./guide-offer-impressions.js?v=20261109-mppt-buyer1";
import {
  batteryOfferExpiresAt, isBatteryOfferStillEligible, selectBatteryCalculatorOffers,
} from "./battery-calculator-offers.js";

function addText(parent, tag, value, className) {
  const node = parent.ownerDocument.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  parent.append(node);
  return node;
}

// Consent-gated direct product discovery for the Czech sizing calculator only.
// This is an initial Ah/voltage/chemistry filter, never an installation signoff.
export function mountBatteryCalculatorBuyers(root, {
  fetchImpl = globalThis.fetch,
  now = Date.now,
  windowRoot = globalThis.window,
} = {}) {
  const section = root?.querySelector?.("[data-battery-buyers]");
  if (!section || root.dataset.calculatorIntent !== "battery-capacity" ||
      root.dataset.calculatorLocale !== "cs" || typeof fetchImpl !== "function") return null;
  const list = section.querySelector("[data-battery-offer-list]");
  const fallback = section.querySelector("[data-battery-offer-fallback]");
  if (!list || !fallback) return null;
  const documentRoot = section.ownerDocument;
  const impressions = createVerifiedGuideImpressionTracker({
    documentRoot, sections: [section],
    getAnalytics: () => windowRoot?.MyPowerSetupAnalytics,
    Observer: windowRoot?.IntersectionObserver, now,
    allowedSources: ["battery-calculator-match"],
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
    const offers = selectBatteryCalculatorOffers(payload, result, current);
    clear();
    if (!offers.length) {
      noOffers(result.systemVoltage !== 12 || result.batteryType !== "lifepo4"
        ? "Ověřené samostatné baterie zde máme pouze pro 12 V LiFePO₄. U 24 V nebo AGM nebudeme nabízet nesprávnou variantu. Proveďte výběr v kompletním Builderu."
        : "Pro tuto potřebnou kapacitu nyní nemáme jedinou čerstvou ověřenou baterii. Nepředpokládáme automaticky bezpečné paralelní zapojení více kusů.");
      return;
    }
    let earliest = Infinity;
    for (const offer of offers) {
      const expiresAt = batteryOfferExpiresAt(payload, offer);
      if (!Number.isFinite(expiresAt) || expiresAt <= current) continue;
      earliest = Math.min(earliest, expiresAt);
      const item = documentRoot.createElement("li");
      addText(item, "strong", offer.name);
      addText(item, "span",
        offer.specs.capacityAh + " Ah · 12 V LiFePO₄ · BMS " +
        offer.specs.bmsContinuousCurrentA + " A (ověřte skutečné zatížení)",
        "calculator-mppt-offer-facts");
      addText(item, "span", new Intl.NumberFormat("cs-CZ", {
        style: "currency", currency: "CZK", maximumFractionDigits: 0,
      }).format(offer.priceCzk) + " · naposledy ověřená cena",
      "calculator-mppt-offer-facts");
      const link = addText(item, "a", "Ověřit cenu a technické parametry →", "calculator-mppt-offer-link");
      link.href = offer.affiliateUrl;
      link.target = "_blank";
      link.rel = "sponsored noopener noreferrer";
      link.dataset.affiliateClick = "";
      link.dataset.productId = offer.id;
      link.dataset.category = "battery";
      link.dataset.merchant = "vselektro";
      link.dataset.source = "battery-calculator-match";
      link.dataset.offerExpiresAt = String(expiresAt);
      const click = event => {
        if (event.type === "auxclick" ? event.button !== 1
            : event.button !== 0 && event.button !== undefined) return;
        // A link is never a valid conversion event after form input changes,
        // source expiry, or while a newer fetch has superseded this result.
        if (expectedVersion !== version || !active || section.hidden ||
            !isBatteryOfferStillEligible(payload, active, offer, now())) {
          event.preventDefault();
          event.stopPropagation();
          noOffers("Tato nabídka už není aktuálně ověřena. Znovu spusťte výpočet.");
          return;
        }
        windowRoot?.MyPowerSetupAnalytics?.track?.("affiliate_click", buildAffiliateClickParameters(link));
      };
      link.addEventListener("click", click);
      link.addEventListener("auxclick", click);
      list.append(item);
    }
    if (!list.childElementCount) {
      noOffers("Čerstvé nabídky vypršely. Pokračujte do průvodce nebo celého Builderu.");
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
          "Nabídky vypršely. Pro ověření cen a dostupnosti znovu spusťte výpočet.");
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
    fallback.textContent = "Ověřujeme aktuální nabídky konkrétních baterií…";
    fallback.hidden = false;
    let payload = null;
    try {
      const response = await fetchImpl("/data/products.json", {
        cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
      });
      if (response.ok) payload = await response.json();
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
