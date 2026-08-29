export const PT_MARKET_RESEARCH = Object.freeze({
  reviewedAt: "2026-08-29",
  locale: "pt-PT",
  terminology: Object.freeze({
    vehicle: "autocaravana",
    battery: "bateria",
    solarPanel: "painel solar / painel fotovoltaico",
    mppt: "controlador de carga solar MPPT",
    dcDc: "carregador DC-DC",
    inverter: "inversor",
  }),
  technicalEvidence: Object.freeze([
    "Current Portuguese product pages use controlador de carga solar MPPT and autocaravana terminology.",
    "Portuguese MPPT listings explicitly distinguish 12 V / 24 V systems, current limits and PV power limits, so compatibility must remain technical rather than text-only.",
    "PT public launch requires local search-intent/content-gap review plus product-by-product availability validation.",
  ]),
  localizationRules: Object.freeze([
    "Use European Portuguese (pt-PT), not Brazilian Portuguese.",
    "Keep shared formulas but localize examples, solar-season context and buying language for Portugal.",
    "ALLPOWERS PT is approved and primary; exact-product deeplink pattern must be verified before affiliate links surface.",
  ]),
});
