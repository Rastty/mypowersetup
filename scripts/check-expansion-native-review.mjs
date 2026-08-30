import { EXPANSION_NATIVE_REVIEW_PACKS, createNativeReviewChecklist } from "../src/native-review-packs.js";
import { PT_REVIEW_EVIDENCE } from "../src/review-evidence-pt.js";
import { SI_REVIEW_EVIDENCE } from "../src/review-evidence-si.js";
import { RO_REVIEW_EVIDENCE } from "../src/review-evidence-ro.js";
import { assessExpansionNativeApproval } from "../src/expansion-publication.js";

const EVIDENCE = { pt: PT_REVIEW_EVIDENCE, si: SI_REVIEW_EVIDENCE, ro: RO_REVIEW_EVIDENCE };
const selected = process.argv[2] ? [process.argv[2]] : ["pt", "si", "ro"];

for (const market of selected) {
  const pack = EXPANSION_NATIVE_REVIEW_PACKS[market];
  if (!pack) throw new Error(`NATIVE_REVIEW_MARKET_UNKNOWN:${market}`);
  const evidence = EVIDENCE[market];
  const checklist = createNativeReviewChecklist(market, evidence);
  const assessment = assessExpansionNativeApproval(market, evidence);
  console.log(JSON.stringify({
    market,
    locale: pack.locale,
    reviewerRequirement: pack.reviewerRequirement,
    routes: {
      calculator: pack.calculatorRoute,
      guideHub: pack.guideHub,
      trust: pack.trustRoutes,
    },
    reviewItems: pack.reviewItems,
    evidence: checklist.evidence,
    reviewer: checklist.reviewer,
    reviewedAt: checklist.reviewedAt,
    blockers: assessment.blockers,
    readyForPublication: assessment.ready,
  }, null, 2));
}
