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

const slovakPages = [
  ["sk/o-projekte/index.html", "https://mypowersetup.com/sk/o-projekte/", "https://mypowersetup.com/o-projektu/"],
  ["sk/metodika/index.html", "https://mypowersetup.com/sk/metodika/", "https://mypowersetup.com/metodika/"],
  ["sk/affiliate/index.html", "https://mypowersetup.com/sk/affiliate/", "https://mypowersetup.com/affiliate/"],
  ["sk/sukromie/index.html", "https://mypowersetup.com/sk/sukromie/", "https://mypowersetup.com/soukromi/"],
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
  for (const [, canonical] of slovakPages) assert.ok(sitemap.includes(`<loc>${canonical}</loc>`));
});

for (const [file, canonical, czechAlternate] of slovakPages) {
  test(`${file} is fully localized and linked to its Czech alternate`, async () => {
    const html = await readFile(file, "utf8");
    assert.ok(html.includes('<html lang="sk">'));
    assert.match(html, /<title>[^<]{20,}<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]{80,}"/);
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
    assert.ok(html.includes(`hreflang="cs-CZ" href="${czechAlternate}"`));
    assert.ok(html.includes(`hreflang="sk-SK" href="${canonical}"`));
    assert.ok(html.includes('href="/sk/#kalkulator"'));
    assert.doesNotMatch(html, /href="\/sk\/(?:sprievodca)\//);
  });
}

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
    assert.ok(html.includes('Autor: <a href="/o-projektu/">Petr Gálík</a>'));
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

test("calculator assets are cache-busted and submit errors are visible", async () => {
  const [html, app, engine] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("src/app.js", "utf8"),
    readFile("src/engine.js", "utf8"),
  ]);
  assert.ok(html.includes('src="/src/app.js?v=20260821-2"'));
  assert.ok(html.includes('id="calculator-error"'));
  assert.ok(app.includes('from "./engine.js?v=20260821-1"'));
  assert.ok(app.includes('from "./products.js?v=20260821-2"'));
  assert.ok(app.includes("calculatorError.hidden = false"));
  assert.ok(engine.includes('from "./catalog.js?v=20260821-1"'));
});

test("homepage exposes valid website and calculator structured data", async () => {
  const html = await readFile("index.html", "utf8");
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length > 0);
  const graphs = scripts.map((match) => JSON.parse(match[1]));
  const homepageGraph = graphs.find((entry) => Array.isArray(entry["@graph"]));
  assert.ok(homepageGraph);
  const types = homepageGraph["@graph"].map((entry) => entry["@type"]);
  assert.ok(types.includes("WebSite"));
  assert.ok(types.includes("WebApplication"));
  assert.ok(homepageGraph["@graph"].some((entry) => entry.name === "Petr Gálík"));
});

test("Slovak calculator is localized, indexable and isolated from Czech products", async () => {
  const [html, app, catalog, payload, sitemap] = await Promise.all([
    readFile("sk/index.html", "utf8"),
    readFile("src/app-sk.js", "utf8"),
    readFile("src/catalog-sk.js", "utf8"),
    readFile("data/products-sk.json", "utf8"),
    readFile("sitemap.xml", "utf8"),
  ]);
  assert.ok(html.includes('<html lang="sk">'));
  assert.ok(html.includes('<link rel="canonical" href="https://mypowersetup.com/sk/"'));
  assert.ok(html.includes('hreflang="cs-CZ"'));
  assert.ok(html.includes('hreflang="sk-SK"'));
  assert.ok(html.includes('src="/src/app-sk.js?v=20260821-sk1"'));
  assert.ok(app.includes('fetch("/data/products-sk.json"'));
  assert.ok(app.includes('locale: "sk"'));
  assert.ok(app.includes('currency: "EUR"'));
  assert.match(catalog, /Kompresorová chladnička/);
  assert.equal(JSON.parse(payload).market, "sk-SK");
  assert.ok(sitemap.includes("<loc>https://mypowersetup.com/sk/</loc>"));
  assert.doesNotMatch(html, /href="\/sk\/sprievodca\//);
});

test("LLM discovery files cover every published page and preserve safety limits", async () => {
  const [llms, full, robots] = await Promise.all([
    readFile("llms.txt", "utf8"),
    readFile("llms-full.txt", "utf8"),
    readFile("robots.txt", "utf8"),
  ]);
  for (const [, canonical] of pages) assert.ok(llms.includes(canonical));
  for (const [, canonical] of slovakPages) assert.ok(llms.includes(canonical));
  assert.match(llms, /nikoli elektroprojekt nebo revize/i);
  assert.match(full, /affiliate provize nejsou součástí technického skóre/i);
  assert.match(full, /Petr Gálík/);
  assert.ok(robots.includes("https://mypowersetup.com/llms.txt"));
});
