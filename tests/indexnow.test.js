import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  INDEXNOW_KEY_FILE,
  buildIndexNowPayload,
  changedFilesToIndexNowUrls,
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

test("current sitemap exposes every published market to IndexNow", async () => {
  const sitemap = await readFile("sitemap.xml", "utf8");
  const urls = extractSitemapUrls(sitemap);
  for (const home of publicHomes) assert.ok(urls.includes(home), `missing public market home: ${home}`);
});

test("first key deployment submits every currently public sitemap URL", async () => {
  const urls = extractSitemapUrls(await readFile("sitemap.xml", "utf8"));
  const selected = changedFilesToIndexNowUrls([INDEXNOW_KEY_FILE], urls);
  assert.deepEqual(selected, [...urls].sort());
  for (const home of publicHomes) assert.ok(selected.includes(home));
});

test("shared calculator changes notify every public market homepage", async () => {
  const urls = extractSitemapUrls(await readFile("sitemap.xml", "utf8"));
  assert.deepEqual(
    changedFilesToIndexNowUrls(["src/products.js", "src/usage-profiles.js"], urls),
    publicHomes
  );
});

test("shared calculator changes include expansion homes only when those homes are in the sitemap", async () => {
  const currentUrls = extractSitemapUrls(await readFile("sitemap.xml", "utf8"));
  assert.deepEqual(changedFilesToIndexNowUrls(["src/engine.js"], currentUrls), publicHomes);

  const withoutExpansionHomes = currentUrls.filter((url) => ![`${origin}/pt/`, `${origin}/si/`, `${origin}/ro/`].includes(url));
  const selectedWithoutExpansion = changedFilesToIndexNowUrls(["src/engine.js"], withoutExpansionHomes);
  assert.ok(!selectedWithoutExpansion.includes(`${origin}/pt/`));
  assert.ok(!selectedWithoutExpansion.includes(`${origin}/si/`));
  assert.ok(!selectedWithoutExpansion.includes(`${origin}/ro/`));
});

test("expansion calculator changes notify exactly the three expansion homes", async () => {
  const urls = extractSitemapUrls(await readFile("sitemap.xml", "utf8"));
  assert.deepEqual(
    changedFilesToIndexNowUrls(["src/expansion-calculator-browser.js"], urls),
    [`${origin}/pt/`, `${origin}/ro/`, `${origin}/si/`]
  );
});

test("market catalog changes notify only their public market", async () => {
  const urls = extractSitemapUrls(await readFile("sitemap.xml", "utf8"));
  assert.deepEqual(changedFilesToIndexNowUrls(["data/products-sk.json"], urls), [`${origin}/sk/`]);
  assert.deepEqual(changedFilesToIndexNowUrls(["data/products-pl.json"], urls), [`${origin}/pl/`]);
  assert.deepEqual(changedFilesToIndexNowUrls(["data/products-hu.json"], urls), [`${origin}/hu/`]);
});

test("changed static article maps to its exact sitemap URL", async () => {
  const urls = extractSitemapUrls(await readFile("sitemap.xml", "utf8"));
  const route = "/pruvodce/kapacita-baterie-do-karavanu/";
  assert.deepEqual(
    changedFilesToIndexNowUrls(["pruvodce/kapacita-baterie-do-karavanu/index.html"], urls),
    [`${origin}${route}`]
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
