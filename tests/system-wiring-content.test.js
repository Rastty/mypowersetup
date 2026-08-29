import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const variants = [
  {
    market: "cz",
    file: "pruvodce/schema-elektroinstalace-karavanu/index.html",
    canonical: "https://mypowersetup.com/pruvodce/schema-elektroinstalace-karavanu/",
    calculator: "/#kalkulator",
    hub: "pruvodce/index.html",
    hubHref: "/pruvodce/schema-elektroinstalace-karavanu/",
    localNeedles: ["Solární panely", "servisní baterie", "Přípojka 230 V", "Českého cestování"],
  },
  {
    market: "sk",
    file: "sk/sprievodca/schema-elektroinstalacie-karavanu/index.html",
    canonical: "https://mypowersetup.com/sk/sprievodca/schema-elektroinstalacie-karavanu/",
    calculator: "/sk/#kalkulator",
    hub: "sk/sprievodca/index.html",
    hubHref: "/sk/sprievodca/schema-elektroinstalacie-karavanu/",
    localNeedles: ["Solárne panely", "servisná batéria", "Prípojka 230 V", "Tatry"],
  },
  {
    market: "pl",
    file: "pl/poradnik/schemat-instalacji-elektrycznej-kampera/index.html",
    canonical: "https://mypowersetup.com/pl/poradnik/schemat-instalacji-elektrycznej-kampera/",
    calculator: "/pl/#kalkulator",
    hub: "pl/poradnik/index.html",
    hubHref: "/pl/poradnik/schemat-instalacji-elektrycznej-kampera/",
    localNeedles: ["Panele PV", "akumulator hotelowy", "Przyłącze 230 V", "Mazurach"],
  },
];

const alternates = [
  ["cs-CZ", "https://mypowersetup.com/pruvodce/schema-elektroinstalace-karavanu/"],
  ["sk-SK", "https://mypowersetup.com/sk/sprievodca/schema-elektroinstalacie-karavanu/"],
  ["pl-PL", "https://mypowersetup.com/pl/poradnik/schemat-instalacji-elektrycznej-kampera/"],
];

test("system wiring pillars are indexable, reciprocal and conversion-ready", async () => {
  for (const variant of variants) {
    const [html, hub] = await Promise.all([
      readFile(variant.file, "utf8"),
      readFile(variant.hub, "utf8"),
    ]);
    assert.ok(html.includes(`<link rel="canonical" href="${variant.canonical}">`), variant.market);
    assert.ok(html.includes(`href="${variant.calculator}"`), variant.market);
    assert.match(html, /<script type="application\/ld\+json">[\s\S]*"@type":"Article"/);
    assert.match(html, /Petr Gálík/);
    assert.match(html, /DC–DC/);
    assert.match(html, /600/);
    assert.match(html, /0,90/);
    assert.match(html, /28 A/);
    for (const needle of variant.localNeedles) assert.ok(html.includes(needle), `${variant.market}:${needle}`);
    for (const [lang, href] of alternates) {
      assert.ok(html.includes(`hreflang="${lang}" href="${href}"`), `${variant.market}:${lang}`);
    }
    assert.ok(hub.includes(`href="${variant.hubHref}"`), `${variant.market}:hub`);
    assert.doesNotMatch(html, /(?:pojistk|poistk|bezpiecznik)[^<.]{0,45}\b\d+\s*A\b/i);
  }
});

test("system wiring pillars are present in sitemap and LLM discovery", async () => {
  const [sitemap, llms] = await Promise.all([
    readFile("sitemap.xml", "utf8"),
    readFile("llms.txt", "utf8"),
  ]);
  for (const variant of variants) {
    assert.ok(sitemap.includes(`<loc>${variant.canonical}</loc>`), variant.market);
    assert.ok(llms.includes(variant.canonical), variant.market);
  }
});

test("system wiring pillars preserve architecture boundaries instead of pretending to be installation plans", async () => {
  const htmlPages = await Promise.all(variants.map(({ file }) => readFile(file, "utf8")));
  for (const html of htmlPages) {
    assert.match(html, /MPPT/);
    assert.match(html, /230 V/);
    assert.match(html, /12 V|12V/);
    assert.match(html, /(?:elektroprojekt|projekt wykonawczy|projekt elektryczny)/i);
    assert.match(html, /(?:kvalifikovan|kvalifikovan|wykwalifikowan)/i);
  }
});
