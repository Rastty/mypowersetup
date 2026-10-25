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
  if (!Array.isArray(payload) && payload.status && payload.status !== "ready") {
    console.error(`Calculator funnel evidence unavailable: ${payload.status}`);
    process.exitCode = 2;
  } else {
    const events = Array.isArray(payload) ? payload : Array.isArray(payload.events) ? payload.events : [];
    console.log(renderCalculatorFunnelMarkdown(buildCalculatorFunnelSummary(events)));
  }
}
