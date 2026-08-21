import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pages = [
  ["pruvodce/index.html", "https://mypowersetup.com/pruvodce/"],
  ["pruvodce/kapacita-baterie-do-karavanu/index.html", "https://mypowersetup.com/pruvodce/kapacita-baterie-do-karavanu/"],
  ["pruvodce/agm-vs-lifepo4/index.html", "https://mypowersetup.com/pruvodce/agm-vs-lifepo4/"],
  ["pruvodce/kolik-w-solarnich-panelu/index.html", "https://mypowersetup.com/pruvodce/kolik-w-solarnich-panelu/"],
  ["pruvodce/jak-vybrat-mppt-regulator/index.html", "https://mypowersetup.com/pruvodce/jak-vybrat-mppt-regulator/"],
  ["pruvodce/jak-velky-menic-do-karavanu/index.html", "https://mypowersetup.com/pruvodce/jak-velky-menic-do-karavanu/"],
  ["pruvodce/spotreba-kompresorove-lednice/index.html", "https://mypowersetup.com/pruvodce/spotreba-kompresorove-lednice/"],
  ["o-projektu/index.html", "https://mypowersetup.com/o-projektu/"],
  ["metodika/index.html", "https://mypowersetup.com/metodika/"],
  ["affiliate/index.html", "https://mypowersetup.com/affiliate/"],
  ["soukromi/index.html", "https://mypowersetup.com/soukromi/"],
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

test("sitemap contains every published page", async () => {
  const sitemap = await readFile("sitemap.xml", "utf8");
  for (const [, canonical] of pages) assert.ok(sitemap.includes(`<loc>${canonical}</loc>`));
});

test("affiliate recommendations are disclosed and measurable", async () => {
  const [html, app] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("src/app.js", "utf8"),
  ]);
  assert.ok(html.includes('href="/affiliate/"'));
  assert.match(html, /affiliate/i);
  assert.ok(app.includes('rel="sponsored noopener"'));
  assert.ok(app.includes('event: "affiliate_click"'));
  assert.ok(app.includes('data-product-id'));
});

test("author identity is transparent and consistent", async () => {
  const [about, privacy] = await Promise.all([
    readFile("o-projektu/index.html", "utf8"),
    readFile("soukromi/index.html", "utf8"),
  ]);
  assert.match(about, /Petr Gálík/);
  assert.match(about, /elektrotechnické vzdělání/);
  assert.match(about, /xfit\.redakce@gmail\.com/);
  assert.match(privacy, /Petr Gálík/);
  assert.match(privacy, /xfit\.redakce@gmail\.com/);
});

test("every guide identifies Petr Gálík as its author", async () => {
  for (const [file] of pages.filter(([file]) => file.startsWith("pruvodce/") && file !== "pruvodce/index.html")) {
    const html = await readFile(file, "utf8");
    assert.ok(html.includes('"author":{"@type":"Person"'));
    assert.ok(html.includes('"name":"Petr Gálík"'));
    assert.ok(html.includes('"url":"https://mypowersetup.com/o-projektu/"'));
  }
});

test("calculator explains results and purchase checks", async () => {
  const [html, app] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("src/app.js", "utf8"),
  ]);
  assert.ok(html.includes('id="result-reasons"'));
  assert.ok(html.includes("Proč právě tyto hodnoty"));
  assert.ok(app.includes("Před nákupem:"));
  assert.ok(app.includes('trackEvent("calculation_completed"'));
});
