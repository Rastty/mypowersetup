import { readFile } from "node:fs/promises";

const markets = [
  { key: "cz", app: "src/app.js", home: "index.html", public: true },
  { key: "sk", app: "src/app-sk.js", home: "sk/index.html", public: true },
  { key: "pl", app: "src/app-pl.js", home: "pl/index.html", public: true },
  { key: "hu", app: "src/app-hu-browser.js", home: "hu/index.html", public: true },
];

const sharedRequired = ["calculation_completed", "product_coverage_calculated", "affiliate_click"];
const parityEvents = ["calculator_started", "result_share_requested", "result_print_requested"];
const sharedAnalytics = await readFile("src/analytics.js", "utf8");
const reports = [];

for (const market of markets) {
  const app = await readFile(market.app, "utf8");
  const capabilities = `${app}\n${sharedAnalytics}`;
  const hardMissing = sharedRequired.filter((event) => !capabilities.includes(event));
  const parityMissing = parityEvents.filter((event) => !capabilities.includes(event));
  let seo = { state: market.public ? "unknown" : "private" };
  if (market.home) {
    const html = await readFile(market.home, "utf8");
    seo = {
      canonical: html.includes('rel="canonical"'),
      indexable: !/noindex/i.test(html),
      analytics: html.includes("/src/analytics.js"),
    };
  }
  reports.push({ market: market.key, public: market.public, hardMissing, parityMissing, seo });
}

const hardFailures = reports.flatMap((report) => report.hardMissing.map((event) => `${report.market}:${event}`));
const parityGaps = reports.flatMap((report) => report.parityMissing.map((event) => `${report.market}:${event}`));
const seoFailures = reports
  .filter((report) => report.public)
  .flatMap((report) => Object.entries(report.seo).filter(([, ok]) => ok !== true).map(([key]) => `${report.market}:${key}`));

const output = {
  generatedAt: new Date().toISOString(),
  safe: hardFailures.length === 0 && seoFailures.length === 0,
  auditReady: hardFailures.length === 0 && seoFailures.length === 0 && parityGaps.length === 0,
  hardFailures,
  parityGaps,
  markets: reports,
};
console.log(JSON.stringify(output, null, 2));
if (process.argv.includes("--require-safe") && !output.safe) process.exitCode = 1;
if (process.argv.includes("--require-audit-ready") && !output.auditReady) process.exitCode = 1;
