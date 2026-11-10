import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import {
  articleModifiedDate,
  enhanceMatureGuideSeo,
  matureGuidePublicPath,
  matureGuideRoutesFromSitemap,
  significantMatureGuideChange,
  setSitemapLastmod,
} from "../src/mature-guide-seo.js";

const sitemapPath = "sitemap.xml";
let sitemap = await readFile(sitemapPath, "utf8");
const routes = matureGuideRoutesFromSitemap(sitemap);
// Keep a floor for the original 52 mature guides while allowing newly indexed
// comparison pages to join the same metadata/lastmod workflow automatically.
if (routes.length < 52 || new Set(routes).size !== routes.length) {
  throw new Error(`MATURE_GUIDE_ROUTE_SET_INVALID:${routes.length}`);
}

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
  // A file's newest commit can be a new JS cache key or an automated
  // Article.dateModified rewrite. Neither changes the article's content.
  // Inspect successive committed versions instead of assigning lastmod to
  // every asset-only change. Git history is local; no network or AI claim.
  const output = execFileSync("git", [
    "log", "--follow", "--format=%H|%cs", "--", path,
  ], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }).trim();
  const revisions = output.split(/\r?\n/)
    .map(line => line.match(/^([a-f0-9]{40})\|(\d{4}-\d{2}-\d{2})$/))
    .filter(Boolean)
    .map(([, sha, date]) => ({ sha, date }));
  if (!revisions.length) throw new Error(`MATURE_GUIDE_GIT_DATES_MISSING:${path}`);

  let lastSignificant = revisions.at(-1).date;
  try {
    let newer = gitFile(revisions[0].sha, path);
    for (let i = 1; i < revisions.length; i++) {
      const older = gitFile(revisions[i].sha, path);
      if (significantMatureGuideChange(older, newer)) {
        lastSignificant = revisions[i - 1].date;
        break;
      }
      newer = older;
    }
  } catch {
    // E.g. a renamed file whose historic path cannot be resolved by
    // git show: never infer an earlier update date from incomplete proof.
    lastSignificant = revisions[0].date;
  }
  return { dateModified: lastSignificant, datePublished: revisions.at(-1).date };
}

function gitFile(sha, path) {
  return execFileSync("git", ["show", `${sha}:${path}`], {
    encoding: "utf8", maxBuffer: 4 * 1024 * 1024,
    // Historical file paths might be missing across renames.
    stdio: ["ignore", "pipe", "ignore"],
  });
}
