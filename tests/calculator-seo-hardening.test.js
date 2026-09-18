import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ORIGIN = "https://mypowersetup.com";
const CLUSTER = Object.freeze([
  Object.freeze({ slug: "", guide: null }),
  Object.freeze({ slug: "kapacita-baterie", guide: "pruvodce/kapacita-baterie-do-karavanu/index.html" }),
  Object.freeze({ slug: "solarni-panely", guide: "pruvodce/kolik-w-solarnich-panelu/index.html" }),
  Object.freeze({ slug: "mppt-regulator", guide: "pruvodce/jak-vybrat-mppt-regulator/index.html" }),
  Object.freeze({ slug: "vykon-menice", guide: "pruvodce/jak-velky-menic-do-karavanu/index.html" }),
  Object.freeze({ slug: "prurez-kabelu-12v", guide: "pruvodce/kabely-a-pojistky-12-v/index.html" }),
  Object.freeze({ slug: "12v-nebo-24v", guide: "pruvodce/12-v-nebo-24-v-karavan/index.html" }),
]);

const LOCALIZED_EQUIVALENTS = Object.freeze({
  "": Object.freeze({
    sk: "/sk/kalkulacky/",
    pl: "/pl/kalkulatory/",
    hu: "/hu/kalkulatorok/",
  }),
  "kapacita-baterie": Object.freeze({
    sk: "/sk/kalkulacky/kapacita-baterie/",
    pl: "/pl/kalkulatory/pojemnosc-akumulatora/",
    hu: "/hu/kalkulatorok/akkumulator-kapacitas/",
  }),
  "solarni-panely": Object.freeze({
    sk: "/sk/kalkulacky/solarne-panely/",
    pl: "/pl/kalkulatory/panele-solarne/",
    hu: "/hu/kalkulatorok/napelem-teljesitmeny/",
  }),
});


const TOP_LEVEL_DISCOVERY = Object.freeze([
  Object.freeze({ home: "index.html", guideHub: "pruvodce/index.html", calculatorHub: "/kalkulacky/" }),
  Object.freeze({ home: "sk/index.html", guideHub: "sk/sprievodca/index.html", calculatorHub: "/sk/kalkulacky/" }),
  Object.freeze({ home: "pl/index.html", guideHub: "pl/poradnik/index.html", calculatorHub: "/pl/kalkulatory/" }),
  Object.freeze({ home: "hu/index.html", guideHub: "hu/utmutatok/index.html", calculatorHub: "/hu/kalkulatorok/" }),
]);

function routeFor(slug) {
  return slug ? `/kalkulacky/${slug}/` : "/kalkulacky/";
}

function fileFor(slug) {
  return slug ? `kalkulacky/${slug}/index.html` : "kalkulacky/index.html";
}

function matchOne(html, expression, label) {
  const matches = [...html.matchAll(expression)];
  assert.equal(matches.length, 1, `${label} must appear exactly once`);
  return matches[0][1];
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function expectedAlternates(slug) {
  const route = routeFor(slug);
  const localized = LOCALIZED_EQUIVALENTS[slug];
  if (!localized) {
    return [
      ["cs-CZ", `${ORIGIN}${route}`],
      ["x-default", `${ORIGIN}${route}`],
    ];
  }
  return [
    ["cs-CZ", `${ORIGIN}${route}`],
    ["sk-SK", `${ORIGIN}${localized.sk}`],
    ["pl-PL", `${ORIGIN}${localized.pl}`],
    ["hu-HU", `${ORIGIN}${localized.hu}`],
    ["x-default", `${ORIGIN}${route}`],
  ];
}

test("calculator cluster has unique search intent metadata and indexable self canonicals", async () => {
  const titles = new Set();
  const descriptions = new Set();
  const h1s = new Set();

  for (const entry of CLUSTER) {
    const route = routeFor(entry.slug);
    const html = await readFile(fileFor(entry.slug), "utf8");
    const canonical = matchOne(html, /<link rel="canonical" href="([^"]+)">/g, `${route} canonical`);
    const title = matchOne(html, /<title>([^<]+)<\/title>/g, `${route} title`);
    const description = matchOne(html, /<meta name="description" content="([^"]+)">/g, `${route} meta description`);
    const h1 = matchOne(html, /<h1>([^<]+)<\/h1>/g, `${route} H1`);

    assert.equal(canonical, `${ORIGIN}${route}`, `${route} must self-canonicalize`);
    assert.doesNotMatch(html, /<meta[^>]+name="robots"[^>]+noindex/i, `${route} must be indexable`);
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/, `${route} needs mobile viewport`);
    assert.ok(!titles.has(title), `${route} duplicates title ${title}`);
    assert.ok(!descriptions.has(description), `${route} duplicates meta description ${description}`);
    assert.ok(!h1s.has(h1), `${route} duplicates H1 ${h1}`);
    titles.add(title);
    descriptions.add(description);
    h1s.add(h1);
  }
});

