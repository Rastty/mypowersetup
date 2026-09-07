import { readFile, writeFile } from "node:fs/promises";
import { buildCommercialOwnerActionQueue } from "../src/commercial-owner-actions.js";

const COMMERCIAL_REPORT = new URL("../data/commercial-opportunity-report.json", import.meta.url);
const OUTPUT = new URL("../data/owner-action-queue.json", import.meta.url);
const checkOnly = process.argv.includes("--check");

const commercialReport = JSON.parse(await readFile(COMMERCIAL_REPORT, "utf8"));
const actions = buildCommercialOwnerActionQueue();
const payload = {
  schemaVersion: 1,
  generatedAt: commercialReport.generatedAt || null,
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
