export const RO_MARKET_RESEARCH = Object.freeze({
  reviewedAt: "2026-08-29",
  locale: "ro-RO",
  terminology: Object.freeze({
    vehicle: "autorulotă",
    battery: "baterie / acumulator",
    solarPanel: "panou fotovoltaic / panou solar",
    mppt: "controler solar MPPT",
    dcDc: "încărcător DC-DC",
    inverter: "invertor",
  }),
  technicalEvidence: Object.freeze([
    "Romanian current technical sources use controler solar MPPT and distinguish 12 V / 24 V battery systems.",
    "MPPT sizing content must preserve battery voltage, charging current and PV input limits rather than translate generic controller labels.",
    "RO public launch requires a local SERP/content-gap review and product-by-product shipping/affiliate validation.",
  ]),
  localizationRules: Object.freeze([
    "Do not translate Czech caravan terminology literally; use Romanian autorulotă vocabulary.",
    "Keep engine formulas shared, but localize examples, solar-season explanations and buying context.",
    "ALLPOWERS INTERNATIONAL is the initial approved affiliate source; exact-product destinations only.",
  ]),
});
