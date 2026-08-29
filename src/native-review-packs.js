const COMMON_REVIEW_ITEMS = Object.freeze([
  "Homepage hero, calculator labels and result terminology read naturally to a native speaker.",
  "Battery, solar, inverter, MPPT, DC-DC and 230 V terminology matches local caravan/motorhome usage.",
  "Trust pages are clear, non-misleading and commercially transparent.",
  "All ten guide titles, intros and technical explanations are idiomatic and technically understandable.",
  "Affiliate disclosure is natural and does not imply that commission affects the technical recommendation.",
  "Privacy/analytics consent copy is clear and appropriate for the locale.",
  "No obvious literal translations, mixed-language fragments, false friends or unnatural units/abbreviations remain.",
]);

export const EXPANSION_NATIVE_REVIEW_PACKS = Object.freeze({
  pt: Object.freeze({
    locale: "pt-PT",
    market: "Portugal",
    calculatorRoute: "/pt/",
    guideHub: "/pt/guias/",
    trustRoutes: Object.freeze(["/pt/sobre-o-projeto/", "/pt/metodologia/", "/pt/afiliacao/", "/pt/privacidade/"]),
    reviewerRequirement: "Native European Portuguese speaker familiar with practical technical/product language.",
    reviewItems: COMMON_REVIEW_ITEMS,
  }),
  si: Object.freeze({
    locale: "sl-SI",
    market: "Slovenia",
    calculatorRoute: "/si/",
    guideHub: "/si/vodici/",
    trustRoutes: Object.freeze(["/si/o-projektu/", "/si/metodologija/", "/si/affiliate/", "/si/zasebnost/"]),
    reviewerRequirement: "Native Slovenian speaker familiar with practical caravan/electrical terminology.",
    reviewItems: COMMON_REVIEW_ITEMS,
  }),
  ro: Object.freeze({
    locale: "ro-RO",
    market: "Romania",
    calculatorRoute: "/ro/",
    guideHub: "/ro/ghiduri/",
    trustRoutes: Object.freeze(["/ro/despre-proiect/", "/ro/metodologie/", "/ro/afiliere/", "/ro/confidentialitate/"]),
    reviewerRequirement: "Native Romanian speaker familiar with practical autorulotă/rulotă electrical terminology.",
    reviewItems: COMMON_REVIEW_ITEMS,
  }),
});

export function createNativeReviewChecklist(marketKey, evidence = {}) {
  const pack = EXPANSION_NATIVE_REVIEW_PACKS[marketKey];
  if (!pack) throw new Error(`NATIVE_REVIEW_MARKET_UNKNOWN:${marketKey}`);
  const approved = evidence.nativeSpeaker === true
    && typeof evidence.reviewer === "string" && evidence.reviewer.trim().length >= 2
    && typeof evidence.reviewedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(evidence.reviewedAt)
    && evidence.calculatorReviewed === true
    && evidence.guidesReviewed === true
    && evidence.trustReviewed === true
    && evidence.terminologyReviewed === true
    && evidence.blockingIssuesResolved === true;
  return Object.freeze({
    market: marketKey,
    locale: pack.locale,
    approved,
    reviewer: evidence.reviewer?.trim() || null,
    reviewedAt: evidence.reviewedAt || null,
    evidence: Object.freeze({
      nativeSpeaker: evidence.nativeSpeaker === true,
      calculatorReviewed: evidence.calculatorReviewed === true,
      guidesReviewed: evidence.guidesReviewed === true,
      trustReviewed: evidence.trustReviewed === true,
      terminologyReviewed: evidence.terminologyReviewed === true,
      blockingIssuesResolved: evidence.blockingIssuesResolved === true,
    }),
    blockers: Object.freeze([
      !evidence.nativeSpeaker && "nativeSpeaker",
      !(typeof evidence.reviewer === "string" && evidence.reviewer.trim().length >= 2) && "reviewer",
      !(typeof evidence.reviewedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(evidence.reviewedAt)) && "reviewedAt",
      !evidence.calculatorReviewed && "calculatorReviewed",
      !evidence.guidesReviewed && "guidesReviewed",
      !evidence.trustReviewed && "trustReviewed",
      !evidence.terminologyReviewed && "terminologyReviewed",
      !evidence.blockingIssuesResolved && "blockingIssuesResolved",
    ].filter(Boolean)),
  });
}
