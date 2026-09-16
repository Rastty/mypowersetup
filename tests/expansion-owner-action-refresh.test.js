import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflowPath = ".github/workflows/sync-products-expansion-eu.yml";

test("expansion catalog refresh regenerates owner actions after opportunity report", async () => {
  const workflow = await readFile(workflowPath, "utf8");
  const reportStep = "node scripts/write-commercial-opportunity-report.mjs";
  const ownerStep = "node scripts/write-owner-action-queue.mjs";

  const reportIndex = workflow.indexOf(reportStep);
  const ownerIndex = workflow.indexOf(ownerStep);

  assert.ok(reportIndex >= 0, "expansion workflow must regenerate the commercial opportunity report");
  assert.ok(ownerIndex > reportIndex, "owner action queue must be regenerated after the opportunity report");
});

test("expansion catalog refresh commits owner queue with its source report", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(
    workflow,
    /git diff --quiet --[^\n]*data\/commercial-opportunity-report\.json[^\n]*data\/owner-action-queue\.json/,
    "drift check must include both opportunity report and owner action queue"
  );
  assert.match(
    workflow,
    /git add --[^\n]*data\/commercial-opportunity-report\.json[^\n]*data\/owner-action-queue\.json/,
    "commit must stage owner action queue together with its source report"
  );
});
