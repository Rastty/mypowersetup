import test from "node:test";
import assert from "node:assert/strict";
import { polishExpansionPublicationCopy } from "../src/expansion-publication.js";

test("Portugal removes literal fail-closed wording from public copy", () => {
  const html = "<h2>Falhar fechado</h2>";
  const polished = polishExpansionPublicationCopy(html, "pt");
  assert.match(polished, /Sem validação, sem recomendação/);
  assert.doesNotMatch(polished, /Falhar fechado/);
});

test("Slovenia replaces untranslated affiliate and fail-closed wording", () => {
  const html = "<h1>Affiliate politika</h1><p>affiliate povezave</p><h2>Fail closed</h2>";
  const polished = polishExpansionPublicationCopy(html, "si");
  assert.match(polished, /Politika partnerskih povezav/);
  assert.match(polished, /partnerske povezave/);
  assert.match(polished, /Brez preverjanja ni priporočila/);
  assert.doesNotMatch(polished, /Affiliate politika|Fail closed/);
});

test("Romania fixes the highest-confidence awkward phrases", () => {
  const html = "<title>Ce capacitate de baterie are nevoie o autorulotă?</title><h2>Calculul primul</h2><p>Dimensionează solarul</p><h2>Fail closed</h2>";
  const polished = polishExpansionPublicationCopy(html, "ro");
  assert.match(polished, /Ce capacitate trebuie să aibă bateria unei autorulote\?/);
  assert.match(polished, /Calculul înaintea produsului/);
  assert.match(polished, /Dimensionează sistemul solar/);
  assert.match(polished, /Fără validare, fără recomandare/);
});

test("unknown markets are left unchanged", () => {
  assert.equal(polishExpansionPublicationCopy("plain", "xx"), "plain");
});
