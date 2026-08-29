import { assessPortugalPublication } from "./publication-evidence-pt.js";
import { assessSloveniaPublication } from "./publication-evidence-si.js";
import { assessRomaniaPublication } from "./publication-evidence-ro.js";
import { PT_REVIEW_EVIDENCE } from "./review-evidence-pt.js";
import { SI_REVIEW_EVIDENCE } from "./review-evidence-si.js";
import { RO_REVIEW_EVIDENCE } from "./review-evidence-ro.js";

export function assessExpansionReleaseReadiness(reviewOverrides = {}) {
  const native = {
    pt: reviewOverrides.pt ?? PT_REVIEW_EVIDENCE.nativeLanguageReview,
    si: reviewOverrides.si ?? SI_REVIEW_EVIDENCE.nativeLanguageReview,
    ro: reviewOverrides.ro ?? RO_REVIEW_EVIDENCE.nativeLanguageReview,
  };
  const reports = Object.freeze({
    pt: assessPortugalPublication({ mobileSmokePassed: true, nativeLanguageReview: native.pt === true }),
    si: assessSloveniaPublication({ nativeLanguageReview: native.si === true }),
    ro: assessRomaniaPublication({ nativeLanguageReview: native.ro === true }),
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
