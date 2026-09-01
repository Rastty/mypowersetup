import test from "node:test";
import assert from "node:assert/strict";
import { SI_PRIVATE_CONTENT, getSloveniaPrivatePage, renderSloveniaPrivateContentPage } from "../src/private-content-si.js";
import { SI_MARKET_RESEARCH } from "../src/market-research-si.js";

test("Slovenia private foundation has four trust pages and eleven guides", () => {
  assert.equal(SI_PRIVATE_CONTENT.trust.length, 4);
  assert.equal(SI_PRIVATE_CONTENT.guides.length, 11);
  assert.equal(SI_MARKET_RESEARCH.priorityIntents.length, 10);
});

test("every Slovenia private content route stays noindex and private", () => {
  const routes = [
    "/si/vodici/",
    ...SI_PRIVATE_CONTENT.trust.map((page) => `/si/${page.slug}/`),
    ...SI_PRIVATE_CONTENT.guides.map((page) => `/si/vodici/${page.slug}/`),
  ];
  for (const route of routes) {
    const html = renderSloveniaPrivateContentPage(route);
    assert.match(html, /<html lang="sl">/);
    assert.match(html, /noindex,nofollow,noarchive/);
    assert.match(html, /Zasebna različica v preverjanju za Slovenijo/);
    assert.doesNotMatch(html, /rel="canonical"/);
    assert.doesNotMatch(html, /hreflang=/);
  }
});

test("Slovenia guides link back to the calculator and to related guides", () => {
  for (const guide of SI_PRIVATE_CONTENT.guides) {
    const html = renderSloveniaPrivateContentPage(`/si/vodici/${guide.slug}/`);
    assert.match(html, /href="\/si\/#calculator-preview"/);
    assert.match(html, /Drugi vodniki/);
    assert.match(html, /Odpri kalkulator/);
  }
});

test("Slovenia methodology preserves technical assumptions", () => {
  const html = renderSloveniaPrivateContentPage("/si/metodologija/");
  assert.match(html, /15 %/);
  assert.match(html, /75 %/);
  assert.match(html, /MPPT/);
  assert.match(html, /LiFePO₄|baterij/);
});

test("Slovenia affiliate page is fail closed", () => {
  const html = renderSloveniaPrivateContentPage("/si/affiliate/");
  assert.match(html, /točna stran izdelka/);
  assert.match(html, /Fail closed/);
  assert.match(html, /dostava/);
});

test("Slovenia research does not claim zero competition", () => {
  const text = JSON.stringify(SI_MARKET_RESEARCH);
  assert.match(text, /fragmented competition|not an absence of competition|did not surface a strong Slovenian calculator-first competitor/i);
  assert.doesNotMatch(text, /zero competition/i);
});

test("unknown Slovenia private routes fail closed", () => {
  assert.equal(getSloveniaPrivatePage("/si/ne-obstaja/"), null);
  assert.equal(renderSloveniaPrivateContentPage("/si/ne-obstaja/"), null);
});
