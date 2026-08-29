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

test("current sitemap exposes public markets but keeps private HU out of IndexNow", async () => {
  const sitemap = await readFile("sitemap.xml", "utf8");
  const urls = extractSitemapUrls(sitemap);
  assert.ok(urls.includes(`${origin}/`));
  assert.ok(urls.includes(`${origin}/sk/`));
  assert.ok(urls.includes(`${origin}/pl/`));
  assert.ok(urls.every((url) => !url.startsWith(`${origin}/hu/`)));
});

test("first key deployment submits every currently public sitemap URL and no private route", async () => {
  const urls = extractSitemapUrls(await readFile("sitemap.xml", "utf8"));
  const selected = changedFilesToIndexNowUrls([INDEXNOW_KEY_FILE], urls);
  assert.deepEqual(selected, [...urls].sort());
  assert.ok(selected.every((url) => !url.startsWith(`${origin}/hu/`)));
});

test("shared calculator changes notify only public market homepages", async () => {
  const urls = extractSitemapUrls(await readFile("sitemap.xml", "utf8"));
  assert.deepEqual(
    changedFilesToIndexNowUrls(["src/products.js", "src/usage-profiles.js"], urls),
    [`${origin}/`, `${origin}/pl/`, `${origin}/sk/`]
  );
});

test("market catalog changes notify only their public market", async () => {
  const urls = extractSitemapUrls(await readFile("sitemap.xml", "utf8"));
  assert.deepEqual(changedFilesToIndexNowUrls(["data/products-sk.json"], urls), [`${origin}/sk/`]);
  assert.deepEqual(changedFilesToIndexNowUrls(["data/products-pl.json"], urls), [`${origin}/pl/`]);
  assert.deepEqual(changedFilesToIndexNowUrls(["data/products-hu.json"], urls), []);
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
