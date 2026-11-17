import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const css = readFileSync(new URL("styles.css", root), "utf8");

test("PT SI and RO editorial pages share a scoped readable layout, without restyling calculators", () => {
  assert.match(css, /body:has\(> :is\(main\.article, main\.content-page\)\) > \.site-header/);
  assert.match(css, /width: min\(920px, calc\(100% - 32px\)\)/);
  assert.match(css, /body:has\(> :is\(main\.article, main\.content-page\)\) > footer/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*main\.content-page/);

  for (const [market, guide] of [
    ["pt", "pt/guias/sistema-eletrico-completo-autocaravana/index.html"],
    ["si", "si/vodici/elektricni-sistem-avtodom/index.html"],
    ["ro", "ro/ghiduri/sistem-electric-complet-autorulota/index.html"],
  ]) {
    const html = readFileSync(new URL(guide, root), "utf8");
    assert.match(html, /<link rel="stylesheet" href="\/styles\.css">/, market);
    assert.match(html, /<header class="site-header">/, market);
    assert.match(html, /<main class="(?:article|content-page)">/, market);
  }
  for (const home of ["pt/index.html", "si/index.html", "ro/index.html"]) {
    const html = readFileSync(new URL(home, root), "utf8");
    assert.doesNotMatch(html, /<main class="(?:article|content-page)">/, home);
  }
});
