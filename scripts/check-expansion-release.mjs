import { assessExpansionReleaseReadiness } from "../src/expansion-release-readiness.js";
import { EXPANSION_NATIVE_REVIEW_PACKS } from "../src/native-review-packs.js";

const report = assessExpansionReleaseReadiness();
console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  ready: report.ready,
  blockers: report.blockers,
  markets: Object.fromEntries(Object.entries(report.reports).map(([key, value]) => [key, {
    publicationReady: value.publicationReady,
    blockers: value.blockers,
    reviewPack: EXPANSION_NATIVE_REVIEW_PACKS[key],
  }])),
}, null, 2));
if (process.argv.includes("--require-ready") && !report.ready) process.exitCode = 1;
