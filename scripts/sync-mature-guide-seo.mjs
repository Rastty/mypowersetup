import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import {
  articleModifiedDate,
  enhanceMatureGuideSeo,
  matureGuidePublicPath,
  matureGuideRoutesFromSitemap,
  setSitemapLastmod,
} from "../src/mature-guide-seo.js";

const sitemapPath = "sitemap.xml";
let sitemap = await readFile(sitemapPath, "utf8");
const routes = matureGuideRoutesFromSitemap(sitemap);
if (routes.length !== 48) throw new Error(`MATURE_GUIDE_ROUTE_COUNT:${routes.length}`);

let changedPages = 0;
for (const route of routes) {
  const path = matureGuidePublicPath(route);
  const before = await readFile(path, "utf8");
  const dates = gitDates(path);
  const after = enhanceMatureGuideSeo(before, route, dates);
  if (after !== before) {
    await writeFile(path, after);
    changedPages += 1;
  }
  const modified = articleModifiedDate(after);
  if (!modified) throw new Error(`MATURE_GUIDE_MODIFIED_MISSING:${route}`);
  sitemap = setSitemapLastmod(sitemap, route, modified);
}

const currentSitemap = await readFile(sitemapPath, "utf8");
if (sitemap !== currentSitemap) await writeFile(sitemapPath, sitemap);

console.log(JSON.stringify({ ok: true, routes: routes.length, changedPages, sitemapChanged: sitemap !== currentSitemap }, null, 2));

function gitDates(path) {
  const output = execFileSync("git", ["log", "--follow", "--format=%cs", "--", path], { encoding: "utf8" }).trim();
  const dates = output.split(/\r?\n/).map((value) => value.trim()).filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
  if (!dates.length) throw new Error(`MATURE_GUIDE_GIT_DATES_MISSING:${path}`);
  return { dateModified: dates[0], datePublished: dates.at(-1) };
}
