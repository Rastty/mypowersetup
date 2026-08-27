import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pages = [
  ["pruvodce/index.html", "https://mypowersetup.com/pruvodce/"],
  ["pruvodce/kapacita-baterie-do-karavanu/index.html", "https://mypowersetup.com/pruvodce/kapacita-baterie-do-karavanu/"],
  ["pruvodce/agm-vs-lifepo4/index.html", "https://mypowersetup.com/pruvodce/agm-vs-lifepo4/"],
  ["pruvodce/kolik-w-solarnich-panelu/index.html", "https://mypowersetup.com/pruvodce/kolik-w-solarnich-panelu/"],
  ["pruvodce/jak-vybrat-mppt-regulator/index.html", "https://mypowersetup.com/pruvodce/jak-vybrat-mppt-regulator/"],
  ["pruvodce/jak-vybrat-dc-dc-nabijecku/index.html", "https://mypowersetup.com/pruvodce/jak-vybrat-dc-dc-nabijecku/"],
  ["pruvodce/jak-vybrat-nabijecku-230-v/index.html", "https://mypowersetup.com/pruvodce/jak-vybrat-nabijecku-230-v/"],
  ["pruvodce/kabely-a-pojistky-12-v/index.html", "https://mypowersetup.com/pruvodce/kabely-a-pojistky-12-v/"],
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
  ["sk/sprievodca/kolko-w-solarnych-panelov/index.html", "https://mypowersetup.com/sk/sprievodca/kolko-w-solarnych-panelov/", "https://mypowersetup.com/pruvodce/kolik-w-solarnich-panelu/"],
  ["sk/sprievodca/ako-vybrat-mppt-regulator/index.html", "https://mypowersetup.com/sk/sprievodca/ako-vybrat-mppt-regulator/", "https://mypowersetup.com/pruvodce/jak-vybrat-mppt-regulator/"],
  ["sk/sprievodca/ako-vybrat-dc-dc-nabijacku/index.html", "https://mypowersetup.com/sk/sprievodca/ako-vybrat-dc-dc-nabijacku/", "https://mypowersetup.com/pruvodce/jak-vybrat-dc-dc-nabijecku/"],
  ["sk/sprievodca/ako-vybrat-nabijacku-230-v/index.html", "https://mypowersetup.com/sk/sprievodca/ako-vybrat-nabijacku-230-v/", "https://mypowersetup.com/pruvodce/jak-vybrat-nabijecku-230-v/"],
  ["sk/sprievodca/kable-a-poistky-12-v/index.html", "https://mypowersetup.com/sk/sprievodca/kable-a-poistky-12-v/", "https://mypowersetup.com/pruvodce/kabely-a-pojistky-12-v/"],
  ["sk/sprievodca/aky-velky-menic-do-karavanu/index.html", "https://mypowersetup.com/sk/sprievodca/aky-velky-menic-do-karavanu/", "https://mypowersetup.com/pruvodce/jak-velky-menic-do-karavanu/"],
  ["sk/sprievodca/spotreba-kompresorovej-chladnicky/index.html", "https://mypowersetup.com/sk/sprievodca/spotreba-kompresorovej-chladnicky/", "https://mypowersetup.com/pruvodce/spotreba-kompresorove-lednice/"],
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

test("every Czech content page has a complete share preview", async () => {
  for (const [file, canonical] of pages) {
    const html = await readFile(file, "utf8");
    assert.match(html, /<meta property="og:title" content="[^"]+">/);
    assert.match(html, /<meta property="og:description" content="[^"]{80,}">/);
    assert.ok(html.includes(`<meta property="og:url" content="${canonical}">`));
    assert.ok(html.includes('<meta property="og:image" content="https://mypowersetup.com/social-card.png">'));
    assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
    assert.ok(html.includes('<meta name="twitter:image" content="https://mypowersetup.com/social-card.png">'));
  }
});

test("DC-DC guide matches the calculator model and preserves installation limits", async () => {
  const [guide, charging, hub, llms] = await Promise.all([
    readFile("pruvodce/jak-vybrat-dc-dc-nabijecku/index.html", "utf8"),
    readFile("src/charging.js", "utf8"),
    readFile("pruvodce/index.html", "utf8"),
    readFile("llms-full.txt", "utf8"),
  ]);
  assert.ok(guide.includes("účinnost 90 %"));
  assert.ok(guide.includes("0,2 C pro LiFePO₄ a 0,1 C pro AGM"));
  assert.ok(guide.includes("maximálním vstupním proudem"));
  assert.ok(guide.includes("manuálu přesného modelu"));
  assert.ok(guide.includes("victronenergy.com/upload/documents/Orion-Tr_Smart"));
  assert.doesNotMatch(guide, /pojistk[^<.]{0,40}\b\d+\s*A\b/i);
  assert.ok(charging.includes("const CHARGING_EFFICIENCY = 0.9"));
  assert.ok(charging.includes("lifepo4: 0.2, lead: 0.1"));
  assert.ok(hub.includes('/pruvodce/jak-vybrat-dc-dc-nabijecku/'));
  assert.ok(llms.includes("DC–DC a 230V nabíječka"));
});

test("230V charger guide matches the calculator model and preserves installation limits", async () => {
  const [guide, charging, hub, llms] = await Promise.all([
    readFile("pruvodce/jak-vybrat-nabijecku-230-v/index.html", "utf8"),
    readFile("src/charging.js", "utf8"),
    readFile("pruvodce/index.html", "utf8"),
    readFile("llms-full.txt", "utf8"),
  ]);
  assert.ok(guide.includes("účinnost 90 %"));
  assert.ok(guide.includes("0,2 C pro LiFePO₄ a 0,1 C pro AGM"));
  assert.ok(guide.includes("Doba nabíjení nebude přesně"));
  assert.ok(guide.includes("Blue_Smart_IP22_Charger_230V_manual"));
  assert.doesNotMatch(guide, /(?:pojistk|jistič)[^<.]{0,40}\b\d+\s*A\b/i);
  assert.ok(charging.includes("const CHARGING_EFFICIENCY = 0.9"));
  assert.ok(charging.includes("shoreChargeHours"));
  assert.ok(hub.includes('/pruvodce/jak-vybrat-nabijecku-230-v/'));
  assert.ok(llms.includes("DC–DC a 230V nabíječka"));
});

test("cable and fuse guide matches the bounded voltage-drop model", async () => {
  const [guide, wiring, hub, llms] = await Promise.all([
    readFile("pruvodce/kabely-a-pojistky-12-v/index.html", "utf8"),
    readFile("src/wiring.js", "utf8"),
    readFile("pruvodce/index.html", "utf8"),
    readFile("llms-full.txt", "utf8"),
  ]);
  assert.ok(guide.includes("2 × jednosměrná délka"));
  assert.ok(guide.includes("0,0175"));
  assert.ok(guide.includes("cíl úbytku do 2,5 %"));
  assert.ok(guide.includes("pro vstupní kabel použijte maximální vstupní proud"));
  assert.ok(guide.includes("Pojistka chrání kabel"));
  assert.ok(guide.includes("The_Wiring_Unlimited_book"));
  assert.doesNotMatch(guide, /(?:pojistk|jistič)[^<.]{0,45}\b\d+\s*A\b/i);
  assert.ok(wiring.includes("COPPER_RESISTIVITY_OHM_MM2_PER_M = 0.0175"));
  assert.ok(wiring.includes("maxVoltageDropPercent = 2.5"));
  assert.ok(wiring.includes("maxVoltageDropPercent = 3"));
  assert.ok(hub.includes('/pruvodce/kabely-a-pojistky-12-v/'));
  assert.ok(llms.includes("Průřez měděného kabelu"));
});

test("Czech and Slovak cable guides share the bounded model and reciprocal language links", async () => {
  const [czech, slovak, hub, full] = await Promise.all([
    readFile("pruvodce/kabely-a-pojistky-12-v/index.html", "utf8"),
    readFile("sk/sprievodca/kable-a-poistky-12-v/index.html", "utf8"),
    readFile("sk/sprievodca/index.html", "utf8"),
    readFile("llms-full.txt", "utf8"),
  ]);
  for (const html of [czech, slovak]) {
    assert.match(html, /2 × jedno(?:směrná|smerná) (?:délka|dĺžka)/);
    assert.match(html, /0,0175/);
    assert.match(html, /2,5 %/);
    assert.match(html, /3 %/);
    assert.ok(html.includes("The_Wiring_Unlimited_book"));
    assert.doesNotMatch(html, /(?:pojistk|jistič|poistk|istič)[^<.]{0,45}\b\d+\s*A\b/i);
  }
  assert.ok(czech.includes('hreflang="sk-SK" href="https://mypowersetup.com/sk/sprievodca/kable-a-poistky-12-v/"'));
  assert.ok(slovak.includes('hreflang="cs-CZ" href="https://mypowersetup.com/pruvodce/kabely-a-pojistky-12-v/"'));
  assert.ok(hub.includes('/sk/sprievodca/kable-a-poistky-12-v/'));
  assert.match(full, /Slovenský návod pro kabely a jištění používá totožný model/);
});

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

test("every Slovak content page has complete share and language metadata", async () => {
  for (const [file, canonical, czechAlternate] of slovakPages) {
    const html = await readFile(file, "utf8");
    assert.match(html, /<meta property="og:title" content="[^"]+">/);
    assert.match(html, /<meta property="og:description" content="[^"]{70,}">/);
    assert.ok(html.includes(`<meta property="og:url" content="${canonical}">`));
    assert.ok(html.includes('<meta property="og:locale" content="sk_SK">'));
    assert.ok(html.includes('<meta property="og:image" content="https://mypowersetup.com/social-card.png">'));
    assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
    assert.ok(html.includes('<meta name="twitter:image" content="https://mypowersetup.com/social-card.png">'));
    assert.ok(html.includes(`hreflang="x-default" href="${czechAlternate}"`));
  }
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

test("GA4 is available site-wide only after an explicit localized choice", async () => {
  const allPageFiles = ["index.html", "sk/index.html", ...pages.map(([file]) => file), ...slovakPages.map(([file]) => file)];
  const [analytics, app, appSk, czechPrivacy, slovakPrivacy, ...htmlFiles] = await Promise.all([
    readFile("src/analytics.js", "utf8"),
    readFile("src/app.js", "utf8"),
    readFile("src/app-sk.js", "utf8"),
    readFile("soukromi/index.html", "utf8"),
    readFile("sk/sukromie/index.html", "utf8"),
    ...allPageFiles.map((file) => readFile(file, "utf8")),
  ]);
  assert.match(analytics, /G-TDNRBM2V2J/);
  assert.match(analytics, /choice !== "granted"/);
  assert.match(analytics, /allow_google_signals: false/);
  assert.match(analytics, /allow_ad_personalization_signals: false/);
  assert.match(analytics, /Povolit analytiku/);
  assert.match(analytics, /Povoliť analytiku/);
  assert.match(analytics, /Zezwól na analitykę/);
  for (const source of [app, appSk]) assert.match(source, /MyPowerSetupAnalytics\?\.track/);
  for (const html of htmlFiles) assert.ok(html.includes('/src/analytics.js?v=20260824-1'));
  for (const privacy of [czechPrivacy, slovakPrivacy]) {
    assert.ok(privacy.includes("data-analytics-settings"));
    assert.ok(privacy.includes("https://policies.google.com/privacy"));
  }
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

test("all active calculators expose shared quick profiles and a plain-language verdict", async () => {
  const locales = [
    ["index.html", "src/app.js"],
    ["sk/index.html", "src/app-sk.js"],
    ["pl/index.html", "src/app-pl.js"],
  ];
  for (const [htmlFile, appFile] of locales) {
    const [html, app] = await Promise.all([readFile(htmlFile, "utf8"), readFile(appFile, "utf8")]);
    assert.ok(html.includes('id="usage-profiles"'));
    assert.ok(html.includes('id="result-verdict"'));
    assert.ok(app.includes("mountUsageProfiles"));
    assert.ok(app.includes("buildPlainLanguageVerdict"));
    assert.ok(app.includes('trackEvent("usage_profile_selected"'));
    assert.ok(app.includes('button.setAttribute("aria-pressed", "false")'));
  }
});

test("both calculators measure a privacy-safe conversion funnel", async () => {
  const [app, appSk] = await Promise.all([
    readFile("src/app.js", "utf8"),
    readFile("src/app-sk.js", "utf8"),
  ]);
  for (const source of [app, appSk]) {
    assert.ok(source.includes('trackEvent("calculator_started", { source })'));
    assert.ok(source.includes('trackEvent("calculation_failed", { reason: "no_appliance" })'));
    assert.ok(source.includes("hasCustomAppliance"));
    assert.ok(source.includes("hasDcDc"));
    assert.ok(source.includes("hasShoreCharging"));
    assert.ok(!source.includes("customName:"));
  }
});

test("calculator assets are cache-busted and submit errors are visible", async () => {
  const [html, app, engine] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("src/app.js", "utf8"),
    readFile("src/engine.js", "utf8"),
  ]);
  assert.ok(html.includes('src="/src/app.js?v=20260827-profiles1"'));
  assert.ok(html.includes('id="calculator-error"'));
  assert.ok(app.includes('from "./engine.js?v=20260821-1"'));
  assert.ok(app.includes('from "./products.js?v=20260825-merchants1"'));
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
    assert.match(source, /<article class="appliance-card/);
    assert.match(source, /event\.target\.closest\("input, select, button, a, label"\)/);
  }
});

test("both calculators accept one bounded custom appliance", async () => {
  const [catalog, catalogSk, app, appSk, styles] = await Promise.all([
    readFile("src/catalog.js", "utf8"),
    readFile("src/catalog-sk.js", "utf8"),
    readFile("src/app.js", "utf8"),
    readFile("src/app-sk.js", "utf8"),
    readFile("styles.css", "utf8"),
  ]);
  assert.match(catalog, /name: "Vlastní spotřebič"/);
  assert.match(catalogSk, /name: "Vlastný spotrebič"/);
  for (const source of [app, appSk]) {
    assert.match(source, /data-custom-name/);
    assert.match(source, /data-watts/);
    assert.match(source, /data-ac/);
    assert.match(source, /data-surge/);
    assert.match(source, /watts > 10000/);
    assert.match(source, /escapeHtml\(item\.name\)/);
  }
  assert.match(styles, /\.custom-appliance-controls/);
});

test("language switch remains available on mobile", async () => {
  const [czech, slovak, styles] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("sk/index.html", "utf8"),
    readFile("styles.css", "utf8"),
  ]);
  assert.match(czech, /class="header-link language-switch" href="\/sk\/"/);
  assert.match(czech, /aria-label="Prepnúť na slovenčinu"/);
  assert.match(czech, /class="header-link language-switch" href="\/pl\/"/);
  assert.match(slovak, /class="header-link language-switch" href="\/"/);
  assert.match(slovak, /aria-label="Přepnout do češtiny"/);
  assert.match(slovak, /class="header-link language-switch" href="\/pl\/"/);
  assert.match(styles, /\.header-link\.language-switch \{ display: inline-flex; \}/);
  assert.ok(czech.includes('href="/styles.css?v=20260827-profiles1"'));
  assert.ok(slovak.includes('href="/styles.css?v=20260827-profiles1"'));
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
  assert.ok(html.includes('src="/src/app-sk.js?v=20260827-profiles1"'));
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

test("Polish calculator is localized, indexable and isolated to its verified catalog", async () => {
  const [html, app, catalog, payload, sitemap, czech, slovak, analytics, llms, llmsFull] = await Promise.all([
    readFile("pl/index.html", "utf8"),
    readFile("src/app-pl.js", "utf8"),
    readFile("src/catalog-pl.js", "utf8"),
    readFile("data/products-pl.json", "utf8"),
    readFile("sitemap.xml", "utf8"),
    readFile("index.html", "utf8"),
    readFile("sk/index.html", "utf8"),
    readFile("src/analytics.js", "utf8"),
    readFile("llms.txt", "utf8"),
    readFile("llms-full.txt", "utf8"),
  ]);
  assert.ok(html.includes('<html lang="pl">'));
  assert.ok(html.includes('<link rel="canonical" href="https://mypowersetup.com/pl/"'));
  assert.ok(html.includes('hreflang="cs-CZ"'));
  assert.ok(html.includes('hreflang="pl-PL"'));
  assert.ok(html.includes('src="/src/app-pl.js?v=20260827-profiles1"'));
  assert.ok(app.includes('products.js?v=20260827-allpowers2'));
  assert.match(html, /Jakiego akumulatora i paneli naprawdę potrzebujesz/);
  assert.match(html, /Zanim zaczniesz kupować/);
  assert.doesNotMatch(html, /sprievodca|sukromie|Vypočítať|Koľko batérie|slovenské návody/);
  assert.ok(app.includes('fetch("/data/products-pl.json"'));
  assert.ok(app.includes('locale: "pl"'));
  assert.ok(app.includes('}, "pl", window.location.origin)'));
  assert.ok(app.includes('buildSystemDiagram(result, "pl")'));
  assert.ok(app.includes('buildInstallationPlan(result, "pl")'));
  assert.match(catalog, /Lodówka kompresorowa/);
  const polishProducts = JSON.parse(payload);
  assert.equal(polishProducts.market, "pl-PL");
  assert.equal(polishProducts.currency, "PLN");
  assert.equal(polishProducts.sources.allpowers_pl.status, "ok");
  assert.ok(polishProducts.products.length >= 20);
  assert.ok(polishProducts.products.some((product) => product.category === "power_station"));
  assert.ok(polishProducts.products.some((product) => product.category === "solar_panel"));
  assert.ok(polishProducts.products.every((product) => product.affiliateUrl.includes("awinmid=121776")));
  assert.ok(sitemap.includes("<loc>https://mypowersetup.com/pl/</loc>"));
  assert.ok(czech.includes('hreflang="pl-PL" href="https://mypowersetup.com/pl/"'));
  assert.ok(slovak.includes('hreflang="pl-PL" href="https://mypowersetup.com/pl/"'));
  assert.match(analytics, /Zezwól na analitykę/);
  assert.ok(llms.includes("https://mypowersetup.com/pl/"));
  assert.ok(llmsFull.includes("https://mypowersetup.com/pl/"));
});

test("hidden calculator actions stay hidden even when component styles set display", async () => {
  const [styles, app, appSk, appPl, czech, slovak, polish] = await Promise.all([
    readFile("styles.css", "utf8"),
    readFile("src/app.js", "utf8"),
    readFile("src/app-sk.js", "utf8"),
    readFile("src/app-pl.js", "utf8"),
    readFile("index.html", "utf8"),
    readFile("sk/index.html", "utf8"),
    readFile("pl/index.html", "utf8"),
  ]);
  assert.match(styles, /\[hidden\]\s*\{\s*display:\s*none\s*!important;/);
  for (const source of [app, appSk, appPl]) {
    assert.ok(source.includes('document.querySelector("#result-products-link").hidden = total === 0'));
  }
  for (const html of [czech, slovak, polish]) assert.ok(html.includes('/styles.css?v=20260827-profiles1'));
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

test("both calculators offer a clean printable PDF summary", async () => {
  const [czech, slovak, app, appSk, styles] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("sk/index.html", "utf8"),
    readFile("src/app.js", "utf8"),
    readFile("src/app-sk.js", "utf8"),
    readFile("styles.css", "utf8"),
  ]);
  for (const html of [czech, slovak]) {
    assert.ok(html.includes('id="result-print"'));
    assert.ok(html.includes('id="print-generated-at"'));
    assert.ok(html.includes('/styles.css?v=20260827-profiles1'));
  }
  for (const source of [app, appSk]) {
    assert.ok(source.includes('trackEvent("result_print_requested")'));
    assert.ok(source.includes("window.print()"));
  }
  assert.match(styles, /@media print/);
  assert.match(styles, /\.next-step-card/);
  assert.match(styles, /break-inside: avoid/);
});

test("both calculators lead mobile users directly to compatible products", async () => {
  const [czech, slovak, app, appSk, styles] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("sk/index.html", "utf8"),
    readFile("src/app.js", "utf8"),
    readFile("src/app-sk.js", "utf8"),
    readFile("styles.css", "utf8"),
  ]);

  for (const html of [czech, slovak]) {
    assert.ok(html.includes('id="result-next"'));
    assert.ok(html.includes('id="result-product-count"'));
    assert.ok(html.includes('id="result-products-link" href="#product-recommendations"'));
    assert.ok(html.indexOf('id="product-recommendations"') < html.indexOf('class="decision-panel"'));
  }

  for (const source of [app, appSk]) {
    assert.ok(source.includes('trackEvent("product_recommendations_opened"'));
    assert.ok(source.includes('document.querySelector("#result-product-count")'));
  }

  assert.match(styles, /\.product-card-action a \{[^}]*min-height: 44px;/);
  assert.match(styles, /\.result-next-card \.button \{ width: 100%;/);
});

test("product cards disclose feed freshness without weakening compatibility checks", async () => {
  const [app, appSk, styles] = await Promise.all([
    readFile("src/app.js", "utf8"),
    readFile("src/app-sk.js", "utf8"),
    readFile("styles.css", "utf8"),
  ]);

  for (const source of [app, appSk]) {
    assert.ok(source.includes("productCatalogSources = payload.sources"));
    assert.ok(source.includes('source?.status === "stale"'));
    assert.ok(source.includes('productCatalogSources[product.merchant]?.status === "stale"'));
    assert.ok(source.includes('class="product-source-status is-stale"'));
    assert.ok(source.includes('class="product-price"'));
  }

  assert.match(app, /cenu a dostupnost ověřte po prokliku/);
  assert.match(appSk, /cenu a dostupnosť overte po prekliku/);
  assert.match(styles, /\.catalog-source-note\.is-stale/);
});

test("both calculators expose a bounded roof-fit check", async () => {
  const [czech, slovak, app, appSk] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("sk/index.html", "utf8"),
    readFile("src/app.js", "utf8"),
    readFile("src/app-sk.js", "utf8"),
  ]);
  for (const html of [czech, slovak]) {
    assert.ok(html.includes('name="roofLength"'));
    assert.ok(html.includes('name="roofWidth"'));
    assert.ok(html.includes('id="roof-fit"'));
    assert.ok(html.includes("Datasheet-BlueSolar-Monocrystalline-Panels-current-models-EN-.pdf"));
  }
  for (const source of [app, appSk]) {
    assert.ok(source.includes('from "./roof.js?v=20260822-roof1"'));
    assert.ok(source.includes("calculateRoofFit"));
    assert.ok(source.includes("ROOF_DIMENSIONS_INCOMPLETE"));
  }
});

test("both calculators produce a localized circuit-by-circuit installation plan", async () => {
  const [czech, slovak, app, appSk, module] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("sk/index.html", "utf8"),
    readFile("src/app.js", "utf8"),
    readFile("src/app-sk.js", "utf8"),
    readFile("src/installation.js", "utf8"),
  ]);
  for (const html of [czech, slovak]) {
    assert.ok(html.includes('id="installation-plan"'));
    assert.ok(html.includes("The_Wiring_Unlimited_book/en/dc-wiring.html"));
    assert.ok(html.includes("vypínac"));
  }
  assert.ok(app.includes('buildInstallationPlan(result, "cs")'));
  assert.ok(appSk.includes('buildInstallationPlan(result, "sk")'));
  assert.ok(module.includes("battery-inverter"));
  assert.ok(module.includes("starter-dcdc"));
  assert.ok(module.includes("shore-charger"));
});

