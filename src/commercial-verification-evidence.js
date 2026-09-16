const EVIDENCE_BY_CANDIDATE = Object.freeze({
  "ampul-eu-inverter-24v-2000w": Object.freeze({
    checkedAt: "2026-09-16",
    evidenceType: "public_catalog_partial",
    productUrl: "https://ampul.eu/en/voltage-converters/5577-7391-voltage-converter-from-dc-to-230v-ac-50hz-2000w",
    catalogSpecs: Object.freeze({
      outputVoltageV: 230,
      powerW: 2000,
      pureSine: true,
      listedInputVoltagesV: Object.freeze([12, 24, 48, 60, 72]),
    }),
    publicStockScope: "product_family",
    publicStockStatus: "in_stock_at_supplier",
    genericShippingEvidence: Object.freeze({
      sourceUrl: "https://ampul.eu/en/",
      scope: "32_european_countries",
      targetMarketsVerified: Object.freeze([]),
    }),
    verifiedChecks: Object.freeze([
      "product_family_2000w_pure_sine",
      "24v_variant_listed",
      "product_family_stock_at_supplier",
      "generic_eu_shipping_claim",
    ]),
    unresolvedChecks: Object.freeze([
      "exact_24v_variant_stock",
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
