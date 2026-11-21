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

// Turn the same vetted BOM into a realistic checkout plan across stores.
// One merchant may provide several components; never imply one combined
// checkout across different merchants or invent shipping costs.
export function caravanMerchantGroups(plan, locale) {
  if (!DISPLAY_CURRENCIES[locale] || !Array.isArray(plan?.rows)) return [];
  const byMerchant = new Map();
  for (const row of plan.rows) {
    const product = row?.product;
    if (!row.ready || !product?.id || !product?.affiliateUrl || !product?.merchant) continue;
    const merchant = product.merchant;
    if (!byMerchant.has(merchant)) byMerchant.set(merchant, {
      merchant, count: 0, products: [], subtotals: new Map(), unpriced: 0,
    });
    const group = byMerchant.get(merchant);
    group.count++;
    group.products.push({ category: row.category, quantity: row.quantity || 1 });
    const priced = caravanLinePrice(row, locale);
    if (priced) group.subtotals.set(priced.currency, (group.subtotals.get(priced.currency) || 0) + priced.amount);
    else group.unpriced++;
  }
  return [...byMerchant.values()].map(({ subtotals, ...group }) => ({
    ...group, subtotals: [...subtotals].map(([currency,amount])=>({currency,amount})),
  }));
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
    shops: "Rozdělení podle obchodů", shopsNote: "Každý obchod má vlastní objednávku a dopravu; položky kupujte samostatně přes odkazy výše.", items: "položek", storeUnknown: "část bez ceny",
    partial: "Mezisoučet vybraných položek, ne cena kompletní sestavy.",
    complete: "Součet cen ověřených položek; kabeláž, jištění a montáž nejsou zahrnuté.",
    missing: "chybějících kategorií",
    unknown: "položek bez použitelné ceny v Kč",
    refresh: "Ceny pocházejí z produktových feedů. Aktuální cenu a dostupnost ověřte u prodejce.",
  },
  sk: {
    title: "Cena dostupných položiek",
    shops: "Rozdelenie podľa obchodov", shopsNote: "Každý obchod má vlastnú objednávku a dopravu; produkty nakupujte cez odkazy vyššie.", items: "položiek", storeUnknown: "časť bez ceny",
    partial: "Medzisúčet vybraných položiek, nie cena kompletnej zostavy.",
    complete: "Súčet cien overených položiek; kabeláž, istenie a montáž nie sú zahrnuté.",
    missing: "chýbajúcich kategórií",
    unknown: "položiek bez použiteľnej ceny v €",
    refresh: "Ceny pochádzajú z produktových feedov. Aktuálnu cenu a dostupnosť overte u predajcu.",
  },
  pl: {
    title: "Koszt dostępnych produktów",
    shops: "Podział według sklepów", shopsNote: "Każdy sklep to osobne zamówienie i dostawa; produkty kupuj przez linki powyżej.", items: "produktów", storeUnknown: "część bez ceny",
    partial: "Sumy częściowe wybranych produktów, nie cena kompletnego zestawu.",
    complete: "Suma cen zweryfikowanych produktów; przewody, zabezpieczenia i montaż nie są uwzględnione.",
    missing: "brakujących kategorii",
    unknown: "produktów bez ceny w obsługiwanej walucie",
    refresh: "Ceny pochodzą z katalogów sklepów. Aktualną cenę i dostępność sprawdź u sprzedawcy.",
  },
});

export function caravanBasketPriceMarkup(plan, locale, merchantLabel = (id) => id) {
  const totals = caravanBasketPriceSummary(plan, locale);
  if (!totals) return "";
  const copy = COPY[locale];
  const esc = (s) => String(s).replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const stores = caravanMerchantGroups(plan, locale);
  const storeRows = stores.map((store) => {
    const label = esc(merchantLabel(store.merchant) || store.merchant);
    const amounts = store.subtotals.map(({currency,amount})=>esc(formatCaravanPrice(amount,currency,locale))).join(" + ");
    return `<li data-store-group="${esc(store.merchant)}"><strong>${label}</strong> <span>${store.count} ${copy.items}</span>
      ${amounts ? `<span class="caravan-store-amount">${amounts}</span>` : ""}
      ${store.unpriced ? `<small>${store.unpriced} ${copy.storeUnknown}</small>` : ""}</li>`;
  }).join("");
  const values = totals.subtotals.map(({currency,amount}) =>
    `<strong class="caravan-price-amount" data-basket-currency="${currency}">${esc(formatCaravanPrice(amount, currency, locale))}</strong>`).join("");
  return `<div class="caravan-price-summary" data-price-completeness="${totals.complete ? "complete" : "partial"}">
    <strong class="caravan-price-heading">${copy.title}</strong>
    <div class="caravan-price-subtotals">${values || "—"}</div>
    <p>${totals.complete ? copy.complete : copy.partial}</p>
    ${totals.unavailable ? `<p>${totals.unavailable} ${copy.missing}</p>` : ""}
    ${totals.unpriced ? `<p>${totals.unpriced} ${copy.unknown}</p>` : ""}
    ${stores.length ? `<div class="caravan-store-groups"><strong>${copy.shops} (${stores.length})</strong><ul>${storeRows}</ul><small>${copy.shopsNote}</small></div>` : ""}
    <small>${copy.refresh}</small>
  </div>`;
}
