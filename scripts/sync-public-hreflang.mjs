import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_HREFLANG_GROUPS, buildHreflangTags, routeToPublicFile } from "../src/public-hreflang-map.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const checkOnly = process.argv.includes("--check");
let changed = 0;

for (const [groupName, group] of Object.entries(PUBLIC_HREFLANG_GROUPS)) {
  const tags = buildHreflangTags(group);
  for (const [market, route] of Object.entries(group)) {
    const path = resolve(root, routeToPublicFile(route));
    const html = await readFile(path, "utf8");
    const updated = synchronizeHreflang(html, route, tags);
    if (updated !== html) {
      changed += 1;
      if (!checkOnly) await writeFile(path, updated, "utf8");
      console.log(`${checkOnly ? "NEEDS_SYNC" : "SYNCED"} ${groupName}:${market} ${route}`);
    }
  }
}

if (checkOnly && changed) {
  console.error(`PUBLIC_HREFLANG_OUT_OF_SYNC:${changed}`);
  process.exitCode = 1;
} else {
  console.log(`PUBLIC_HREFLANG_${checkOnly ? "CHECK" : "SYNC"}_OK:${changed}`);
}

export function synchronizeHreflang(html, route, tags) {
  if (typeof html !== "string" || !html.includes("</head>")) throw new Error(`PUBLIC_HREFLANG_HTML_INVALID:${route}`);
  const canonical = `https://mypowersetup.com${route}`;
  if (!html.includes(`rel="canonical" href="${canonical}"`) && !html.includes(`rel="canonical" href="${canonical}" />`)) {
    throw new Error(`PUBLIC_HREFLANG_CANONICAL_MISMATCH:${route}`);
  }
  let output = html.replace(/\s*<link rel="alternate" hreflang="(?:cs-CZ|sk-SK|pl-PL|hu-HU|x-default)" href="[^"]+"\s*\/?>/g, "");
  const canonicalPattern = new RegExp(`(<link rel="canonical" href="${escapeRegExp(canonical)}"\\s*\\/?>)`);
  if (!canonicalPattern.test(output)) throw new Error(`PUBLIC_HREFLANG_CANONICAL_NOT_FOUND:${route}`);
  output = output.replace(canonicalPattern, `$1${tags.map((tag) => `\n${tag}`).join("")}`);
  return output;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