test("both calculators explain product packages without weakening technical requirements", async () => {
  const [czech, slovak, app, appSk, packages] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("sk/index.html", "utf8"),
    readFile("src/app.js", "utf8"),
    readFile("src/app-sk.js", "utf8"),
    readFile("src/packages.js", "utf8"),
  ]);
  for (const html of [czech, slovak]) assert.ok(html.includes('id="package-variants"'));
  assert.ok(app.includes("Všechny varianty splňují stejný vypočtený požadavek"));
  assert.ok(appSk.includes("Všetky varianty spĺňajú rovnakú vypočítanú požiadavku"));
  assert.ok(packages.includes('buildVariant("economy"'));
  assert.ok(packages.includes('buildVariant("recommended"'));
  assert.ok(packages.includes('buildVariant("reserve"'));
  assert.ok(packages.includes('"dc_charger", "shore_charger"'));
  assert.match(app, /DC–DC nabíječka/);
  assert.match(appSk, /DC–DC nabíjačka/);
  for (const source of [app, appSk]) {
    assert.ok(source.includes('data-source="package"'));
    assert.ok(source.includes('data-package-id='));
    assert.ok(source.includes('class="package-product-link"'));
    assert.ok(source.includes('rel="sponsored noopener"'));
    assert.ok(source.includes('packageId: link.dataset.packageId'));
  }
  assert.match(app, /Zobrazit přesný produkt/);
  assert.match(appSk, /Zobraziť presný produkt/);
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
    assert.ok(html.includes('name="dcDcInputCableLength"'));
    assert.ok(html.includes('name="shoreChargeHours"'));
    assert.ok(html.includes('id="charging-options"'));
  }
  assert.match(app, /DC–DC z alternátoru/);
  assert.match(appSk, /DC–DC z alternátora/);
  assert.match(charging, /PLANNING_C_RATE/);
  assert.doesNotMatch(charging, /alternator.*max|pojistka.*A|poistka.*A/i);
  assert.match(app, /pojistku tento výpočet neurčuje/);
  assert.match(appSk, /poistku tento výpočet neurčuje/);
  assert.match(app, /24V nástavbovou baterii/);
  assert.match(appSk, /24V nadstavbovú batériu/);
  assert.match(app, /Orientační odběr ze/);
  assert.match(appSk, /Orientačný odber z/);
  assert.match(charging, /estimatedInputCurrentAmps/);
  for (const html of [method, methodSk]) {
    assert.ok(html.includes("victronenergy.com/media/pg/Orion_XS_12-12-50A_DC-DC_battery_charger/en/installation.html"));
    assert.match(html, /0,2 C/);
    assert.match(html, /0,1 C/);
    assert.match(html, /nejsou univerzální povolená maxima|nie sú univerzálne povolené maximá/);
    assert.match(html, /odhad vstupních A DC–DC|odhad vstupných A DC–DC/);
    assert.match(html, /do 3 %/);
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

test("Czech and Slovak solar guides share the calculator assumptions and reciprocal language links", async () => {
  const [czech, slovak, full] = await Promise.all([
    readFile("pruvodce/kolik-w-solarnich-panelu/index.html", "utf8"),
    readFile("sk/sprievodca/kolko-w-solarnych-panelov/index.html", "utf8"),
    readFile("llms-full.txt", "utf8"),
  ]);
  for (const html of [czech, slovak]) {
    assert.match(html, /600 × 1,15 ÷ 4 ÷ 0,75 = <strong>230 Wp<\/strong>/);
    assert.match(html, /75 ?%/);
    assert.ok(html.includes("Manual_SmartSolar_MPPT"));
  }
  assert.ok(czech.includes('hreflang="sk-SK" href="https://mypowersetup.com/sk/sprievodca/kolko-w-solarnych-panelov/"'));
  assert.ok(slovak.includes('hreflang="cs-CZ" href="https://mypowersetup.com/pruvodce/kolik-w-solarnich-panelu/"'));
  assert.match(slovak, /4,5 špičkovej hodiny v lete/);
  assert.match(full, /4,5 hodiny pro léto, 3 hodiny pro jaro nebo podzim a 1,5 hodiny pro zimu/);
});

test("Czech and Slovak MPPT guides share bounded checks and reciprocal language links", async () => {
  const [czech, slovak] = await Promise.all([
    readFile("pruvodce/jak-vybrat-mppt-regulator/index.html", "utf8"),
    readFile("sk/sprievodca/ako-vybrat-mppt-regulator/index.html", "utf8"),
  ]);
  for (const html of [czech, slovak]) {
    assert.match(html, /400 ÷ 12 × 1,25 ≈ 42 A/);
    assert.match(html, /Voc/);
    assert.match(html, /Isc/);
    assert.match(html, /290 W/);
    assert.match(html, /580 W/);
    assert.ok(html.includes("technical-specifications.html"));
  }
  assert.ok(czech.includes('hreflang="sk-SK" href="https://mypowersetup.com/sk/sprievodca/ako-vybrat-mppt-regulator/"'));
  assert.ok(slovak.includes('hreflang="cs-CZ" href="https://mypowersetup.com/pruvodce/jak-vybrat-mppt-regulator/"'));
});

test("Czech and Slovak DC-DC guides share the charging model and reciprocal language links", async () => {
  const [czech, slovak, charging] = await Promise.all([
    readFile("pruvodce/jak-vybrat-dc-dc-nabijecku/index.html", "utf8"),
    readFile("sk/sprievodca/ako-vybrat-dc-dc-nabijacku/index.html", "utf8"),
    readFile("src/charging.js", "utf8"),
  ]);
  for (const html of [czech, slovak]) {
    assert.match(html, /600 ÷ 2 ÷ 12 ÷ 0,90 ≈ 27,8 A/);
    assert.match(html, /0,2 C/);
    assert.match(html, /0,1 C/);
    assert.ok(html.includes("Orion-Tr_Smart"));
  }
  assert.ok(czech.includes('hreflang="sk-SK" href="https://mypowersetup.com/sk/sprievodca/ako-vybrat-dc-dc-nabijacku/"'));
  assert.ok(slovak.includes('hreflang="cs-CZ" href="https://mypowersetup.com/pruvodce/jak-vybrat-dc-dc-nabijecku/"'));
  assert.ok(charging.includes("const CHARGING_EFFICIENCY = 0.9"));
});

test("Czech and Slovak 230V charger guides share the charging model and reciprocal language links", async () => {
  const [czech, slovak] = await Promise.all([
    readFile("pruvodce/jak-vybrat-nabijecku-230-v/index.html", "utf8"),
    readFile("sk/sprievodca/ako-vybrat-nabijacku-230-v/index.html", "utf8"),
  ]);
  for (const html of [czech, slovak]) {
    assert.match(html, /600 ÷ 8 ÷ 12 ÷ 0,90 ≈ 6,9 A/);
    assert.match(html, /0,2 C/);
    assert.match(html, /0,1 C/);
    assert.ok(html.includes("Blue_Smart_IP22_Charger_230V_manual"));
  }
  assert.ok(czech.includes('hreflang="sk-SK" href="https://mypowersetup.com/sk/sprievodca/ako-vybrat-nabijacku-230-v/"'));
  assert.ok(slovak.includes('hreflang="cs-CZ" href="https://mypowersetup.com/pruvodce/jak-vybrat-nabijecku-230-v/"'));
});

test("Czech and Slovak inverter guides share sizing examples and reciprocal language links", async () => {
  const [czech, slovak] = await Promise.all([
    readFile("pruvodce/jak-velky-menic-do-karavanu/index.html", "utf8"),
    readFile("sk/sprievodca/aky-velky-menic-do-karavanu/index.html", "utf8"),
  ]);
  for (const html of [czech, slovak]) {
    assert.match(html, /1 200 W/);
    assert.match(html, /111 A/);
    assert.match(html, /1 200 W (?:po dobu|počas) 15 sek/);
    assert.ok(html.includes("Inverter_VE.Direct_230V"));
  }
  assert.ok(czech.includes('hreflang="sk-SK" href="https://mypowersetup.com/sk/sprievodca/aky-velky-menic-do-karavanu/"'));
  assert.ok(slovak.includes('hreflang="cs-CZ" href="https://mypowersetup.com/pruvodce/jak-velky-menic-do-karavanu/"'));
});

test("Czech and Slovak compressor fridge guides share measured examples and reciprocal language links", async () => {
  const [czech, slovak] = await Promise.all([
    readFile("pruvodce/spotreba-kompresorove-lednice/index.html", "utf8"),
    readFile("sk/sprievodca/spotreba-kompresorovej-chladnicky/index.html", "utf8"),
  ]);
  for (const html of [czech, slovak]) {
    assert.match(html, /268 Wh\/24 h/);
    assert.match(html, /557 Wh\/24 h/);
    assert.match(html, /12 V × 5 A × 24 h × 0,40 = 576 Wh/);
    assert.ok(html.includes("dometic-crx-50t"));
  }
  assert.ok(czech.includes('hreflang="sk-SK" href="https://mypowersetup.com/sk/sprievodca/spotreba-kompresorovej-chladnicky/"'));
  assert.ok(slovak.includes('hreflang="cs-CZ" href="https://mypowersetup.com/pruvodce/spotreba-kompresorove-lednice/"'));
});

test("both calculators compare a portable power station without claiming a product match", async () => {
  const [cs, sk, app, appSk, module, method, methodSk] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("sk/index.html", "utf8"),
    readFile("src/app.js", "utf8"),
    readFile("src/app-sk.js", "utf8"),
    readFile("src/power-station.js", "utf8"),
    readFile("metodika/index.html", "utf8"),
    readFile("sk/metodika/index.html", "utf8")
  ]);

  assert.ok(cs.includes('id="power-station-profile"'));
  assert.ok(sk.includes('id="power-station-profile"'));
  assert.match(cs, /Nejde o doporučení konkrétní značky/);
  assert.match(sk, /Nejde o odporúčanie konkrétnej značky/);
  assert.ok(app.includes("calculatePowerStationProfile(result)"));
  assert.ok(appSk.includes("calculatePowerStationProfile(result)"));
  assert.ok(module.includes("const CONSERVATIVE_USABLE_RATIO = 0.8"));
  assert.match(method, /denní Wh × dny autonomie × 1,15 ÷ 0,80/);
  assert.match(methodSk, /denné Wh × dni autonómie × 1,15 ÷ 0,80/);
  assert.doesNotMatch(`${cs}${sk}`, /BLUETTI|ALLPOWERS/i);
});

test("Czech product sync accepts optional Solar-import and Battery.cz feeds safely", async () => {
  const [sync, workflow, app] = await Promise.all([
    readFile("scripts/sync-products.mjs", "utf8"),
    readFile(".github/workflows/sync-products.yml", "utf8"),
    readFile("src/app.js", "utf8")
  ]);

  assert.ok(sync.includes('["solarimport", process.env.SOLAR_IMPORT_FEED_URL, false]'));
  assert.ok(sync.includes('["batterycz", process.env.BATTERY_CZ_FEED_URL, false]'));
  assert.ok(sync.includes('status: "disabled"'));
  assert.ok(sync.includes("previousProducts.filter((product) => product.merchant === merchant)"));
  assert.ok(workflow.includes("SOLAR_IMPORT_FEED_URL: ${{ secrets.SOLAR_IMPORT_FEED_URL }}"));
  assert.ok(workflow.includes("BATTERY_CZ_FEED_URL: ${{ secrets.BATTERY_CZ_FEED_URL }}"));
  assert.ok(app.includes('solarimport: "Solar-import.cz"'));
  assert.ok(app.includes('batterycz: "Battery.cz"'));
});
