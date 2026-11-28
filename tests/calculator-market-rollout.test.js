import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { classifyGuideCalculatorLink } from "../src/analytics-links.js";

const ORIGIN = "https://mypowersetup.com";
const families = Object.freeze({
  hub: Object.freeze({
    cs: "/kalkulacky/",
    sk: "/sk/kalkulacky/",
    pl: "/pl/kalkulatory/",
    hu: "/hu/kalkulatorok/",
  }),
  battery: Object.freeze({
    cs: "/kalkulacky/kapacita-baterie/",
    sk: "/sk/kalkulacky/kapacita-baterie/",
    pl: "/pl/kalkulatory/pojemnosc-akumulatora/",
    hu: "/hu/kalkulatorok/akkumulator-kapacitas/",
  }),
  solar: Object.freeze({
    cs: "/kalkulacky/solarni-panely/",
    sk: "/sk/kalkulacky/solarne-panely/",
    pl: "/pl/kalkulatory/panele-solarne/",
    hu: "/hu/kalkulatorok/napelem-teljesitmeny/",
  }),
  mppt: Object.freeze({
    cs: "/kalkulacky/mppt-regulator/",
    sk: "/sk/kalkulacky/mppt-regulator/",
    pl: "/pl/kalkulatory/regulator-mppt/",
    hu: "/hu/kalkulatorok/mppt-szabalyozo/",
  }),
  inverter: Object.freeze({
    cs: "/kalkulacky/vykon-menice/",
    sk: "/sk/kalkulacky/vykon-menica/",
    pl: "/pl/kalkulatory/moc-przetwornicy/",
    hu: "/hu/kalkulatorok/inverter-teljesitmeny/",
  }),
  voltage: Object.freeze({
    cs: "/kalkulacky/12v-nebo-24v/",
    sk: "/sk/kalkulacky/12v-alebo-24v/",
    pl: "/pl/kalkulatory/12v-czy-24v/",
    hu: "/hu/kalkulatorok/12v-vagy-24v/",
  }),
  cable: Object.freeze({
    cs: "/kalkulacky/prurez-kabelu-12v/",
    sk: "/sk/kalkulacky/prierez-kabla-12v/",
    pl: "/pl/kalkulatory/przekroj-przewodu-12v/",
    hu: "/hu/kalkulatorok/vezetek-keresztmetszet-12v/",
  }),
  dcdc: Object.freeze({
    cs: "/kalkulacky/dc-dc-nabijecka/",
    sk: "/sk/kalkulacky/dc-dc-nabijacka/",
    pl: "/pl/kalkulatory/ladowarka-dc-dc/",
    hu: "/hu/kalkulatorok/dc-dc-tolto/",
  }),
  protection: Object.freeze({
    cs: "/kalkulacky/jisteni-12v/",
    sk: "/sk/kalkulacky/istenie-12v/",
    pl: "/pl/kalkulatory/bezpiecznik-12v/",
    hu: "/hu/kalkulatorok/biztositek-12v/",
  }),
});

const czPublishedRoutes = Object.freeze([
  families.hub.cs,
  families.battery.cs,
  "/kalkulacky/vydrz-baterie/",
  families.solar.cs,
  "/kalkulacky/mppt-regulator/",
  "/kalkulacky/dc-dc-nabijecka/",
  "/kalkulacky/vykon-menice/",
  "/kalkulacky/prurez-kabelu-12v/",
  "/kalkulacky/jisteni-12v/",
  "/kalkulacky/12v-nebo-24v/",
]);

const localeMeta = Object.freeze({
  sk: Object.freeze({ builder: "/sk/#kalkulator", guidePrefix: "/sk/sprievodca/" }),
  pl: Object.freeze({ builder: "/pl/#kalkulator", guidePrefix: "/pl/poradnik/" }),
  hu: Object.freeze({ builder: "/hu/#kalkulator", guidePrefix: "/hu/utmutatok/" }),
});

function fileFor(route) {
  return `${route.slice(1)}index.html`;
}

