import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pages = [
  {
    market: 'CZ', path: 'pruvodce/jak-velky-menic-do-karavanu/index.html',
    title: /Měnič do karavanu/, decision: /300, 1000 nebo 2000 W/, section: 'vyber-menic',
    mustContain: ['300 W', '1000 W', '2000 W', 'BMS', 'čistou sinus', '1,25', '111 A', '185 A', '/#kalkulator']
  },
  {
    market: 'SK', path: 'sk/sprievodca/aky-velky-menic-do-karavanu/index.html',
    title: /Menič do karavanu/, decision: /300, 1000 alebo 2000 W/, section: 'vyber-menic',
    mustContain: ['300 W', '1000 W', '2000 W', 'BMS', 'čistú sínus', '1,25', '111 A', '185 A', '/sk/#kalkulator']
  },
  {
    market: 'PL', path: 'pl/poradnik/jak-dobrac-przetwornice-do-kampera/index.html',
    title: /Przetwornica do kampera/, decision: /300, 1000 czy 2000 W/, section: 'wybor-przetwornicy',
    mustContain: ['300 W', '1000 W', '2000 W', 'BMS', 'czystą sinus', '1,25', '111 A', '185 A', '/pl/#kalkulator']
  },
  {
    market: 'HU', path: 'hu/utmutatok/lakoauto-inverter-kivalasztasa/index.html',
    title: /Lakóautó inverter/, decision: /300, 1000 vagy 2000 W/, section: 'inverter-valasztas',
    mustContain: ['300 W', '1000 W', '2000 W', 'BMS', 'tiszta szinus', '1,25', '111 A', '185 A', '/hu/#kalkulator']
  }
];

for (const page of pages) {
  test(`${page.market} inverter guide keeps buyer intent and DC safety guards`, async () => {
    const html = await readFile(page.path, 'utf8');
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const h1 = html.match(/<h1>([^<]+)<\/h1>/)?.[1];

    assert.ok(title, 'title must exist');
    assert.equal(h1, title, 'H1 should match title');
    assert.match(title, page.title);
    assert.match(html, page.decision);
    assert.match(html, new RegExp(`id=["']${page.section}["']`));
    assert.ok(html.includes('"dateModified":"2026-09-11"'), 'Article dateModified must be current');

    for (const token of page.mustContain) {
      assert.ok(html.toLocaleLowerCase().includes(token.toLocaleLowerCase()), `missing required token: ${token}`);
    }
  });
}
