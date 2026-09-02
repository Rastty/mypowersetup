import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");

test("PT, RO and SI recommendation gaps are explicit instead of silently empty", () => {
  assert.doesNotMatch(source, /if \(!products\.length\) return/);
  assert.ok((source.match(/renderNoVerifiedProducts\(\)/g) || []).length >= 7);
  assert.match(source, /data-recommendation-empty/);
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
