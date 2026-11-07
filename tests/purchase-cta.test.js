import assert from "node:assert/strict";
import test from "node:test";
import { merchantPurchaseCta } from "../src/purchase-cta.js";

test("merchant purchase CTA names the destination in every mature language", () => {
  assert.equal(merchantPurchaseCta("cs", "Ampul.eu"), "Zkontrolovat cenu na Ampul.eu →");
  assert.equal(merchantPurchaseCta("sk", "Padabo.sk"), "Overiť cenu na Padabo.sk →");
  assert.equal(merchantPurchaseCta("pl", "Padabo.pl"), "Sprawdź cenę w Padabo.pl →");
  assert.equal(merchantPurchaseCta("hu", "Ampul.eu"), "Ár ellenőrzése: Ampul.eu →");
});

test("merchant purchase CTA fails closed without a supported locale and merchant", () => {
  assert.throws(() => merchantPurchaseCta("de", "Shop"), /PURCHASE_CTA_LOCALE_AND_MERCHANT_REQUIRED/);
  assert.throws(() => merchantPurchaseCta("cs", "  "), /PURCHASE_CTA_LOCALE_AND_MERCHANT_REQUIRED/);
});


test("inherited object keys are not supported CTA locales", () => {
  for (const locale of ["toString", "constructor", "valueOf", "__proto__"]) {
    assert.throws(() => merchantPurchaseCta(locale, "Ampul.eu"), /PURCHASE_CTA_LOCALE_AND_MERCHANT_REQUIRED/, locale);
  }
});

test("merchant identity must be a visible plain string", () => {
  for (const label of [42, ["Ampul.eu"], { name: "Ampul.eu" }, "Shop\u202e.moc", "Shop\u0000"]) {
    assert.throws(() => merchantPurchaseCta("cs", label), /PURCHASE_CTA_LOCALE_AND_MERCHANT_REQUIRED/);
  }
  assert.equal(merchantPurchaseCta("cs", "  Ampul.eu  "), "Zkontrolovat cenu na Ampul.eu →");
});
