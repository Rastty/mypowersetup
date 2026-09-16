#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { buildCalculatorFunnelSummary } from "../src/calculator-funnel-report.js";
import { buildCalculatorGrowthPriorities, renderCalculatorGrowthMarkdown } from "../src/calculator-growth-priority.js";
import { normalizeGa4CalculatorEventRows, normalizeGscExportRows, normalizeIndexingExportRows, parseDelimitedText } from "../src/calculator-growth-input.js";

const [gscPath, eventsPath, indexingPath] = process.argv.slice(2);
if (!gscPath || !eventsPath) {
  console.error("Usage: node scripts/report-calculator-growth.mjs <gsc.(json|csv|tsv)> <events.(json|csv|tsv)> [indexing.(json|csv|tsv)]");
  process.exitCode = 1;
} else {
  const gscRows = normalizeGscExportRows(await loadRows(gscPath, ["rows", "data"]));
  const events = normalizeGa4CalculatorEventRows(await loadRows(eventsPath, ["events", "rows", "data"]));
  const indexingRows = indexingPath ? normalizeIndexingExportRows(await loadRows(indexingPath, ["rows", "data"])) : [];
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

async function loadRows(filePath, keys) {
  const text = await readFile(filePath, "utf8");
  const trimmed = text.replace(/^\uFEFF/, "").trimStart();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return rowsFrom(JSON.parse(trimmed), keys);
  }
  return parseDelimitedText(text);
}

function rowsFrom(payload, keys) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key];
  return [];
}
