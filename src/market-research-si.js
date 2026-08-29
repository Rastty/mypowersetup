export const SI_MARKET_RESEARCH = Object.freeze({
  reviewedAt: "2026-08-29",
  locale: "sl-SI",
  terminology: Object.freeze({
    vehicle: "avtodom",
    battery: "baterija / akumulator",
    solarPanel: "sončni panel / solarni panel",
    mppt: "solarni regulator MPPT",
    dcDc: "DC-DC polnilnik",
    inverter: "inverter / razsmernik",
  }),
  technicalEvidence: Object.freeze([
    "Current Slovenian RV and solar retailers use avtodom and solarni regulator MPPT terminology.",
    "Slovenian MPPT product pages explicitly distinguish 12 V / 24 V systems, charging current and maximum PV power, so compatibility must remain technical rather than title-only.",
    "ALLPOWERS International currently lists Slovenia among supported European markets and its EU shipping policy explicitly lists Slovenia for free shipping from EU warehouses.",
  ]),
  localizationRules: Object.freeze([
    "Keep the first Slovenia version intentionally lean: calculator plus the highest-intent decision pages before expanding the content footprint.",
    "Do not translate Czech wording mechanically; use natural Slovenian avtodom and electrical terminology.",
    "Use ALLPOWERS INTERNATIONAL only for exact Slovenia-eligible product destinations and fail closed when shipping or product eligibility is uncertain.",
  ]),
});