function alternates(html) {
  return [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)]
    .map(([, lang, href]) => [lang, href]);
}

function expectedAlternates(family) {
  return [
    ["cs-CZ", `${ORIGIN}${family.cs}`],
    ["sk-SK", `${ORIGIN}${family.sk}`],
    ["pl-PL", `${ORIGIN}${family.pl}`],
    ["hu-HU", `${ORIGIN}${family.hu}`],
    ["x-default", `${ORIGIN}${family.cs}`],
  ];
}

test("published calculator families have reciprocal core-market hreflang", async () => {
  for (const key of ["hub", "battery", "solar", "mppt", "inverter", "voltage", "cable", "dcdc", "protection"]) {
    const family = families[key];
    const expected = expectedAlternates(family);
    for (const route of Object.values(family)) {
      const html = await readFile(fileFor(route), "utf8");
      assert.deepEqual(alternates(html), expected, `${route} hreflang family mismatch`);
      assert.doesNotMatch(html, /hreflang="(?:pt-PT|ro-RO|sl-SI)"/, `${route} must not advertise blocked expansion markets`);
    }
  }
});

test("SK PL HU calculator pages are native market handoffs, not cross-market clones", async () => {
  for (const [locale, meta] of Object.entries(localeMeta)) {
    const foreignLocales = Object.keys(localeMeta).filter((candidate) => candidate !== locale);
    for (const key of ["battery", "solar", "mppt", "inverter", "voltage", "cable", "dcdc", "protection"]) {
      const route = families[key][locale];
      const html = await readFile(fileFor(route), "utf8");
      assert.ok(html.includes(`rel="canonical" href="${ORIGIN}${route}"`), `${route} must self-canonicalize`);
      assert.ok(html.includes(`data-calculator-locale="${locale}"`), `${route} must use ${locale} calculation context`);
      assert.ok(html.includes(`href="${meta.builder}"`), `${route} must continue to its local Builder`);
      assert.ok(html.includes(`href="${meta.guidePrefix}`), `${route} must continue to its local guide`);
      for (const foreign of foreignLocales) {
        assert.doesNotMatch(html, new RegExp(`href="/${foreign}/`), `${route} must not link into ${foreign} market content`);
      }
    }
  }
});

