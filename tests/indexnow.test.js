import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  INDEXNOW_KEY_FILE,
  buildIndexNowPayload,
  changedFilesToIndexNowUrls,
  extractDeclaredSitemapFiles,
  extractSitemapUrls,
  isIndexNowSuccess,
} from "../src/indexnow.js";

const origin = "https://mypowersetup.com";
const publicHomes = [
  `${origin}/`,
  `${origin}/hu/`,
  `${origin}/pl/`,
  `${origin}/pt/`,
  `${origin}/ro/`,
  `${origin}/si/`,
  `${origin}/sk/`,
];
const scenarioUrls = [
  `${origin}/pruvodce/modelove-sestavy/`,
  `${origin}/pruvodce/modelove-sestavy/prace-z-karavanu/`,
  `${origin}/pruvodce/modelove-sestavy/rodinna-dovolena/`,
  `${origin}/pruvodce/modelove-sestavy/vikend-v-karavanu/`,
];

async function currentSitemapUrls() {
  const robots = await readFile("robots.txt", "utf8");
  const sitemapFiles = extractDeclaredSitemapFiles(robots);
  const xmls = await Promise.all(sitemapFiles.map((file) => readFile(file, "utf8")));
  return [...new Set(xmls.flatMap(extractSitemapUrls))];
}

test("robots declares every sitemap used by IndexNow", async () => {
  const robots = await readFile("robots.txt", "utf8");
  assert.deepEqual(extractDeclaredSitemapFiles(robots), ["sitemap.xml", "sitemap-scenarios.xml"]);
});

test("declared sitemap discovery rejects foreign and unsafe sitemap locations", () => {
  const robots = [
    "Sitemap: https://mypowersetup.com/sitemap.xml",
    "Sitemap: https://mypowersetup.com/sitemap.xml",
    "Sitemap: https://evil.example/sitemap.xml",
    "Sitemap: https://mypowersetup.com/sitemap.xml?preview=1",
    "Sitemap: https://mypowersetup.com/%2e%2e/private.xml",
  ].join("\n");
  assert.deepEqual(extractDeclaredSitemapFiles(robots), ["sitemap.xml"]);
});

test("declared sitemaps expose every published market and CZ scenario page to IndexNow", async () => {
  const urls = await currentSitemapUrls();
  for (const url of [...publicHomes, ...scenarioUrls]) assert.ok(urls.includes(url), `missing public URL: ${url}`);
});

test("first key deployment submits every currently public declared-sitemap URL", async () => {
  const urls = await currentSitemapUrls();
  const selected = changedFilesToIndexNowUrls([INDEXNOW_KEY_FILE], urls);
  assert.deepEqual(selected, [...urls].sort());
  for (const url of [...publicHomes, ...scenarioUrls]) assert.ok(selected.includes(url));
});

test("IndexNow discovery surface changes submit every currently public URL", async () => {
  const urls = await currentSitemapUrls();
  const expected = [...urls].sort();
  for (const file of ["robots.txt", "sitemap.xml", "sitemap-scenarios.xml", "src/indexnow.js", "scripts/submit-indexnow.mjs"]) {
    assert.deepEqual(changedFilesToIndexNowUrls([file], urls), expected, `${file} should refresh the full discovery surface`);
  }
});

test("shared calculator changes notify every public market homepage", async () => {
  const urls = await currentSitemapUrls();
  assert.deepEqual(
    changedFilesToIndexNowUrls(["src/products.js", "src/usage-profiles.js"], urls),
    publicHomes
  );
});

test("shared calculator changes include expansion homes only when those homes are in the sitemap", async () => {
  const currentUrls = await currentSitemapUrls();
  assert.deepEqual(changedFilesToIndexNowUrls(["src/engine.js"], currentUrls), publicHomes);

  const withoutExpansionHomes = currentUrls.filter((url) => ![`${origin}/pt/`, `${origin}/si/`, `${origin}/ro/`].includes(url));
  const selectedWithoutExpansion = changedFilesToIndexNowUrls(["src/engine.js"], withoutExpansionHomes);
  assert.ok(!selectedWithoutExpansion.includes(`${origin}/pt/`));
  assert.ok(!selectedWithoutExpansion.includes(`${origin}/si/`));
  assert.ok(!selectedWithoutExpansion.includes(`${origin}/ro/`));
});

test("expansion calculator changes notify exactly the three expansion homes", async () => {
  const urls = await currentSitemapUrls();
  assert.deepEqual(
    changedFilesToIndexNowUrls(["src/expansion-calculator-browser.js"], urls),
    [`${origin}/pt/`, `${origin}/ro/`, `${origin}/si/`]
  );
});

test("market catalog changes notify only their public market", async () => {
  const urls = await currentSitemapUrls();
  assert.deepEqual(changedFilesToIndexNowUrls(["data/products-sk.json"], urls), [`${origin}/sk/`]);
  assert.deepEqual(changedFilesToIndexNowUrls(["data/products-pl.json"], urls), [`${origin}/pl/`]);
  assert.deepEqual(changedFilesToIndexNowUrls(["data/products-hu.json"], urls), [`${origin}/hu/`]);
});

test("changed static article maps to its exact declared-sitemap URL", async () => {
  const urls = await currentSitemapUrls();
  const route = "/pruvodce/kapacita-baterie-do-karavanu/";
  assert.deepEqual(
    changedFilesToIndexNowUrls(["pruvodce/kapacita-baterie-do-karavanu/index.html"], urls),
    [`${origin}${route}`]
  );

  const scenarioRoute = "/pruvodce/modelove-sestavy/prace-z-karavanu/";
  assert.deepEqual(
    changedFilesToIndexNowUrls(["pruvodce/modelove-sestavy/prace-z-karavanu/index.html"], urls),
    [`${origin}${scenarioRoute}`]
  );
});

test("IndexNow payload is host-scoped, bounded and uses the root key location", () => {
  const key = "12345678abcdef";
  const payload = buildIndexNowPayload([`${origin}/`, `${origin}/sk/`], key);
  assert.equal(payload.host, "mypowersetup.com");
  assert.equal(payload.key, key);
  assert.equal(payload.keyLocation, `${origin}/${INDEXNOW_KEY_FILE}`);
  assert.deepEqual(payload.urlList, [`${origin}/`, `${origin}/sk/`]);
  assert.throws(() => buildIndexNowPayload(["https://example.com/"], key), /FOREIGN/);
  assert.throws(() => buildIndexNowPayload([`${origin}/`], "bad"), /KEY_INVALID/);
});

test("IndexNow accepts both immediate and pending-validation success statuses", () => {
  assert.equal(isIndexNowSuccess(200), true);
  assert.equal(isIndexNowSuccess(202), true);
  assert.equal(isIndexNowSuccess(400), false);
});
