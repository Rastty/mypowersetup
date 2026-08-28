import { readFile } from "node:fs/promises";
import { assessHungarianLaunchReadiness } from "../src/readiness-hu.js";

const catalog = JSON.parse(await readFile(new URL("../data/products-hu.json", import.meta.url), "utf8"));
const report = assessHungarianLaunchReadiness({
  catalog,
  languageReviewed: process.env.HU_LANGUAGE_REVIEWED === "true",
  mobileJourneyReviewed: process.env.HU_MOBILE_JOURNEY_REVIEWED === "true",
});

console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--require-ready") && !report.ready) process.exitCode = 1;
