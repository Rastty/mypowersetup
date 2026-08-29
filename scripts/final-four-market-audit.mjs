import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { assessFinalFourMarketReadiness } from "../src/final-readiness.js";
import { assessHungarianLaunchReadiness } from "../src/readiness-hu.js";
import { HU_FINAL_REVIEW } from "../src/review-evidence-hu.js";

function runJsonScript(script, args = []) {
  const stdout = execFileSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  return JSON.parse(stdout);
}

const health = runJsonScript("scripts/check-market-health.mjs");
const preaudit = runJsonScript("scripts/preaudit.mjs");
const huCatalog = JSON.parse(await readFile("data/products-hu.json", "utf8"));
const huLaunch = assessHungarianLaunchReadiness({
  catalog: huCatalog,
  languageReviewed: HU_FINAL_REVIEW.languageReviewed,
  mobileJourneyReviewed: HU_FINAL_REVIEW.mobileJourneyReviewed,
});

const final = assessFinalFourMarketReadiness({
  healthSummary: health.summary,
  healthMarkets: health.markets,
  preaudit,
  huLaunch,
});

const report = {
  generatedAt: new Date().toISOString(),
  readyForRomania: final.readyForRomania,
  blockers: final.blockers,
  acceptedExceptions: final.acceptedExceptions,
  preaudit: {
    safe: preaudit.safe,
    auditReady: preaudit.auditReady,
    hardFailures: preaudit.hardFailures,
    parityGaps: preaudit.parityGaps,
  },
  health: {
    safe: health.summary.safe,
    allHealthy: health.summary.allHealthy,
    markets: health.summary.markets,
  },
  huReview: HU_FINAL_REVIEW,
  huLaunch,
};

console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--require-ready-for-romania") && !report.readyForRomania) process.exitCode = 1;
