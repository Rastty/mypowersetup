// Feed priceCzk is the original merchant amount in its declared currency.
// This is a partial subtotal of current product offers, NEVER an installation
// quote and never a converted mixed-currency basket price.
const DISPLAY_CURRENCIES = Object.freeze({
  cs: new Set(["CZK"]),
  sk: new Set(["EUR"]),
  pl: new Set(["PLN", "EUR"]),
});
const DISPLAY_LOCALES = Object.freeze({ cs: "cs-CZ", sk: "sk-SK", pl: "pl-PL" });

export function caravanLinePrice(row, locale) {
  if (!row?.ready || !row.product?.affiliateUrl || !row.product?.id) return null;
  const { product } = row;
  const currency = product.priceCurrency;
  if (!DISPLAY_CURRENCIES[locale]?.has(currency)) return null;
  const price = product.priceCzk;
  if (price === null || price === undefined || price === "" || !Number.isFinite(Number(price)) || Number(price) <= 0) return null;
  const quantity = Number.isSafeInteger(row.quantity) && row.quantity > 0 ? row.quantity : 1;
  const amount = Number(price) * quantity;
  return Number.isFinite(amount) && amount > 0 ? { currency, amount, quantity } : null;
}

export function caravanBasketPriceSummary(plan, locale) {
  if (!DISPLAY_CURRENCIES[locale] || !Array.isArray(plan?.rows)) return null;
  const subtotals = new Map();
  let priced = 0, unpriced = 0, unavailable = 0;
  for (const row of plan.rows) {
    if (!row.ready || !row.product?.affiliateUrl) { unavailable++; continue; }
    const item = caravanLinePrice(row, locale);
    if (!item) { unpriced++; continue; }
    subtotals.set(item.currency, (subtotals.get(item.currency) || 0) + item.amount);
    priced++;
  }
  return {
    subtotals: [...subtotals].map(([currency, amount]) => ({ currency, amount })),
    priced, unpriced, unavailable,
    complete: unavailable === 0 && unpriced === 0 && !plan.manualDesign && plan.rows.length > 0,
  };
}

export function formatCaravanPrice(amount, currency, locale) {
  if (!DISPLAY_CURRENCIES[locale]?.has(currency) || !Number.isFinite(amount) || amount <= 0) return "";
  return new Intl.NumberFormat(DISPLAY_LOCALES[locale], {
    style: "currency", currency, maximumFractionDigits: 2,
  }).format(amount);
}

const COPY = Object.freeze({
  cs: {
    title: "Cena dostupných položek",
    partial: "Mezisoučet vybraných položek, ne cena kompletní sestavy.",
    complete: "Součet cen ověřených položek; kabeláž, jištění a montáž nejsou zahrnuté.",
    missing: "chybějících kategorií",
    unknown: "položek bez použitelné ceny v Kč",
    refresh: "Ceny pocházejí z produktových feedů. Aktuální cenu a dostupnost ověřte u prodejce.",
  },
  sk: {
    title: "Cena dostupných položiek",
    partial: "Medzisúčet vybraných položiek, nie cena kompletnej zostavy.",
    complete: "Súčet cien overených položiek; kabeláž, istenie a montáž nie sú zahrnuté.",
    missing: "chýbajúcich kategórií",
    unknown: "položiek bez použiteľnej ceny v €",
    refresh: "Ceny pochádzajú z produktových feedov. Aktuálnu cenu a dostupnosť overte u predajcu.",
  },
  pl: {
    title: "Koszt dostępnych produktów",
    partial: "Sumy częściowe wybranych produktów, nie cena kompletnego zestawu.",
    complete: "Suma cen zweryfikowanych produktów; przewody, zabezpieczenia i montaż nie są uwzględnione.",
    missing: "brakujących kategorii",
    unknown: "produktów bez ceny w obsługiwanej walucie",
    refresh: "Ceny pochodzą z katalogów sklepów. Aktualną cenę i dostępność sprawdź u sprzedawcy.",
  },
});

export function caravanBasketPriceMarkup(plan, locale) {
  const totals = caravanBasketPriceSummary(plan, locale);
  if (!totals) return "";
  const copy = COPY[locale];
  const esc = (s) => String(s).replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const values = totals.subtotals.map(({currency,amount}) =>
    `<strong class="caravan-price-amount" data-basket-currency="${currency}">${esc(formatCaravanPrice(amount, currency, locale))}</strong>`).join("");
  return `<div class="caravan-price-summary" data-price-completeness="${totals.complete ? "complete" : "partial"}">
    <strong class="caravan-price-heading">${copy.title}</strong>
    <div class="caravan-price-subtotals">${values || "—"}</div>
    <p>${totals.complete ? copy.complete : copy.partial}</p>
    ${totals.unavailable ? `<p>${totals.unavailable} ${copy.missing}</p>` : ""}
    ${totals.unpriced ? `<p>${totals.unpriced} ${copy.unknown}</p>` : ""}
    <small>${copy.refresh}</small>
  </div>`;
}
