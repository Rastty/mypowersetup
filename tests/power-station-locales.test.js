import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const guides = [
  {
    locale: "cs",
    path: "pruvodce/power-station-nebo-pevna-instalace-karavan/index.html",
    canonical: "https://mypowersetup.com/pruvodce/power-station-nebo-pevna-instalace-karavan/",
    localMarker: "Český scénář",
    calculator: "/#kalkulator",
    system: "/pruvodce/schema-elektroinstalace-karavanu/",
    voltage: "/pruvodce/12-v-nebo-24-v-karavan/",
    battery: "/pruvodce/kapacita-baterie-do-karavanu/",
  },
  {
    locale: "sk",
    path: "sk/sprievodca/power-station-alebo-pevna-instalacia-karavan/index.html",
    canonical: "https://mypowersetup.com/sk/sprievodca/power-station-alebo-pevna-instalacia-karavan/",
    localMarker: "Slovenský scenár",
    calculator: "/sk/#kalkulator",
    system: "/sk/sprievodca/schema-elektroinstalacie-karavanu/",
    voltage: "/sk/sprievodca/12-v-alebo-24-v-karavan/",
    battery: "/sk/sprievodca/kapacita-baterie-do-karavanu/",
  },
];

for (const guide of guides) {
  test(`${guide.locale} power station guide is local, linked and conversion-ready`, async () => {
    const html = await readFile(guide.path, "utf8");
    assert.match(html, new RegExp(`<html lang="${guide.locale}">`));
    assert.ok(html.includes(`rel="canonical" href="${guide.canonical}"`));
    assert.ok(html.includes(guide.localMarker));
    assert.ok(html.includes(`href="${guide.calculator}"`));
    assert.ok(html.includes(`href="${guide.system}"`));
    assert.ok(html.includes(`href="${guide.voltage}"`));
    assert.ok(html.includes(`href="${guide.battery}"`));
    assert.match(html, /hreflang="cs-CZ"/);
    assert.match(html, /hreflang="sk-SK"/);
    assert.match(html, /hreflang="pl-PL"/);
    assert.match(html, /nebo pevná instalace|alebo pevná inštalácia/i);
  });
}

test("all three public power station guides expose reciprocal hreflang", async () => {
  const paths = [
    "pruvodce/power-station-nebo-pevna-instalace-karavan/index.html",
    "sk/sprievodca/power-station-alebo-pevna-instalacia-karavan/index.html",
    "pl/poradnik/power-station-czy-stala-instalacja-kamper/index.html",
  ];
  for (const path of paths) {
    const html = await readFile(path, "utf8");
    assert.match(html, /hreflang="cs-CZ"/);
    assert.match(html, /hreflang="sk-SK"/);
    assert.match(html, /hreflang="pl-PL"/);
    assert.match(html, /hreflang="x-default"/);
  }
});

test("public sitemap, hubs and llms discovery expose the new cluster", async () => {
  const [sitemap, czHub, skHub, llms] = await Promise.all([
    readFile("sitemap.xml", "utf8"),
    readFile("pruvodce/index.html", "utf8"),
    readFile("sk/sprievodca/index.html", "utf8"),
    readFile("llms.txt", "utf8"),
  ]);
  for (const route of [
    "pruvodce/power-station-nebo-pevna-instalace-karavan/",
    "sk/sprievodca/power-station-alebo-pevna-instalacia-karavan/",
    "pl/poradnik/power-station-czy-stala-instalacja-kamper/",
  ]) {
    assert.ok(sitemap.includes(route));
    assert.ok(llms.includes(route));
  }
  assert.match(czHub, /power-station-nebo-pevna-instalace-karavan/);
  assert.match(skHub, /power-station-alebo-pevna-instalacia-karavan/);
});

test("CZ and SK guides do not leak Polish wording or unsafe reverse-feed advice", async () => {
  for (const guide of guides) {
    const html = (await readFile(guide.path, "utf8")).toLowerCase();
    for (const leak of ["polski scenariusz", "stała instalacja", "policz mój zestaw", "zasilanie od tyłu"]) {
      assert.equal(html.includes(leak), false, `${guide.locale} leak: ${leak}`);
    }
    assert.match(html, /nikdy nenapájejte|nikdy nenapájajte/);
  }
});
