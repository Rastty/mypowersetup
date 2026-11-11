import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");

test("PT, RO and SI recommendation gaps are explicit instead of silently empty", () => {
  assert.doesNotMatch(source, /if \(!products\.length\) return/);
  assert.ok((source.match(/renderNoVerifiedProducts\(\)/g) || []).length >= 4);
  assert.match(source, /data-recommendation-empty/);
  // A failed catalog read is not evidence the merchant has no matching SKU.
  assert.equal((source.match(/renderCatalogUnavailable\(\)/g) || []).length, 4);
  assert.match(source, /data-recommendation-unavailable/);
  assert.match(source, /Nenhum produto verificado/);
  assert.match(source, /Niciun produs verificat/);
  assert.match(source, /Noben preverjen izdelek/);
});

test("PT, RO and SI show an accessible loading state while recommendation modules load", () => {
  assert.match(source, /data-product-recommendations aria-live="polite"/);
  assert.match(source, /data-recommendation-loading/);
  assert.match(source, /Estamos a verificar produtos compatíveis/);
  assert.match(source, /Verificăm produsele compatibile/);
  assert.match(source, /Preverjamo združljive izdelke/);
});

test("Portugal distinguishes component matches from a missing full portable-system match", () => {
  assert.match(source, /noPortableFit/);
  assert.match(source, /coverage\.powerStation \? ""/);
  assert.match(source, /produtos abaixo cobrem partes da instalação por componentes/);
});

test("PT RO SI explicitly warn that a partial component list is not a complete purchasable system", () => {
  for (const phrase of [
    "A instalação por componentes ainda não está completa",
    "Instalația din componente nu este încă completă",
    "Sistem iz komponent še ni popoln",
  ]) assert.ok(source.includes(phrase), "missing localized partial component warning: " + phrase);

  assert.match(source, /const missing = routePriority\.coverage\?\.missing \|\| \[\]/);
  assert.match(source, /const componentGapNote = !sourceGap && !preferPortable && missing\.length/);
  assert.match(source, /data-component-gap-note/);
  assert.match(source, /labels\.componentGap\(missing\.map\(expansionCategoryLabel\)\.join\(", "\)\)/);
  assert.match(source, /\$\{priorityNote\}\$\{sourceNote\}\$\{componentGapNote\}\$\{routes\}/);
  assert.match(source, /escapeHtml\(labels\.componentGap\(/,
    "missing category names must be escaped before rendering");
  assert.match(source, /const priorityNote = preferPortable/, "a complete portable fallback keeps its own distinct warning");
});

test("partial feed failure renders only healthy offers and must not claim verified supply gaps", () => {
  assert.match(source, /const sourceNote = sourceGap \? renderPartialSourceNotice\(\) : ""/);
  assert.match(source, /data-recommendation-partial-source/);
  assert.match(source, /if \(sourceGap\) \{ trackCatalogUnavailable\(\); return priority; \}/);
  assert.doesNotMatch(source, /trackProductCoverage\(\{\}, calculation\)/);
});
