#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { buildCalculatorFunnelSummary, renderCalculatorFunnelMarkdown } from "../src/calculator-funnel-report.js";

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
  if (!Array.isArray(events) || (!Array.isArray(payload) && payload.status && payload.status !== "ready")) {
    console.error(`Calculator funnel evidence unavailable: ${!Array.isArray(events) ? "events_missing" : payload.status}`);
    process.exitCode = 2;
  } else {
    console.log(renderCalculatorFunnelMarkdown(buildCalculatorFunnelSummary(events)));
  }
}
