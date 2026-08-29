import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const path = "pl/poradnik/power-station-czy-stala-instalacja-kamper/index.html";

test("Polish power station guide is locally written and conversion-ready", async () => {
  const html = await readFile(path, "utf8");
  assert.match(html, /<html lang="pl">/);
  assert.match(html, /rel="canonical" href="https:\/\/mypowersetup\.com\/pl\/poradnik\/power-station-czy-stala-instalacja-kamper\/"/);
  assert.match(html, /Polski scenariusz/);
  assert.match(html, /href="\/pl\/#kalkulator"/);
  assert.match(html, /schemat-instalacji-elektrycznej-kampera/);
  assert.match(html, /12-v-czy-24-v-kamper/);
  assert.match(html, /pojemnosc-akumulatora-do-kampera/);
});

test("Polish power station guide contains no known Czech localization leaks", async () => {
  const html = await readFile(path, "utf8");
  for (const leak of ["dává smysl", "sečti", "jak velký", "pokračuj", "pevné práce", "patří kvalifikované"]) {
    assert.equal(html.toLowerCase().includes(leak), false, `Czech leak: ${leak}`);
  }
  assert.equal(html.includes("/pl/poradnik/jak-dobrac-akumulator-do-kampera/"), false);
});
