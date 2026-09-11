import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const cases = [
  {
    market: "CZ",
    page: "pruvodce/kolik-w-solarnich-panelu/index.html",
    title: /Solární panel na karavan/i,
    sizing: /kolik W/i,
    buyer: /jakou sadu/i,
    h1: /Jaký solární panel na karavan/i,
    section: /id="sada"/,
    choice: /Pevný panel na střeše/,
  },
  {
    market: "SK",
    page: "sk/sprievodca/kolko-w-solarnych-panelov/index.html",
    title: /Solárny panel na karavan/i,
    sizing: /koľko W/i,
    buyer: /akú zostavu/i,
    h1: /Aký solárny panel na karavan/i,
    section: /id="zostava"/,
    choice: /Pevný strešný panel/,
  },
  {
    market: "HU",
    page: "hu/utmutatok/hany-watt-napelem-lakoautohoz/index.html",
    title: /Napelem lakóautóhoz/i,
    sizing: /hány W/i,
    buyer: /milyen szett/i,
    h1: /Milyen napelem kell lakóautóhoz/i,
    section: /id="szett"/,
    choice: /Fix tetőpanel/,
  },
];

for (const item of cases) {
  test(`${item.market} solar guide covers sizing and buyer intent`, async () => {
    const html = await readFile(item.page, "utf8");
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
    const h1 = html.match(/<h1>([^<]+)<\/h1>/)?.[1] ?? "";

    assert.match(title, item.title);
    assert.match(title, item.sizing);
    assert.match(title, item.buyer);
    assert.match(h1, item.h1);
    assert.match(html, item.section);
    assert.match(html, item.choice);
    assert.match(html, /"dateModified":"2026-09-11"/);
    assert.match(html, /#kalkulator/);
  });
}
