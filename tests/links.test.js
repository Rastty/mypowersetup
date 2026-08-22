import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const SITE_ORIGIN = "https://mypowersetup.com";

async function collectHtmlFiles(directory = ".") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectHtmlFiles(file));
    else if (file.endsWith(".html")) files.push(file);
  }
  return files;
}

async function localTarget(sourceFile, rawUrl) {
  const url = new URL(rawUrl, `${SITE_ORIGIN}/${sourceFile.replace(/index\.html$/, "")}`);
  if (url.origin !== SITE_ORIGIN) return null;

  let target = `.${decodeURIComponent(url.pathname)}`;
  if (url.pathname.endsWith("/")) target = path.join(target, "index.html");
  else if (!path.extname(target)) {
    try {
      if ((await stat(target)).isDirectory()) target = path.join(target, "index.html");
    } catch {
      // The existence assertion below reports the missing target with its source URL.
    }
  }
  return { target, hash: decodeURIComponent(url.hash.slice(1)) };
}

test("all internal HTML links, assets and anchors resolve", async () => {
  const htmlFiles = await collectHtmlFiles();
  const cache = new Map();

  for (const sourceFile of htmlFiles) {
    const html = await readFile(sourceFile, "utf8");
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const rawUrl = match[1];
      if (/^(?:mailto:|tel:|javascript:|data:)/.test(rawUrl)) continue;
      const resolved = await localTarget(sourceFile, rawUrl);
      if (!resolved) continue;

      await assert.doesNotReject(
        access(resolved.target),
        `${sourceFile}: ${rawUrl} points to missing ${resolved.target}`,
      );

      if (!resolved.hash) continue;
      let targetHtml = cache.get(resolved.target);
      if (!targetHtml) {
        targetHtml = await readFile(resolved.target, "utf8");
        cache.set(resolved.target, targetHtml);
      }
      const escaped = resolved.hash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      assert.match(
        targetHtml,
        new RegExp(`(?:id|name)=["']${escaped}["']`),
        `${sourceFile}: ${rawUrl} points to a missing anchor`,
      );
    }
  }
});

test("sitemap URLs resolve and every canonical HTML page is listed", async () => {
  const [sitemap, htmlFiles] = await Promise.all([
    readFile("sitemap.xml", "utf8"),
    collectHtmlFiles(),
  ]);
  const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));

  for (const url of sitemapUrls) {
    const resolved = await localTarget("index.html", url);
    assert.ok(resolved, `${url} is not on ${SITE_ORIGIN}`);
    await assert.doesNotReject(access(resolved.target), `${url} points to missing ${resolved.target}`);
  }

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.ok(canonical, `${file} has no canonical URL`);
    assert.ok(sitemapUrls.has(canonical), `${file}: canonical ${canonical} is missing from sitemap.xml`);
  }
});
