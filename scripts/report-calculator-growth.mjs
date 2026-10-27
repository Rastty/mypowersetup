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
  // A blocked/malformed API export is UNKNOWN, never a measured zero-traffic
  // or zero-conversion baseline. Keep legacy CSV/array imports supported.
  const unavailable = evidenceIssue(gscInput, "gsc", ["searchAnalytics", "pageTotals", "rows", "data"])
    || evidenceIssue(eventsInput, "ga4", ["events", "rows", "data"]);
  if (unavailable) {
    console.error(`Calculator growth evidence unavailable: ${unavailable}`);
    process.exitCode = 2;
  } else {
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
}

function evidenceIssue(payload, source, keys) {
  if (Array.isArray(payload)) return null;
  if (!payload || typeof payload !== "object") return `${source}:invalid_input`;
  // A structured GA4 export without explicit readiness is not observed data.
  // Raw event arrays remain supported for intentional offline imports.
  if (source === "ga4" && payload.status !== "ready") return `ga4:${payload.status || "status_missing"}`;
  // A structured GSC export without an explicit successful read is UNKNOWN.
  // Preserve intentional raw array/CSV imports as the offline compatibility path.
  if (source !== "ga4" && payload.status !== "ready") return `${source}:${payload.status || "status_missing"}`;
  if (!keys.some((key) => Array.isArray(payload[key]))) return `${source}:rows_missing`;
  if (source === "ga4" && payload.customDimensions?.ready !== true) return "ga4:route_dimensions_missing";
  return null;
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
