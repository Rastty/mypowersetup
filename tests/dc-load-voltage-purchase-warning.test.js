import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("core-market 24V DC-load caution appears before affiliate cards, even without matching offers", async () => {
  for (const name of ["app.js", "app-sk.js", "app-pl.js", "app-hu-browser.js"]) {
    const source = await readFile(new URL(`../src/${name}`, import.meta.url), "utf8");
    assert.match(source, /const voltageNotice = result\.dcLoadVoltageWarning/);
    assert.match(source, /voltageNotice \+ \(featured\.length/);
    assert.match(source, /class="dc-voltage-warning" role="note"/);
    assert.match(source, /escapeHtml\(result\.dcLoadVoltageWarning\)/);
  }
  const hungarianBrowser = await readFile(new URL("../src/app-hu-browser.js", import.meta.url), "utf8");
  assert.match(hungarianBrowser, /function renderProducts\(output\) \{\s*const result = output\.result;/);
});

test("PT/RO/SI render engine warning immediately after verdict and before featured purchase links", async () => {
  const source = await readFile(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");
  const result = source.slice(source.indexOf('result.innerHTML = `<p class="result-summary">'));
  assert.ok(result.indexOf("${voltageNotice}") < result.indexOf("${warnings}"));
  assert.ok(result.indexOf("${warnings}") < result.indexOf('data-featured-products hidden'));
  assert.match(source, /escapeHtml\(value\.dcLoadVoltageWarning\)/);
  assert.match(source, /class="dc-voltage-warning" role="note"/);
  assert.ok(result.indexOf('data-featured-products hidden') < result.indexOf('<div class="result-grid">'));
});

test("the 24V DC converter caution is visible with the new 7-market stylesheet", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(css, /\.dc-voltage-warning \{[^}]*border: 2px solid/);
  assert.match(css, /\.dc-voltage-warning \{[^}]*line-height: 1\.55/);
});
