import { caravanBasketPriceSummary, caravanMerchantGroups, formatCaravanPrice } from "./caravan-basket-pricing.js?v=20261121-merchant1";

// Result-first preview of the EXACT buyer plan, not a second pricing engine.
// A mixed PLN/EUR basket is displayed as separate subtotals; missing products
// and missing prices can never be presented as a complete project quote.
const COPY = Object.freeze({
  cs: {
    complete: "Orientační součet vybraných produktů",
    partial: "Součet známých cen dostupných položek",
    unavailablePriceLabel: "Nákupní možnosti bez ověřených cen",
    unavailablePriceAction: "Ceny ověřte v obchodech",
    category: (ready, all) => `${ready}/${all} kategorií s nákupní možností`,
    shops: (n) => `${n} ${n === 1 ? "obchod" : n >= 2 && n <= 4 ? "obchody" : "obchodů"} pro vybrané položky`,
    shopsNote: "Jde o samostatné nákupy; každý obchod účtuje vlastní dopravu.",
    merchantHeading: "Rozdělení nákupu podle obchodů", merchantFallback: (n) => `Obchod ${n}`, items: (n) => `${n} ${n === 1 ? "položka" : n < 5 ? "položky" : "položek"}`, noPrice: "cena u prodejce", merchantUnpriced: (n) => `${n} bez ceny`, 
    missing: (n) => `${n} chybí`,
    unpriced: (n) => `${n} bez ověřitelné ceny`,
    note: "Bez dopravy, kabeláže, jištění a montáže. Aktuální ceny a sklad ověřte u obchodů.",
  },
  sk: {
    complete: "Orientačný súčet vybraných produktov",
    partial: "Súčet známych cien dostupných položiek",
    unavailablePriceLabel: "Nákupné možnosti bez overených cien",
    unavailablePriceAction: "Ceny overte v obchodoch",
    category: (ready, all) => `${ready}/${all} kategórií s nákupnou možnosťou`,
    shops: (n) => `${n} ${n === 1 ? "obchod" : n >= 2 && n <= 4 ? "obchody" : "obchodov"} pre vybrané položky`,
    shopsNote: "Ide o samostatné nákupy; každý obchod účtuje vlastnú dopravu.",
    merchantHeading: "Rozdelenie nákupu podľa obchodov", merchantFallback: (n) => `Obchod ${n}`, items: (n) => `${n} ${n === 1 ? "položka" : n < 5 ? "položky" : "položiek"}`, noPrice: "cena u predajcu", merchantUnpriced: (n) => `${n} bez ceny`, 
    missing: (n) => `${n} chýba`,
    unpriced: (n) => `${n} bez overiteľnej ceny`,
    note: "Bez dopravy, kabeláže, istenia a montáže. Aktuálne ceny a sklad overte v obchodoch.",
  },
  pl: {
    complete: "Orientacyjna suma cen wybranych produktów",
    partial: "Suma znanych cen dostępnych produktów",
    unavailablePriceLabel: "Oferty zakupowe bez zweryfikowanych cen",
    unavailablePriceAction: "Sprawdź ceny w sklepach",
    category: (ready, all) => `${ready}/${all} kategorii z ofertą zakupową`,
    shops: (n) => `${n} ${n === 1 ? "sklep" : n >= 2 && n <= 4 ? "sklepy" : "sklepów"} z wybranymi produktami`,
    shopsNote: "To osobne zamówienia; każdy sklep nalicza własny koszt dostawy.",
    merchantHeading: "Podział zakupów na sklepy", merchantFallback: (n) => `Sklep ${n}`, items: (n) => `${n} ${n === 1 ? "produkt" : n < 5 ? "produkty" : "produktów"}`, noPrice: "cena w sklepie", merchantUnpriced: (n) => `${n} bez ceny`, 
    missing: (n) => `${n} brakujących`,
    unpriced: (n) => `${n} bez sprawdzonej ceny`,
    note: "Bez dostawy, przewodów, zabezpieczeń i montażu. Sprawdź ceny i dostępność w sklepach.",
  },
});

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g,
  (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);

export function featuredCaravanBasketBudgetMarkup(plan, locale, merchantLabel = () => "") {
  const t = COPY[locale];
  const budget = caravanBasketPriceSummary(plan, locale);
  if (!t || !budget || !Array.isArray(plan?.rows) || !plan.rows.length) return "";
  // Count only the same source-gated merchant items as the full buyer plan.
  // A product with a valid purchase route but no confirmed local price
  // still needs a visible shopping status, never a made-up zero subtotal.
  const merchants = caravanMerchantGroups(plan, locale);
  if (!merchants.length) return "";
  const all = plan.rows.length;
  const ready = merchants.reduce((sum, group) => sum + group.count, 0);
  const prices = budget.subtotals.map(({ amount, currency }) =>
    formatCaravanPrice(amount, currency, locale)).filter(Boolean);
  const hasPrices = prices.length > 0;
  // This is a complete *product-selection subtotal*, not an electrical
  // installation signoff or all-in project price.
  const complete = hasPrices && ready === all && plan.complete === true && budget.complete === true;
  const warnings = [
    t.category(ready, all),
    ...(merchants.length ? [t.shops(merchants.length)] : []),
    ...(budget.unavailable ? [t.missing(budget.unavailable)] : []),
    ...(budget.unpriced ? [t.unpriced(budget.unpriced)] : []),
  ];
  // Keep the actual per-shop checkout split visible next to the result-first
  // recommendation cards. Reuse the validated basket groups and currencies;
  // never reveal raw merchant IDs or fabricate shipping/FX/unknown prices.
  const merchantPreview = merchants.length > 1
    ? `<div class="featured-basket-merchants" role="list" aria-label="${escapeHtml(t.merchantHeading)}">${merchants.map((group, index) => {
      const named = merchantLabel(group.merchant);
      const label = typeof named === "string" && named.trim() && named !== group.merchant
        ? named.trim() : t.merchantFallback(index + 1);
      const amount = group.subtotals.map(({ amount, currency }) =>
        formatCaravanPrice(amount, currency, locale)).filter(Boolean).join(" + ");
      const unpriced = group.unpriced ? t.merchantUnpriced(group.unpriced) : "";
      return `<div class="featured-basket-merchant" role="listitem"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(t.items(group.count))}</span><span>${escapeHtml(amount || t.noPrice)}${unpriced ? ` · ${escapeHtml(unpriced)}` : ""}</span></div>`;
    }).join("")}</div>` : "";
  return `<div class="featured-basket-budget" data-budget-completeness="${!hasPrices ? "unpriced" : complete ? "selected-products" : "partial"}">
    <div class="featured-basket-budget-main"><span>${!hasPrices ? t.unavailablePriceLabel : complete ? t.complete : t.partial}</span><strong>${hasPrices ? prices.join(" + ") : t.unavailablePriceAction}</strong></div>
    ${merchantPreview}
    <small>${warnings.join(" · ")}. ${merchants.length > 1 ? `${t.shopsNote} ` : ""}${t.note}</small>
  </div>`;
}
