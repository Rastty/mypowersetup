#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { buildCalculatorFunnelSummary, renderCalculatorFunnelMarkdown } from "../src/calculator-funnel-report.js";
import { normalizeGa4CalculatorEventRows } from "../src/calculator-growth-input.js";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/report-calculator-funnel.mjs <events.json>");
  process.exitCode = 1;
} else {
  const payload = JSON.parse(await readFile(input, "utf8"));
  // Missing GA4 auth or custom dimensions means UNKNOWN, never a zero-click funnel.
  // An object without an explicit events array is not a measured zero-event
  // GA4 report, even if a stale status field says ready.
  const events = Array.isArray(payload) ? payload : payload?.events;
  // Structured GA4 exports require an explicit ready status. Missing status or
  // unregistered route dimensions is UNKNOWN, never a measured zero-click funnel.
  // Raw event arrays remain supported for intentional offline imports.
  const issue = !Array.isArray(events) ? "events_missing"
    : !Array.isArray(payload) && payload.status !== "ready" ? (payload.status || "status_missing")
    : !Array.isArray(payload) && payload.customDimensions?.ready !== true ? "route_dimensions_missing"
    : null;
  if (issue) {
    console.error(`Calculator funnel evidence unavailable: ${issue}`);
    process.exitCode = 2;
  } else {
    // A ready GA4 Data API export includes eventCount and totalUsers. Use the
    // same user-based funnel weighting as report:calculator:growth while keeping
    // event_count for click-action diagnostics. Legacy raw browser event arrays
    // remain unmodified and count once per event.
    const normalized = Array.isArray(payload) ? events : normalizeGa4CalculatorEventRows(events);
    console.log(renderCalculatorFunnelMarkdown(buildCalculatorFunnelSummary(normalized)));
  }
}
