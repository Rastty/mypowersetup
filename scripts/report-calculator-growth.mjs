#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { buildCalculatorFunnelSummary } from "../src/calculator-funnel-report.js";
import { buildCalculatorGrowthPriorities, renderCalculatorGrowthMarkdown } from "../src/calculator-growth-priority.js";

const [gscPath, eventsPath, indexingPath] = process.argv.slice(2);
if (!gscPath || !eventsPath) {
  console.error("Usage: node scripts/report-calculator-growth.mjs <gsc.json> <events.json> [indexing.json]");
  process.exitCode = 1;
} else {
  const gscPayload = JSON.parse(await readFile(gscPath, "utf8"));
  const eventsPayload = JSON.parse(await readFile(eventsPath, "utf8"));
  const indexingPayload = indexingPath ? JSON.parse(await readFile(indexingPath, "utf8")) : [];
  const gscRows = rowsFrom(gscPayload, ["rows", "data"]);
  const events = rowsFrom(eventsPayload, ["events", "rows", "data"]);
  const indexingRows = rowsFrom(indexingPayload, ["rows", "data"]);
  const funnelRows = buildCalculatorFunnelSummary(events);
  const priorities = buildCalculatorGrowthPriorities({ gscRows, funnelRows, indexingRows });

  console.log(renderCalculatorGrowthMarkdown(priorities));
  const actionable = priorities.filter((row) => row.primaryOpportunity).slice(0, 3);
  if (!actionable.length) {
    console.log("\nNo evidence-backed optimization is ready yet. Keep collecting GSC/GA data.");
  } else {
    console.log("\nTop evidence-backed actions:");
    actionable.forEach((row, index) => {
      console.log(`${index + 1}. ${row.path} — ${row.primaryOpportunity}: ${row.rationale}`);
      console.log(`   ${row.action}`);
    });
  }
}

function rowsFrom(payload, keys) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key];
  return [];
}
