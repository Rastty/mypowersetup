import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pages = [
  {
    market: 'CZ', type: 'MPPT', path: 'pruvodce/jak-vybrat-mppt-regulator/index.html',
    title: /MPPT regulátor pro karavan/, decision: /20, 30 nebo 40 A/, section: 'vyber-mppt',
    mustContain: ['Voc', 'Isc', '20 A', '30 A', '40 A', '/#kalkulator']
  },
  {
    market: 'SK', type: 'MPPT', path: 'sk/sprievodca/ako-vybrat-mppt-regulator/index.html',
    title: /MPPT regulátor do karavanu/, decision: /20, 30 alebo 40 A/, section: 'vyber-mppt',
    mustContain: ['Voc', 'Isc', '20 A', '30 A', '40 A', '/sk/#kalkulator']
  },
  {
    market: 'PL', type: 'MPPT', path: 'pl/poradnik/jak-dobrac-regulator-mppt/index.html',
    title: /Regulator MPPT do kampera/, decision: /20, 30 czy 40 A/, section: 'wybor-mppt',
    mustContain: ['Voc', 'Isc', '20 A', '30 A', '40 A', '/pl/#kalkulator']
  },
  {
    market: 'HU', type: 'MPPT', path: 'hu/utmutatok/mppt-szabalyozo-kivalasztasa/index.html',
    title: /MPPT szabályozó lakóautóhoz/, decision: /20, 30 vagy 40 A/, section: 'mppt-valasztas',
    mustContain: ['Voc', 'Isc', '20 A', '30 A', '40 A', '/hu/#kalkulator']
  },
  {
    market: 'CZ', type: 'DC-DC', path: 'pruvodce/jak-vybrat-dc-dc-nabijecku/index.html',
    title: /DC–DC nabíječka do karavanu/, decision: /20, 30 nebo 50 A/, section: 'vyber-dcdc',
    mustContain: ['BMS', 'alternátor', 'kabel', 'pojist', '20 A', '30 A', '50 A', '/#kalkulator']
  },
  {
    market: 'SK', type: 'DC-DC', path: 'sk/sprievodca/ako-vybrat-dc-dc-nabijacku/index.html',
    title: /DC–DC nabíjačka do karavanu/, decision: /20, 30 alebo 50 A/, section: 'vyber-dcdc',
    mustContain: ['BMS', 'alternátor', 'kábel', 'poist', '20 A', '30 A', '50 A', '/sk/#kalkulator']
  },
  {
    market: 'PL', type: 'DC-DC', path: 'pl/poradnik/jak-dobrac-ladowarke-dc-dc/index.html',
    title: /Ładowarka DC–DC do kampera/, decision: /20, 30 czy 50 A/, section: 'wybor-dcdc',
    mustContain: ['BMS', 'alternator', 'przewod', 'bezpiecz', '20 A', '30 A', '50 A', '/pl/#kalkulator']
  },
  {
    market: 'HU', type: 'DC-DC', path: 'hu/utmutatok/dc-dc-tolto-kivalasztasa/index.html',
    title: /DC–DC töltő lakóautóhoz/, decision: /20, 30 vagy 50 A/, section: 'dcdc-valasztas',
    mustContain: ['BMS', 'alternátor', 'vezeték', 'biztosít', '20 A', '30 A', '50 A', '/hu/#kalkulator']
  }
];

for (const page of pages) {
  test(`${page.market} ${page.type} guide keeps buyer intent and technical guards`, async () => {
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
