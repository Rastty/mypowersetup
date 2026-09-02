import test from "node:test";
import assert from "node:assert/strict";
import { renderPortugalPrivateContentPage } from "../src/private-content-pt.js";
import { renderRomaniaPrivateContentPage } from "../src/private-content-ro.js";
import { renderSloveniaPrivateContentPage } from "../src/private-content-si.js";

const cases = [
  ["pt", renderPortugalPrivateContentPage, "/pt/guias/capacidade-bateria-autocaravana/", /Abrir calculadora e ver produtos/],
  ["ro", renderRomaniaPrivateContentPage, "/ro/ghiduri/capacitate-baterie-autorulota/", /Deschide calculatorul și vezi produsele/],
  ["si", renderSloveniaPrivateContentPage, "/si/vodici/kapaciteta-baterije-avtodom/", /Odpri kalkulator in preveri izdelke/],
];

for (const [market, render, route, action] of cases) {
  test(`${market} guide turns calculator intent into a verified-product journey`, () => {
    const html = render(route);
    assert.match(html, /data-guide-conversion-cta/);
    assert.match(html, action);
    assert.match(html, /href="\/(?:pt|ro|si)\/#calculator-preview"/);
    assert.match(html, /gratuit|brezplačen/);
    assert.match(html, /sem registo|fără înregistrare|brez registracije/);
  });
}
