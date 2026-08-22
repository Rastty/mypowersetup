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
  ["sk/sprievodca/index.html", "https://mypowersetup.com/sk/sprievodca/", "https://mypowersetup.com/pruvodce/"],
  ["sk/sprievodca/kapacita-baterie-do-karavanu/index.html", "https://mypowersetup.com/sk/sprievodca/kapacita-baterie-do-karavanu/", "https://mypowersetup.com/pruvodce/kapacita-baterie-do-karavanu/"],
  ["sk/sprievodca/agm-vs-lifepo4/index.html", "https://mypowersetup.com/sk/sprievodca/agm-vs-lifepo4/", "https://mypowersetup.com/pruvodce/agm-vs-lifepo4/"],
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
  assert.ok(html.includes('src="/src/app.js?v=20260822-chargingproducts1"'));
  assert.ok(html.includes('id="calculator-error"'));
  assert.ok(app.includes('from "./engine.js?v=20260821-1"'));
  assert.ok(app.includes('from "./products.js?v=20260822-chargingproducts1"'));
  assert.ok(app.includes("calculatorError.hidden = false"));
  assert.ok(engine.includes('from "./catalog.js?v=20260821-1"'));
});

test("appliance controls do not nest interactive labels", async () => {
  const [app, appSk] = await Promise.all([
    readFile("src/app.js", "utf8"),
    readFile("src/app-sk.js", "utf8"),
  ]);
  for (const source of [app, appSk]) {
    assert.doesNotMatch(source, /<label class="appliance-card"/);
    assert.match(source, /<article class="appliance-card"/);
    assert.match(source, /event\.target\.closest\("input, select, button, a, label"\)/);
  }
});

test("language switch remains available on mobile", async () => {
  const [czech, slovak, styles] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("sk/index.html", "utf8"),
    readFile("styles.css", "utf8"),
  ]);
  assert.match(czech, /class="header-link language-switch" href="\/sk\/"/);
  assert.match(czech, /aria-label="Prepnúť na slovenčinu"/);
  assert.match(slovak, /class="header-link language-switch" href="\/"/);
  assert.match(slovak, /aria-label="Přepnout do češtiny"/);
  assert.match(styles, /\.header-link\.language-switch \{ display: inline-flex; \}/);
  assert.ok(czech.includes('href="/styles.css?v=20260822-share1"'));
  assert.ok(slovak.includes('href="/styles.css?v=20260822-share1"'));
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

test("both homepages expose a large social preview", async () => {
  const [czech, slovak] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("sk/index.html", "utf8"),
  ]);
  for (const html of [czech, slovak]) {
    assert.ok(html.includes('property="og:image" content="https://mypowersetup.com/social-card.png"'));
    assert.ok(html.includes('property="og:image:width" content="1200"'));
    assert.ok(html.includes('property="og:image:height" content="630"'));
    assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
  }
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
  assert.doesNotMatch(html, /\\n/);
  assert.ok(html.includes('src="/src/app-sk.js?v=20260822-chargingproducts1"'));
  assert.ok(app.includes('fetch("/data/products-sk.json"'));
  assert.ok(app.includes('locale: "sk"'));
  assert.ok(app.includes('currency: "EUR"'));
  assert.match(catalog, /Kompresorová chladnička/);
  assert.equal(JSON.parse(payload).market, "sk-SK");
  assert.ok(sitemap.includes("<loc>https://mypowersetup.com/sk/</loc>"));
  assert.ok(html.includes('href="/sk/sprievodca/"'));
  assert.ok(html.includes('href="/sk/sprievodca/kapacita-baterie-do-karavanu/"'));
  assert.ok(html.includes('href="/sk/sprievodca/agm-vs-lifepo4/"'));
  assert.doesNotMatch(html, /href="\/pruvodce\/agm-vs-lifepo4\/"/);
});

test("calculator results can be shared in both languages", async () => {
  const [czech, slovak, app, appSk, share] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("sk/index.html", "utf8"),
    readFile("src/app.js", "utf8"),
    readFile("src/app-sk.js", "utf8"),
    readFile("src/share.js", "utf8"),
  ]);
  for (const html of [czech, slovak]) {
    assert.ok(html.includes('id="result-share"'));
    assert.ok(html.includes('id="result-copy"'));
    assert.ok(html.includes('id="result-share-status"'));
  }
  assert.ok(app.includes('buildResultShareText(latestResult, "cs", latestShareUrl)'));
  assert.ok(appSk.includes('buildResultShareText(latestResult, "sk", latestShareUrl)'));
  assert.match(app, /navigator\.share/);
  assert.match(appSk, /navigator\.share/);
  assert.match(share, /https:\/\/mypowersetup\.com\/sk\//);
  assert.doesNotMatch(share, /affiliate|provize|cena/i);
});

