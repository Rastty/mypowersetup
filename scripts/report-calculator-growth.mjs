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
  const gscInput = await loadInput(gscPath);
  const eventsInput = await loadInput(eventsPath);
  const indexingInput = indexingPath ? await loadInput(indexingPath) : [];
  const gscRows = normalizeGscExportRows(rowsFrom(gscInput, ["searchAnalytics", "rows", "data"]));
  const gscPageTotals = normalizeGscExportRows(rowsFrom(gscInput, ["pageTotals"]));
  const events = normalizeGa4CalculatorEventRows(rowsFrom(eventsInput, ["events", "rows", "data"]));
  const indexingRows = normalizeIndexingExportRows(rowsFrom(indexingInput, ["indexing", "rows", "data"]));
  const funnelRows = buildCalculatorFunnelSummary(events);
  const priorities = buildCalculatorGrowthPriorities({ gscRows, gscPageTotals, funnelRows, indexingRows });

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

async function loadInput(filePath) {
  const text = await readFile(filePath, "utf8");
  const trimmed = text.replace(/^\uFEFF/, "").trimStart();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) return JSON.parse(trimmed);
  return parseDelimitedText(text);
}

function rowsFrom(payload, keys) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key];
  return [];
}
