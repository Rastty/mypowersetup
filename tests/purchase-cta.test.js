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
