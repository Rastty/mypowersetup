import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pages = [
  {
    market: 'CZ', path: 'pruvodce/jak-vybrat-nabijecku-230-v/index.html',
    title: /Nabíječka 230 V do karavanu/, decision: /10, 20 nebo 30 A/, section: 'vyber-nabijecky',
    mustContain: ['10 A', '20 A', '30 A', '40 A+', 'LiFePO₄', 'AGM', 'BMS', '0,2 C', '0,1 C', '/#kalkulator']
  },
  {
    market: 'SK', path: 'sk/sprievodca/ako-vybrat-nabijacku-230-v/index.html',
    title: /Nabíjačka 230 V do karavanu/, decision: /10, 20 alebo 30 A/, section: 'vyber-nabijacky',
    mustContain: ['10 A', '20 A', '30 A', '40 A+', 'LiFePO₄', 'AGM', 'BMS', '0,2 C', '0,1 C', '/sk/#kalkulator']
  },
  {
    market: 'PL', path: 'pl/poradnik/jak-dobrac-ladowarke-230-v/index.html',
    title: /Ładowarka 230 V do kampera/, decision: /10, 20 czy 30 A/, section: 'wybor-ladowarki',
    mustContain: ['10 A', '20 A', '30 A', '40 A+', 'LiFePO₄', 'AGM', 'BMS', '0,2 C', '0,1 C', '/pl/#kalkulator']
  },
  {
    market: 'HU', path: 'hu/utmutatok/230-v-os-tolto-kivalasztasa/index.html',
    title: /Lakóautó 230 V-os töltő/, decision: /10, 20 vagy 30 A/, section: 'tolto-valasztas',
    mustContain: ['10 A', '20 A', '30 A', '40 A+', 'LiFePO₄', 'AGM', 'BMS', '0,2 C', '0,1 C', '/hu/#kalkulator']
  }
];

for (const page of pages) {
  test(`${page.market} shore charger guide keeps buyer intent and battery safety guards`, async () => {
    const html = await readFile(page.path, 'utf8');
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const h1 = html.match(/<h1>([^<]+)<\/h1>/)?.[1];

    assert.ok(title, 'title must exist');
    assert.equal(h1, title, 'H1 should match title');
    assert.match(title, page.title);
    assert.match(html, page.decision);
    assert.match(html, new RegExp(`id=["']${page.section}["']`));
    assert.ok(html.includes('"dateModified":"2026-09-12"'), 'Article dateModified must be current');

    for (const token of page.mustContain) {
      assert.ok(html.toLocaleLowerCase().includes(token.toLocaleLowerCase()), `missing required token: ${token}`);
    }
  });
}
