import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { missingStaticHomepageLanguageLinks, syncPublicHomepageLanguageNav } from "../src/public-language-nav.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const checkOnly = process.argv.includes("--check");
const homepages = Object.freeze([
  ["cs", "index.html"],
  ["sk", "sk/index.html"],
  ["pl", "pl/index.html"],
  ["hu", "hu/index.html"],
  ["pt", "pt/index.html"],
  ["si", "si/index.html"],
  ["ro", "ro/index.html"],
]);

const changed = [];
const failures = [];
for (const [market, relativePath] of homepages) {
  const path = resolve(root, relativePath);
  const original = await readFile(path, "utf8");
  const synced = syncPublicHomepageLanguageNav(original, market);
  const missing = missingStaticHomepageLanguageLinks(synced);
  if (missing.length) failures.push(`${market}:STATIC_LANGUAGE_LINKS_MISSING:${missing.join(",")}`);
  if (synced !== original) {
    changed.push(relativePath);
    if (!checkOnly) await writeFile(path, synced, "utf8");
  }
}

if (checkOnly && changed.length) failures.push(`STATIC_LANGUAGE_NAV_OUT_OF_SYNC:${changed.join(",")}`);
console.log(JSON.stringify({ ready: failures.length === 0, checkOnly, changed, failures }, null, 2));
if (failures.length) process.exitCode = 1;
