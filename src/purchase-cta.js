const COPY = Object.freeze({
  cs: (merchant) => `Zkontrolovat cenu na ${merchant} →`,
  sk: (merchant) => `Overiť cenu na ${merchant} →`,
  pl: (merchant) => `Sprawdź cenę w ${merchant} →`,
  hu: (merchant) => `Ár ellenőrzése: ${merchant} →`,
});

export function merchantPurchaseCta(locale, merchantLabel) {
  // A prototype property (e.g. "toString") is not a supported locale.
  // Never produce a purchase CTA without a known locale and merchant label.
  const copy = Object.hasOwn(COPY, locale) ? COPY[locale] : null;
  const merchant = typeof merchantLabel === "string" ? merchantLabel.trim() : "";
  // Control and bidirectional override characters can disguise a destination.
  if (!copy || !merchant || /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(merchant)) {
    throw new TypeError("PURCHASE_CTA_LOCALE_AND_MERCHANT_REQUIRED");
  }
  return copy(merchant);
}
