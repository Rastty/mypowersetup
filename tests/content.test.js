import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pages = [
  ["pruvodce/index.html", "https://mypowersetup.com/pruvodce/"],
  ["pruvodce/kapacita-baterie-do-karavanu/index.html", "https://mypowersetup.com/pruvodce/kapacita-baterie-do-karavanu/"],
  ["pruvodce/agm-vs-lifepo4/index.html", "https://mypowersetup.com/pruvodce/agm-vs-lifepo4/"],
  ["pruvodce/kolik-w-solarnich-panelu/index.html", "https://mypowersetup.com/pruvodce/kolik-w-solarnich-panelu/"],
];

for (const [file, canonical] of pages) {
  test(`${file} has essential SEO and calculator links`, async () => {
    const html = await readFile(file, "utf8");
    assert.match(html, /<title>[^<]{20,}<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]{80,}"/);
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
    assert.ok(html.includes('href="/#kalkulator"'));
    assert.doesNotMatch(html, /<h1[^>]*>\s*<\/h1>/);
  });
}

test("sitemap contains every published guide", async () => {
  const sitemap = await readFile("sitemap.xml", "utf8");
  for (const [, canonical] of pages) assert.ok(sitemap.includes(`<loc>${canonical}</loc>`));
});