test("calculator hreflang advertises only published equivalents", async () => {
  for (const entry of CLUSTER) {
    const route = routeFor(entry.slug);
    const html = await readFile(fileFor(entry.slug), "utf8");
    const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)]
      .map(([, lang, href]) => [lang, href]);
    assert.deepEqual(alternates, expectedAlternates(entry.slug), `${route} hreflang must match published calculator equivalents`);
    assert.doesNotMatch(html, /hreflang="(?:pt-PT|ro-RO|sl-SI)"/, `${route} must not advertise blocked expansion markets`);
  }
});

test("calculator structured data stays defensible and breadcrumbs match each canonical", async () => {
  for (const entry of CLUSTER) {
    const route = routeFor(entry.slug);
    const html = await readFile(fileFor(entry.slug), "utf8");
    assert.match(html, /"@type"\s*:\s*"BreadcrumbList"/, `${route} missing BreadcrumbList`);
    const canonicalReference = new RegExp(`"(?:item|url)"\\s*:\\s*"${escapeRegex(`${ORIGIN}${route}`)}"`);
    assert.match(html, canonicalReference, `${route} schema must reference its canonical`);
    if (entry.slug) {
      assert.match(html, /"@type"\s*:\s*"WebApplication"/, `${route} missing WebApplication`);
      assert.match(html, /"@type"\s*:\s*"FAQPage"/, `${route} missing FAQPage`);
    } else {
      assert.match(html, /"@type"\s*:\s*"CollectionPage"/, `${route} missing CollectionPage`);
      assert.match(html, /"@type"\s*:\s*"ItemList"/, `${route} missing ItemList`);
    }
  }
});

test("calculator sitemap contains every CZ production calculator exactly once without duplicates", async () => {
  const xml = await readFile("sitemap-calculators.xml", "utf8");
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const expected = CLUSTER.map((entry) => `${ORIGIN}${routeFor(entry.slug)}`);
  for (const url of expected) {
    assert.equal(urls.filter((candidate) => candidate === url).length, 1, `${url} must appear exactly once`);
  }
  assert.equal(new Set(urls).size, urls.length, "calculator sitemap must not contain duplicates");
  for (const entry of CLUSTER) await readFile(fileFor(entry.slug), "utf8");
});

test("calculator hub and matching money guides create reciprocal internal discovery paths", async () => {
  const hub = await readFile("kalkulacky/index.html", "utf8");
  for (const entry of CLUSTER.filter((item) => item.slug)) {
    const route = routeFor(entry.slug);
    assert.ok(hub.includes(`href="${route}"`), `hub must link ${route}`);
    const page = await readFile(fileFor(entry.slug), "utf8");
    assert.ok(page.includes('href="/kalkulacky/"'), `${route} must link back to calculator hub`);
    const guide = await readFile(entry.guide, "utf8");
    assert.ok(guide.includes(`href="${route}"`), `${entry.guide} must link the matching calculator ${route}`);
  }
});


test("calculator hubs have high-level discovery links from home and guide hubs", async () => {
  for (const entry of TOP_LEVEL_DISCOVERY) {
    const [home, guideHub] = await Promise.all([
      readFile(entry.home, "utf8"),
      readFile(entry.guideHub, "utf8"),
    ]);
    assert.ok(home.includes(`href="${entry.calculatorHub}"`), `${entry.home} must link ${entry.calculatorHub}`);
    assert.ok(guideHub.includes(`href="${entry.calculatorHub}"`), `${entry.guideHub} must link ${entry.calculatorHub}`);
  }
});

test("interactive calculator pages expose accessible mobile-friendly form controls", async () => {
  for (const entry of CLUSTER.filter((item) => item.slug)) {
    const route = routeFor(entry.slug);
    const html = await readFile(fileFor(entry.slug), "utf8");
    assert.match(html, /data-calculator-landing/, `${route} missing calculator root`);
    assert.match(html, /<form[^>]+data-calculator-form/, `${route} missing form`);
    assert.match(html, /aria-live="polite"/, `${route} missing result live region`);
    assert.match(html, /inputmode="(?:numeric|decimal)"/, `${route} should request a mobile numeric keyboard`);
  }
});
