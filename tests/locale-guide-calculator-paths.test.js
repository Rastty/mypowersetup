import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const markets = [
  { hub: "sk/sprievodca/", marker: "rychly-vypocet", battery: "/sk/kalkulacky/kapacita-baterie/", solar: "/sk/kalkulacky/solarne-panely/", main: "/sk/#kalkulator" },
  { hub: "pl/poradnik/", marker: "szybkie-obliczenia", battery: "/pl/kalkulatory/pojemnosc-akumulatora/", solar: "/pl/kalkulatory/panele-solarne/", main: "/pl/#kalkulator" },
  { hub: "hu/utmutatok/", marker: "gyors-szamitas", battery: "/hu/kalkulatorok/akkumulator-kapacitas/", solar: "/hu/kalkulatorok/napelem-teljesitmeny/", main: "/hu/#kalkulator" },
];

test("SK/PL/HU guide hubs offer immediate localized battery, solar and full-system calculations", async () => {
  for (const { hub, marker, battery, solar, main } of markets) {
    const html = await read(hub + "index.html");
    assert.match(html, new RegExp(`id="${marker}"`), hub);
    assert.match(html, /data-guide-top-cta/, hub);
    const topCta = html.indexOf(`id="${marker}"`);
    const section = html.slice(topCta, html.indexOf("</section>", topCta));
    assert.ok(topCta > 0 && section.length > 0, hub);
    for (const href of [battery, solar, main]) {
      assert.ok(section.includes(`href="${href}"`), `${hub} -> ${href}`);
    }
    for (const href of [battery, solar]) {
      const destination = await read(href.slice(1) + "index.html");
      assert.ok(destination.includes(`rel="canonical" href="https://mypowersetup.com${href}"`), href);
    }
  }
});

test("localized guide hub content changes are dated consistently in JSON-LD and sitemap", async () => {
  const sitemap = await read("sitemap.xml");
  for (const { hub } of markets) {
    const html = await read(hub + "index.html");
    assert.match(html, /"dateModified":"2026-11-15"/, hub);
    assert.ok(sitemap.includes(`<loc>https://mypowersetup.com/${hub}</loc><lastmod>2026-11-15</lastmod>`), hub);
  }
});