test("localized calculator hubs expose MPPT and inverter with a linked solar next step", async () => {
  for (const locale of Object.keys(localeMeta)) {
    const hubRoute = families.hub[locale];
    const html = await readFile(fileFor(hubRoute), "utf8");
    assert.ok(html.includes(`href="${families.battery[locale]}"`));
    assert.ok(html.includes(`href="${families.solar[locale]}"`));
    assert.ok(html.includes(`href="${families.mppt[locale]}"`));
    assert.ok(html.includes(`href="${families.inverter[locale]}"`));
    assert.ok(html.includes(`href="${families.voltage[locale]}"`));
    assert.ok(html.includes(`href="${families.cable[locale]}"`));
    assert.ok(html.includes(`href="${families.dcdc[locale]}"`));
    assert.ok(html.includes(`href="${families.protection[locale]}"`));
    const solar = await readFile(fileFor(families.solar[locale]), "utf8");
    assert.ok(solar.includes(`href="${families.mppt[locale]}"`), `${families.solar[locale]} must link next-step MPPT`);
    assert.doesNotMatch(html, /href="\/[^\"]*jisteni-12v\//i, `${hubRoute} should not link unimplemented protection calculator`);
  }
});

test("localized inverter landings expose the shared sizing engine and electrical boundary guidance", async () => {
  for (const [locale, meta] of Object.entries(localeMeta)) {
    const route = families.inverter[locale];
    const html = await readFile(fileFor(route), "utf8");
    assert.match(html, /data-calculator-landing\s+data-calculator-intent="inverter-sizing"/);
    assert.match(html, /data-result-inverter-watts/);
    assert.match(html, /data-result-surge-watts/);
    assert.match(html, /data-result-concurrent-watts/);
    assert.match(html, /data-result-voltage/);
    assert.match(html, /src="\/src\/calculator-landing-browser\.js\?v=/);
    for (const field of ["largestLoadWatts", "otherLoadWatts", "surgeMultiplier", "systemVoltage"]) {
      assert.match(html, new RegExp(`name="${field}"`), `${route} requires ${field}`);
    }
    assert.ok(html.includes(`href="${meta.builder}"`));
    assert.ok(html.includes(`href="${meta.guidePrefix}`));
    if (["sk","pl"].includes(locale)) {
      assert.match(html, /data-inverter-buyers/);
      assert.match(html, /data-inverter-offer-list/);
      assert.ok(html.indexOf("data-inverter-buyers") < html.indexOf('class="calculator-actions"'));
    } else {
      assert.doesNotMatch(html, /data-inverter-buyers/, "localized buyers require reviewed offers in their own market");
    }
    assert.doesNotMatch(html, /(?:href|src)="\/\/(?:[a-z]{2}|www)\./, "no protocol-relative external destinations");
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)];
    assert.ok(scripts.length > 0, `${route} needs structured data`);
    const schema = JSON.parse(scripts[0][1]);
    assert.deepEqual(schema["@graph"].map(({ "@type": type }) => type), ["WebApplication", "BreadcrumbList", "FAQPage"]);
  }
});

test("localized 12 V vs 24 V pages use the canonical voltage engine and disclose installed-system limits", async () => {
  for (const [locale, meta] of Object.entries(localeMeta)) {
    const route = families.voltage[locale];
    const html = await readFile(fileFor(route), "utf8");
    assert.match(html, /data-calculator-landing\s+data-calculator-intent="voltage-system"/);
    assert.match(html, /data-result-voltage-decision/);
    assert.match(html, /data-result-battery-wh/);
    assert.match(html, /data-result-inverter-watts/);
    assert.match(html, /data-result-daily-wh/);
    assert.match(html, /src="\/src\/calculator-landing-browser\.js\?v=/);
    for (const field of ["dailyWh", "maxAcLoadWatts", "surgeMultiplier"]) {
      assert.match(html, new RegExp(`name="${field}"`), `${route} requires ${field}`);
    }
    assert.ok(html.includes(`href="${meta.builder}"`));
    assert.ok(html.includes(`href="${meta.guidePrefix}`));
    assert.match(html, /1 000 W/);
    assert.match(html, /2 000 W/);
    assert.doesNotMatch(html, /data-inverter-buyers/);
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)];
    assert.ok(scripts.length > 0, `${route} needs structured data`);
    const schema = JSON.parse(scripts[0][1]);
    assert.deepEqual(schema["@graph"].map(({ "@type": type }) => type), ["WebApplication", "BreadcrumbList", "FAQPage"]);
  }
});

test("localized cable sizing pages render the shared voltage-drop calculator with a clear safety boundary", async () => {
  const safetyTerms = Object.freeze({ sk: /prúdovej zaťažiteľnosti|prúdovú zaťažiteľnosť/, pl: /obciążalność prądową/, hu: /áramterhelhetőségét/ });
  for (const [locale, meta] of Object.entries(localeMeta)) {
    const route = families.cable[locale];
    const html = await readFile(fileFor(route), "utf8");
    assert.match(html, /data-calculator-landing\s+data-calculator-intent="cable-voltage-drop"/);
    for (const field of ["loadWatts", "oneWayLengthM", "systemVoltage", "maxDropPercent"]) {
      assert.ok(html.includes(`name="${field}"`), `${route} must include ${field}`);
    }
    for (const metric of ["cable-mm2", "current-amps", "drop-percent", "drop-volts", "summary", "reserve", "warnings"]) {
      assert.match(html, new RegExp(`data-result-${metric}`), `${route} needs result marker ${metric}`);
    }
    assert.ok(html.includes(`href="${meta.builder}"`), `${route} needs localized builder`);
    assert.ok(html.includes(`href="${meta.guidePrefix}`), `${route} needs localized cable safety guide`);
    assert.match(html, safetyTerms[locale], `${route} must distinguish voltage drop from ampacity`);
    assert.match(html, /BMS/, `${route} must mention BMS and fuse coordination`);
    assert.match(html, /src="\/src\/calculator-landing-browser\.js\?v=/);
    const schema = JSON.parse([...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)][0][1]);
    assert.deepEqual(schema["@graph"].map(({ "@type": type }) => type), ["WebApplication", "BreadcrumbList", "FAQPage"]);
    assert.equal(schema["@graph"][0].inLanguage, `${locale}-${locale.toUpperCase()}`);
  }
});

