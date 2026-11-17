const GENERIC_AMPUL_SHIPPING_EVIDENCE = Object.freeze({
  sourceUrl: "https://ampul.eu/en/",
  scope: "32_european_countries",
  targetMarketsVerified: Object.freeze([]),
});

const EVIDENCE_BY_CANDIDATE = Object.freeze({
  "ampul-eu-inverter-24v-2000w": Object.freeze({
    checkedAt: "2026-11-17",
    evidenceType: "public_catalog_partial",
    productUrl: "https://ampul.eu/en/inverters-and-ac-dc-converters/5577-7391-voltage-converter-from-dc-to-230v-ac-50hz-2000w",
    catalogSpecs: Object.freeze({
      outputVoltageV: 230,
      maxAdvertisedPowerW: 2000,
      continuousPowerW: null,
      pureSine: true,
      listedInputVoltagesV: Object.freeze([12, 24, 48, 60, 72]),
    }),
    publicStockScope: "product_family",
    publicStockStatus: "in_stock_at_supplier",
    genericShippingEvidence: GENERIC_AMPUL_SHIPPING_EVIDENCE,
    verifiedChecks: Object.freeze([
      "product_family_2000w_maximum_pure_sine",
      "24v_variant_listed",
      "product_family_stock_at_supplier",
      "generic_eu_shipping_claim",
    ]),
    unresolvedChecks: Object.freeze([
      "rated_continuous_power_w",
      "exact_24v_variant_stock",
      "pt-PT_checkout",
      "ro-RO_checkout",
      "sl-SI_checkout",
    ]),
  }),
  "ampul-eu-dcdc-12v-30a": Object.freeze({
    checkedAt: "2026-11-17",
    evidenceType: "public_catalog_partial",
    productUrl: "https://ampul.eu/en/battery-chargers/6195-dc-dc-lifepo4-battery-charger-146v-30a-400w-ip68",
    localizedProductEvidence: Object.freeze({
      ro: "https://ampul.eu/ro/incarcatoare/6195-incarcator-baterie-dc-dc-lifepo4-146v-30a-400w-ip68",
    }),
    catalogSpecs: Object.freeze({
      batteryVoltageV: 12,
      outputVoltageV: 14.6,
      chargingCurrentA: 30,
      powerW: 400,
      ipRating: "unverified_conflict_title_ip68_specs_ip65",
    }),
    publicStockScope: "exact_product",
    publicStockStatus: "in_stock_at_supplier",
    genericShippingEvidence: GENERIC_AMPUL_SHIPPING_EVIDENCE,
    verifiedChecks: Object.freeze([
      "exact_product_listed",
      "exact_product_electrical_specs_match",
      "exact_product_stock_at_supplier",
      "romanian_localized_product_page_live",
      "generic_eu_shipping_claim",
    ]),
    unresolvedChecks: Object.freeze([
      "ip_rating_conflict_ip68_title_ip65_specs",
      "pt-PT_checkout",
      "ro-RO_checkout",
      "sl-SI_checkout",
    ]),
  }),
});

export function getCommercialVerificationEvidence(candidateId) {
  return EVIDENCE_BY_CANDIDATE[candidateId] || null;
}

export function listCommercialVerificationEvidence() {
  return Object.freeze(Object.entries(EVIDENCE_BY_CANDIDATE).map(([candidateId, evidence]) => Object.freeze({
    candidateId,
    ...evidence,
  })));
}
