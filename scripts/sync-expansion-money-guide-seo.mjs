import { readFile, writeFile } from "node:fs/promises";
import {
  enhanceExpansionMoneyGuideSeo,
  expansionMoneyGuidePublicPath,
  expansionMoneyGuideRoutes,
} from "../src/expansion-money-guide-seo.js";

const checkOnly = process.argv.includes("--check");
let changed = 0;

for (const route of expansionMoneyGuideRoutes()) {
  const path = expansionMoneyGuidePublicPath(route);
  const before = await readFile(path, "utf8");
  const after = enhanceExpansionMoneyGuideSeo(before, route);
  if (after === before) continue;
  changed += 1;
  if (checkOnly) console.error(`expansion money-guide SEO drift: ${path}`);
  else {
    await writeFile(path, after);
    console.log(`updated ${path}`);
  }
}

if (checkOnly && changed) process.exitCode = 1;
if (!changed) console.log("expansion money-guide SEO already matches schema/content source of truth");
