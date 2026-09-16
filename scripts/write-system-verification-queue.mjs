import { readFile, writeFile } from "node:fs/promises";
import { buildCurrentCommercialSystemVerificationQueue } from "../src/commercial-system-verification-actions.js";

const COMMERCIAL_REPORT = new URL("../data/commercial-opportunity-report.json", import.meta.url);
const AMPUL_MARKET_VERIFICATION = new URL("../data/ampul-expansion-market-verification.json", import.meta.url);
const OUTPUT = new URL("../data/system-verification-queue.json", import.meta.url);
const checkOnly = process.argv.includes("--check");

const [commercialReport, ampulMarketVerification] = await Promise.all([
  readFile(COMMERCIAL_REPORT, "utf8").then(JSON.parse),
  readFile(AMPUL_MARKET_VERIFICATION, "utf8").then(JSON.parse),
]);
const actions = buildCurrentCommercialSystemVerificationQueue(commercialReport.markets || [], {
  ampulMarketVerification,
});
const payload = {
  schemaVersion: 2,
  generatedAt: commercialReport.generatedAt || null,
  policy: "verification_only_fail_closed_no_publication",
  actionCount: actions.length,
  topAction: actions[0] || null,
  actions,
};
const expected = `${JSON.stringify(payload, null, 2)}\n`;

if (checkOnly) {
  let committed = "";
  try {
    committed = await readFile(OUTPUT, "utf8");
  } catch {}
  if (committed !== expected) {
    console.error("SYSTEM_VERIFICATION_QUEUE_DRIFT");
    process.exitCode = 1;
  } else {
    console.log(`System verification queue is current: ${actions.length} actions`);
  }
} else {
  await writeFile(OUTPUT, expected, "utf8");
  console.log(`Wrote ${OUTPUT.pathname}: ${actions.length} prioritized system verification actions`);
}
