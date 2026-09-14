import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
});

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
  for (const key of ["hub", "battery", "solar"]) {
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
    for (const key of ["battery", "solar"]) {
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

test("localized calculator hubs expose only the two proven intents", async () => {
  for (const locale of Object.keys(localeMeta)) {
    const hubRoute = families.hub[locale];
    const html = await readFile(fileFor(hubRoute), "utf8");
    assert.ok(html.includes(`href="${families.battery[locale]}"`));
    assert.ok(html.includes(`href="${families.solar[locale]}"`));
    assert.doesNotMatch(html, /vykon-menice|prurez-kabelu|12v-nebo-24v|inverter|feszultseg/i, `${hubRoute} should not clone unproven intents`);
  }
});

test("calculator sitemap publishes the complete CZ plus SK PL HU calculator surface exactly once", async () => {
  const xml = await readFile("sitemap-calculators.xml", "utf8");
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const localized = Object.values(families).flatMap((family) => [family.sk, family.pl, family.hu]);
  for (const route of localized) {
    assert.equal(urls.filter((url) => url === `${ORIGIN}${route}`).length, 1, `${route} must appear once in calculator sitemap`);
  }
  assert.equal(urls.length, 16, "calculator sitemap should contain 7 CZ URLs plus 9 localized URLs");
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