test("localized DC/DC pages render one shared charger engine with safe market-specific guidance", async () => {
  for (const [locale, meta] of Object.entries(localeMeta)) {
    const route = families.dcdc[locale];
    const html = await readFile(fileFor(route), "utf8");
    assert.match(html, /data-phase2-calculator\s+data-calculator-intent="dcdc-sizing"/);
    for (const field of ["batteryCapacityAh", "replenishPercent", "targetDriveHours", "batteryVoltage", "sourceVoltage", "spareAlternatorCurrentA", "batteryMaxChargeCurrentA", "efficiencyPercent"]) {
      assert.ok(html.includes(`name="${field}"`), `${route} needs ${field}`);
    }
    for (const metric of ["charger-amps", "required-amps", "feasible-amps", "recharge-hours", "source-amps", "energy-wh", "target", "summary", "reserve", "warnings"]) {
      assert.match(html, new RegExp(`data-result-${metric}`), `${route} needs result ${metric}`);
    }
    assert.ok(html.includes(`href="${meta.builder}"`));
    assert.ok(html.includes(`href="${meta.guidePrefix}`));
    assert.ok(html.includes(`href="${families.cable[locale]}"`), `${route} needs cable-sizing handoff`);
    assert.match(html, /BMS/);
    assert.match(html, /src="\/src\/dcdc-localized-landing-browser\.js\?v=/);
    if (["sk","pl"].includes(locale)) { assert.match(html,/data-dcdc-buyers/); assert.match(html,/data-dcdc-offer-list/); assert.ok(html.indexOf("data-dcdc-buyers") < html.indexOf('class="calculator-actions"')); }
    else assert.doesNotMatch(html,/data-dcdc-buyers/);
    assert.doesNotMatch(html,/data-affiliate|ehub\.cz|dognet\.sk/, `${route} must not present static unverified market offers`);
    const schema = JSON.parse([...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)][0][1]);
    assert.deepEqual(schema["@graph"].map(({ "@type": type }) => type), ["WebApplication", "BreadcrumbList", "FAQPage"]);
    assert.equal(schema["@graph"][0].inLanguage, `${locale}-${locale.toUpperCase()}`);
  }
  const browser = await readFile("src/dcdc-localized-landing-browser.js", "utf8");
  assert.match(browser, /calculateDcDcCharger/);
  assert.match(browser, /rememberCalculatorResultContext/);
  assert.match(browser, /calculator_landing_continue/);
  assert.match(browser, /mountMarketDcdcBuyers/);
  assert.doesNotMatch(browser, /from\s+["'][^"']*(?:merchant|feed|productOffers|affiliate-analytics)|data-dcdc-buyers/i);
});

test("localized DC protection pages require verified ampacity and use the canonical safe fuse engine", async () => {
  for (const [locale, meta] of Object.entries(localeMeta)) {
    const route = families.protection[locale];
    const html = await readFile(fileFor(route), "utf8");
    assert.match(html, /data-phase2-calculator\s+data-calculator-intent="dc-protection"/);
    for (const field of ["continuousCurrentA", "systemVoltage", "oneWayLengthM", "maxDropPercent", "planningMarginPercent", "cableAmpacityA", "equipmentMaxFuseA"]) {
      assert.ok(html.includes(`name="${field}"`), `${route} needs input ${field}`);
    }
    assert.match(html, /name="cableAmpacityA"[^>]*required>/, `${route} must require verified conductor ampacity`);
    assert.doesNotMatch(html, /name="cableAmpacityA"[^>]*value=/, `${route} must not silently assume example ampacity`);
    for (const metric of ["design-current", "fuse", "cable-mm2", "drop-percent", "ceiling", "feasible", "summary", "reserve", "warnings"]) {
      assert.match(html, new RegExp(`data-result-${metric}`), `${route} needs result ${metric}`);
    }
    assert.ok(html.includes(`href="${meta.builder}"`));
    assert.ok(html.includes(`href="${meta.guidePrefix}`));
    assert.ok(html.includes(`href="${families.cable[locale]}"`));
    assert.ok(html.includes(`href="${families.dcdc[locale]}"`));
    assert.match(html, /BMS|prúdovú zaťažiteľnosť|obciążalność|áramterhelhetőség/);
    assert.match(html, /src="\/src\/protection-localized-landing-browser\.js\?v=/);
    assert.doesNotMatch(html, /data-affiliate|ehub\.cz|dognet\.sk/);
    const schema = JSON.parse([...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)][0][1]);
    assert.deepEqual(schema["@graph"].map(({ "@type": type }) => type), ["WebApplication", "BreadcrumbList", "FAQPage"]);
    assert.equal(schema["@graph"][0].inLanguage, `${locale}-${locale.toUpperCase()}`);
    const cable = await readFile(fileFor(families.cable[locale]), "utf8");
    assert.ok(cable.includes(`href="${route}"`), `${families.cable[locale]} needs protection next step`);
  }
  const browser = await readFile("src/protection-localized-landing-browser.js", "utf8");
  assert.match(browser, /calculateDcProtectionPlan/);
  assert.match(browser, /recommendedFuseA == null/);
  assert.match(browser, /recommendedMm2 == null/);
  assert.match(browser, /AMPACITY_UNVERIFIED/);
  assert.match(browser, /resultPanel\.hidden = true;\s*}/);
  assert.match(browser, /clearCalculatorResultContext/);
  assert.doesNotMatch(browser, /from\s+["'][^"']*(?:merchant|feed|productOffers|affiliate-analytics)|data-dcdc-buyers/i);
});

test("calculator sitemap publishes the complete CZ plus SK PL HU calculator surface exactly once", async () => {
  const xml = await readFile("sitemap-calculators.xml", "utf8");
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const localized = [...Object.values(families).flatMap((family) => [family.sk, family.pl, family.hu]), "/sk/kalkulacky/vydrz-baterie/", "/pl/kalkulatory/czas-pracy-akumulatora/"];
  for (const route of [...czPublishedRoutes, ...localized]) {
    assert.equal(urls.filter((url) => url === `${ORIGIN}${route}`).length, 1, `${route} must appear once in calculator sitemap`);
  }
  assert.equal(
    urls.length,
    czPublishedRoutes.length + localized.length,
    "calculator sitemap should contain 10 CZ URLs plus 29 localized URLs",
  );
  assert.ok(!urls.some((url) => /\/(?:pt|ro|si)\/.*(?:kalk|calc)/i.test(url)), "PT/RO/SI calculator rollout must stay blocked");
});

const guideLinks = Object.freeze({
  "sk/sprievodca/kapacita-baterie-do-karavanu/index.html": families.battery.sk,
  "sk/sprievodca/kolko-w-solarnych-panelov/index.html": families.solar.sk,
  "pl/poradnik/pojemnosc-akumulatora-do-kampera/index.html": families.battery.pl,
  "pl/poradnik/ile-wat-paneli-solarnych-do-kampera/index.html": families.solar.pl,
  "hu/utmutatok/lakoauto-akkumulator-kapacitas/index.html": families.battery.hu,
  "hu/utmutatok/hany-watt-napelem-lakoautohoz/index.html": families.solar.hu,
});

test("matching localized guides link back to their calculator landing", async () => {
  for (const [file, route] of Object.entries(guideLinks)) {
    const html = await readFile(file, "utf8");
    assert.ok(html.includes(`href="${route}"`), `${file} must link ${route}`);
  }
});

const guideCalculatorJourney = Object.freeze({
  "sk/sprievodca/ako-vybrat-dc-dc-nabijacku/index.html": [families.dcdc.sk],
  "pl/poradnik/jak-dobrac-ladowarke-dc-dc/index.html": [families.dcdc.pl],
  "hu/utmutatok/dc-dc-tolto-kivalasztasa/index.html": [families.dcdc.hu],
  "sk/sprievodca/kable-a-poistky-12-v/index.html": [families.cable.sk, families.protection.sk],
  "pl/poradnik/przewody-i-bezpieczniki-12-v/index.html": [families.cable.pl, families.protection.pl],
  "hu/utmutatok/12-v-vezetekek-es-biztositekok/index.html": [families.cable.hu, families.protection.hu],
  "sk/sprievodca/ako-vybrat-mppt-regulator/index.html": [families.mppt.sk],
  "pl/poradnik/jak-dobrac-regulator-mppt/index.html": [families.mppt.pl],
  "hu/utmutatok/mppt-szabalyozo-kivalasztasa/index.html": [families.mppt.hu],
  "sk/sprievodca/aky-velky-menic-do-karavanu/index.html": [families.inverter.sk],
  "pl/poradnik/jak-dobrac-przetwornice-do-kampera/index.html": [families.inverter.pl],
  "hu/utmutatok/lakoauto-inverter-kivalasztasa/index.html": [families.inverter.hu],
  "sk/sprievodca/12-v-alebo-24-v-karavan/index.html": [families.voltage.sk],
  "pl/poradnik/12-v-czy-24-v-kamper/index.html": [families.voltage.pl],
  "hu/utmutatok/12-v-vagy-24-v-lakoauto/index.html": [families.voltage.hu],
});

test("15 localized buyer guides lead first to native tools and retain builder journey", async () => {
  const sitemap = await readFile("sitemap.xml", "utf8");
  const css = await readFile("article.css", "utf8");
  assert.match(css, /\.calculator-jump-links a\s*\{/);
  assert.match(css, /\.cta a\.cta-secondary\s*\{/);
  for (const [file, routes] of Object.entries(guideCalculatorJourney)) {
    const html = await readFile(file, "utf8");
    const locale = file.slice(0, 2);
    const jump = html.match(/<nav class="calculator-jump"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
    const bottom = html.match(/<section class="cta">([\s\S]*?)<\/section>/)?.[1];
    assert.ok(jump, `${file} must show an above-fold calculator next step`);
    assert.ok(bottom, `${file} must have a calculator CTA`);
    assert.ok(bottom.includes(`href="/${locale}/#kalkulator"`), `${file} must retain the market builder path`);
    const modified = ["sk/sprievodca/aky-velky-menic-do-karavanu/index.html","pl/poradnik/jak-dobrac-przetwornice-do-kampera/index.html"].includes(file) ? "2026-11-28" : "2026-11-15";
    assert.ok(html.includes(`"dateModified":"${modified}"`), `${file} should reflect the update`);
    const slug = file.replace(/\/index\.html$/, "/");
    const sitemapEntry = sitemap.match(new RegExp(`<url><loc>https://mypowersetup.com/${slug}<\\/loc><lastmod>([^<]+)<\\/lastmod>`));
    assert.equal(sitemapEntry?.[1], modified, `${file} sitemap lastmod must match`);
    for (const route of routes) {
      assert.ok(jump.includes(`href="${route}"`), `${file} early CTA missing ${route}`);
      assert.ok(bottom.includes(`href="${route}"`), `${file} final CTA missing ${route}`);
      assert.deepEqual(classifyGuideCalculatorLink(route), { destination_path: route }, `${route} must be recorded as a calculator click`);
      await readFile(fileFor(route), "utf8");
    }
  }
});
