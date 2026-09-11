import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const cases = [
  {
    market: "CZ",
    page: "pruvodce/kapacita-baterie-do-karavanu/index.html",
    title: /Baterie do karavanu/i,
    sizing: /kolik Ah/i,
    buyer: /jakou LiFePO4/i,
    section: /id="vyber-baterie"/,
    choice: /100, 150 nebo 200 Ah/i,
  },
  {
    market: "SK",
    page: "sk/sprievodca/kapacita-baterie-do-karavanu/index.html",
    title: /Batéria do karavanu/i,
    sizing: /koľko Ah/i,
    buyer: /akú LiFePO4/i,
    section: /id="vyber-baterie"/,
    choice: /100, 150 alebo 200 Ah/i,
  },
  {
    market: "PL",
    page: "pl/poradnik/pojemnosc-akumulatora-do-kampera/index.html",
    title: /Akumulator do kampera/i,
    sizing: /ile Ah/i,
    buyer: /jaki LiFePO4/i,
    section: /id="wybor-akumulatora"/,
    choice: /100, 150 czy 200 Ah/i,
  },
  {
    market: "HU",
    page: "hu/utmutatok/lakoauto-akkumulator-kapacitas/index.html",
    title: /Lakóautó akkumulátor/i,
    sizing: /hány Ah/i,
    buyer: /milyen LiFePO4/i,
    section: /id="akkumulator-valasztas"/,
    choice: /100, 150 vagy 200 Ah/i,
  },
];

for (const item of cases) {
  test(`${item.market} battery guide covers sizing and buyer intent`, async () => {
    const html = await readFile(item.page, "utf8");
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
    const h1 = html.match(/<h1>([^<]+)<\/h1>/)?.[1] ?? "";

    assert.match(title, item.title);
    assert.match(title, item.sizing);
    assert.match(title, item.buyer);
    assert.match(h1, item.title);
    assert.match(html, item.section);
    assert.match(html, item.choice);
    assert.match(html, /"dateModified":"2026-09-11"/);
    assert.match(html, /#kalkulator/);
    assert.match(html, /BMS/i);
  });
}
