import { execFileSync } from "node:child_process";
import { assessExpansionReadiness } from "../src/expansion-readiness.js";
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
const report = assessExpansionReadiness({
  healthSummary: health.summary,
  healthMarkets: health.markets,
  preaudit,
  huReview: HU_FINAL_REVIEW,
});

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  readyForNextLocalization: report.readyForNextLocalization,
  blockers: report.blockers,
  deferredGaps: report.deferredGaps,
}, null, 2));

if (process.argv.includes("--require-ready") && !report.readyForNextLocalization) process.exitCode = 1;
