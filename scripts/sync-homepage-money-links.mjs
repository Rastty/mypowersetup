import { readFile, writeFile } from "node:fs/promises";
import { syncHomepageMoneyLinksHtml } from "../src/homepage-money-html.js";

const TARGETS = Object.freeze([
  { lang: "cs", path: "index.html" },
  { lang: "sk", path: "sk/index.html" },
  { lang: "pl", path: "pl/index.html" },
  { lang: "hu", path: "hu/index.html" },
]);

const checkOnly = process.argv.includes("--check");
let drift = false;

for (const target of TARGETS) {
  const before = await readFile(target.path, "utf8");
  const after = syncHomepageMoneyLinksHtml(before, { lang: target.lang });
  if (after === before) continue;
  drift = true;
  if (!checkOnly) {
    await writeFile(target.path, after);
    console.log(`updated ${target.path}`);
  } else {
    console.error(`homepage money-link drift: ${target.path}`);
  }
}

if (checkOnly && drift) process.exitCode = 1;
if (!drift) console.log("homepage money links already match their source");
