import { caravanBasketPriceSummary, formatCaravanPrice } from "./caravan-basket-pricing.js?v=20261121-merchant1";

// Result-first preview of the EXACT buyer plan, not a second pricing engine.
// A mixed PLN/EUR basket is displayed as separate subtotals; missing products
// and missing prices can never be presented as a complete project quote.
const COPY = Object.freeze({
  cs: {
    complete: "Orientační součet vybraných produktů",
    partial: "Součet známých cen dostupných položek",
    category: (ready, all) => `${ready}/${all} kategorií s nákupní možností`,
    missing: (n) => `${n} chybí`,
    unpriced: (n) => `${n} bez ověřitelné ceny`,
    note: "Bez dopravy, kabeláže, jištění a montáže. Aktuální ceny a sklad ověřte u obchodů.",
  },
  sk: {
    complete: "Orientačný súčet vybraných produktov",
    partial: "Súčet známych cien dostupných položiek",
    category: (ready, all) => `${ready}/${all} kategórií s nákupnou možnosťou`,
    missing: (n) => `${n} chýba`,
    unpriced: (n) => `${n} bez overiteľnej ceny`,
    note: "Bez dopravy, kabeláže, istenia a montáže. Aktuálne ceny a sklad overte v obchodoch.",
  },
  pl: {
    complete: "Orientacyjna suma cen wybranych produktów",
    partial: "Suma znanych cen dostępnych produktów",
    category: (ready, all) => `${ready}/${all} kategorii z ofertą zakupową`,
    missing: (n) => `${n} brakujących`,
    unpriced: (n) => `${n} bez sprawdzonej ceny`,
    note: "Bez dostawy, przewodów, zabezpieczeń i montażu. Sprawdź ceny i dostępność w sklepach.",
  },
});

export function featuredCaravanBasketBudgetMarkup(plan, locale) {
  const t = COPY[locale];
  const budget = caravanBasketPriceSummary(plan, locale);
  if (!t || !budget?.subtotals?.length || budget.priced === 0
    || !Array.isArray(plan?.rows) || !plan.rows.length) return "";
  const all = plan.rows.length;
  const ready = plan.rows.filter(row => row?.ready === true).length;
  // This is a complete *product-selection subtotal*, not an electrical
  // installation signoff or all-in project price.
  const complete = plan.complete === true && budget.complete === true;
  const prices = budget.subtotals.map(({ amount, currency }) =>
    formatCaravanPrice(amount, currency, locale)).filter(Boolean);
  if (!prices.length) return "";
  const warnings = [
    t.category(ready, all),
    ...(budget.unavailable ? [t.missing(budget.unavailable)] : []),
    ...(budget.unpriced ? [t.unpriced(budget.unpriced)] : []),
  ];
  return `<div class="featured-basket-budget" data-budget-completeness="${complete ? "selected-products" : "partial"}">
    <div class="featured-basket-budget-main"><span>${complete ? t.complete : t.partial}</span><strong>${prices.join(" + ")}</strong></div>
    <small>${warnings.join(" · ")}. ${t.note}</small>
  </div>`;
}
