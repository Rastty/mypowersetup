const COPY = Object.freeze({
  cs: (merchant) => `Zkontrolovat cenu na ${merchant} →`,
  sk: (merchant) => `Overiť cenu na ${merchant} →`,
  pl: (merchant) => `Sprawdź cenę w ${merchant} →`,
  hu: (merchant) => `Ár ellenőrzése: ${merchant} →`,
});

export function merchantPurchaseCta(locale, merchantLabel) {
  const copy = COPY[locale];
  const merchant = String(merchantLabel || "").trim();
  if (!copy || !merchant) throw new TypeError("PURCHASE_CTA_LOCALE_AND_MERCHANT_REQUIRED");
  return copy(merchant);
}
