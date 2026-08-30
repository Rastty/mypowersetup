import { assessPortugalPublication } from "./publication-evidence-pt.js";
import { assessSloveniaPublication } from "./publication-evidence-si.js";
import { assessRomaniaPublication } from "./publication-evidence-ro.js";
import { PT_REVIEW_EVIDENCE } from "./review-evidence-pt.js";
import { SI_REVIEW_EVIDENCE } from "./review-evidence-si.js";
import { RO_REVIEW_EVIDENCE } from "./review-evidence-ro.js";

export function assessExpansionReleaseReadiness(reviewOverrides = {}) {
  const reviewed = {
    pt: reviewOverrides.pt ?? (PT_REVIEW_EVIDENCE.languageEditorialReview === true || PT_REVIEW_EVIDENCE.nativeLanguageReview === true),
    si: reviewOverrides.si ?? (SI_REVIEW_EVIDENCE.languageEditorialReview === true || SI_REVIEW_EVIDENCE.nativeLanguageReview === true),
    ro: reviewOverrides.ro ?? (RO_REVIEW_EVIDENCE.languageEditorialReview === true || RO_REVIEW_EVIDENCE.nativeLanguageReview === true),
  };
  const reports = Object.freeze({
    pt: assessPortugalPublication({ mobileSmokePassed: true, nativeLanguageReview: reviewed.pt === true }),
    si: assessSloveniaPublication({ nativeLanguageReview: reviewed.si === true }),
    ro: assessRomaniaPublication({ nativeLanguageReview: reviewed.ro === true }),
  });
  const ready = Object.values(reports).every((report) => report.publicationReady);
  return Object.freeze({
    ready,
    reports,
    blockers: Object.freeze(Object.entries(reports).flatMap(([market, report]) => report.blockers.map((blocker) => `${market}:${blocker}`))),
  });
}

export function requireExpansionReleaseReadiness(reviewOverrides = {}) {
  const report = assessExpansionReleaseReadiness(reviewOverrides);
  if (!report.ready) throw new Error(`EXPANSION_RELEASE_BLOCKED:${report.blockers.join(",")}`);
  return report;
}
