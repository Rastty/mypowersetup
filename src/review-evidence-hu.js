export const HU_FINAL_REVIEW = Object.freeze({
  reviewedAt: "2026-08-29",
  languageReviewed: true,
  mobileJourneyReviewed: true,
  evidence: Object.freeze({
    language: Object.freeze([
      "Hungarian UI copy reviewed for natural RV/electrical terminology",
      "Power-station wording aligned to current Hungarian usage: power station / hordozható áramforrás / energiaállomás rather than literal erőmű wording",
      "Calculator, recommendation, safety and guide navigation wording checked for Czech/Slovak/Polish leakage",
    ]),
    mobile: Object.freeze([
      "Existing HU private mobile smoke covers the three-step calculator journey at 390x844",
      "Result, recommendations, share/print actions and no-horizontal-overflow checks remain mandatory in CI",
      "HU remains private/noindex until explicit publication gate is executed",
    ]),
  }),
});
