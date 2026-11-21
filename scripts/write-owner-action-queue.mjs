import { readFile, writeFile } from "node:fs/promises";
import { buildCurrentCommercialOwnerActionQueue, buildActiveCommercialOwnerActionQueue, ACTIVE_MERCHANT_OWNER_SCOPE } from "../src/commercial-owner-actions.js";

const COMMERCIAL_REPORT = new URL("../data/commercial-opportunity-report.json", import.meta.url);
const OUTPUT = new URL("../data/owner-action-queue.json", import.meta.url);
const checkOnly = process.argv.includes("--check");

const commercialReport = JSON.parse(await readFile(COMMERCIAL_REPORT, "utf8"));
// Anchor evidence freshness to the same snapshot as the prioritized backlog.
// --check must remain deterministic across days until the next report refresh.
const researchActions = buildCurrentCommercialOwnerActionQueue(commercialReport.markets || [], {
  asOf: commercialReport.generatedAt,
});
const actions = buildActiveCommercialOwnerActionQueue(commercialReport.markets || [], {
  asOf: commercialReport.generatedAt,
});
const payload = {
  schemaVersion: 2,
  generatedAt: commercialReport.generatedAt || null,
  ownerScope: ACTIVE_MERCHANT_OWNER_SCOPE.mode,
  excludedMerchants: [...ACTIVE_MERCHANT_OWNER_SCOPE.excludedMerchants],
  deferredResearchActionCount: researchActions.length - actions.length,
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
    console.error("OWNER_ACTION_QUEUE_DRIFT");
    process.exitCode = 1;
  } else {
    console.log(`Owner action queue is current: ${actions.length} actions`);
  }
} else {
  await writeFile(OUTPUT, expected, "utf8");
  console.log(`Wrote ${OUTPUT.pathname}: ${actions.length} prioritized owner actions`);
}
