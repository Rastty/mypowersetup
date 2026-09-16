import { readFile, writeFile } from "node:fs/promises";
import { buildCzDcDcCoverage } from "../src/cz-dcdc-coverage.js";

const INPUTS = [
  new URL("../data/products.json", import.meta.url),
  new URL("../data/products-ampul-cz.json", import.meta.url),
];
const OUTPUT = new URL("../data/cz-dcdc-coverage.json", import.meta.url);

const payloads = await Promise.all(
  INPUTS.map(async (url) => JSON.parse(await readFile(url, "utf8"))),
);
const report = buildCzDcDcCoverage(payloads);

await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`CZ DC-DC coverage: ${report.status} (${report.matchCount} matches)`);