test("both calculators render a localized bounded system diagram", async () => {
  const [czech, slovak, app, appSk] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("sk/index.html", "utf8"),
    readFile("src/app.js", "utf8"),
    readFile("src/app-sk.js", "utf8"),
  ]);
  assert.ok(czech.includes('id="system-diagram"'));
  assert.match(czech, /nikoli svorky, konkrétní pojistky nebo montážní zapojení/);
  assert.ok(slovak.includes('id="system-diagram"'));
  assert.match(slovak, /nie svorky, konkrétne poistky ani montážne zapojenie/);
  assert.ok(app.includes('buildSystemDiagram(result, "cs")'));
  assert.ok(appSk.includes('buildSystemDiagram(result, "sk")'));
});

test("both calculators expose bounded alternator and shore charging plans", async () => {
  const [czech, slovak, app, appSk, charging, method, methodSk] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("sk/index.html", "utf8"),
    readFile("src/app.js", "utf8"),
    readFile("src/app-sk.js", "utf8"),
    readFile("src/charging.js", "utf8"),
    readFile("metodika/index.html", "utf8"),
    readFile("sk/metodika/index.html", "utf8"),
  ]);
  for (const html of [czech, slovak]) {
    assert.ok(html.includes('name="driveHoursPerDay"'));
    assert.ok(html.includes('name="starterVoltage"'));
    assert.ok(html.includes('name="shoreChargeHours"'));
    assert.ok(html.includes('id="charging-options"'));
  }
  assert.match(app, /DC–DC z alternátoru/);
  assert.match(appSk, /DC–DC z alternátora/);
  assert.match(charging, /PLANNING_C_RATE/);
  assert.doesNotMatch(charging, /alternator.*max|pojistka.*A|poistka.*A/i);
  assert.match(app, /24V nástavbovou baterii/);
  assert.match(appSk, /24V nadstavbovú batériu/);
  for (const html of [method, methodSk]) {
    assert.ok(html.includes("victronenergy.com/media/pg/Orion_XS_12-12-50A_DC-DC_battery_charger/en/installation.html"));
    assert.match(html, /0,2 C/);
    assert.match(html, /0,1 C/);
    assert.match(html, /nejsou univerzální povolená maxima|nie sú univerzálne povolené maximá/);
  }
});

test("cable estimate is bounded, localized and source-transparent", async () => {
  const [czech, slovak, app, appSk, method, methodSk] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("sk/index.html", "utf8"),
    readFile("src/app.js", "utf8"),
    readFile("src/app-sk.js", "utf8"),
    readFile("metodika/index.html", "utf8"),
    readFile("sk/metodika/index.html", "utf8"),
  ]);
  assert.ok(czech.includes('name="inverterCableLength"'));
  assert.ok(slovak.includes('name="inverterCableLength"'));
  assert.match(app, /minimum pouze podle cíle úbytku/);
  assert.match(appSk, /minimum iba podľa cieľa úbytku/);
  for (const html of [method, methodSk]) {
    assert.ok(html.includes('id="kabel"'));
    assert.ok(html.includes("victronenergy.com/media/pg/The_Wiring_Unlimited_book/en/dc-wiring.html"));
    assert.match(html, /Pojistku kalkulátor záměrně neurčuje|Poistku kalkulačka zámerne neurčuje/);
  }
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

test("battery sizing content matches the calculator assumptions", async () => {
  const [czech, slovak, catalog] = await Promise.all([
    readFile("pruvodce/kapacita-baterie-do-karavanu/index.html", "utf8"),
    readFile("sk/sprievodca/kapacita-baterie-do-karavanu/index.html", "utf8"),
    readFile("src/catalog.js", "utf8"),
  ]);
  for (const html of [czech, slovak]) {
    assert.match(html, /80 ?% využit/);
    assert.match(html, /0,80 ÷ 12 = <strong>144 Ah<\/strong>/);
    assert.doesNotMatch(html, /90 ?% využit|0,90 ÷ 12|128 Ah|132 Ah/);
  }
  assert.match(catalog, /lifepo4: \{[^}]*usableDepth: 0\.8/s);
});

test("AGM and LiFePO4 guides use the same conservative battery assumptions", async () => {
  const [czech, slovak, catalog] = await Promise.all([
    readFile("pruvodce/agm-vs-lifepo4/index.html", "utf8"),
    readFile("sk/sprievodca/agm-vs-lifepo4/index.html", "utf8"),
    readFile("src/catalog.js", "utf8"),
  ]);
  for (const html of [czech, slovak]) {
    assert.match(html, /50 %/);
    assert.match(html, /80 %/);
    assert.match(html, /600 Wh/);
    assert.match(html, /960 Wh/);
    assert.doesNotMatch(html, /90 %|1 080 Wh/);
  }
  assert.ok(czech.includes('hreflang="sk-SK" href="https://mypowersetup.com/sk/sprievodca/agm-vs-lifepo4/"'));
  assert.ok(slovak.includes('hreflang="cs-CZ" href="https://mypowersetup.com/pruvodce/agm-vs-lifepo4/"'));
  assert.match(catalog, /lead: \{[^}]*usableDepth: 0\.5/s);
  assert.match(catalog, /lifepo4: \{[^}]*usableDepth: 0\.8/s);
});
