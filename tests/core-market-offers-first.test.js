import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

for (const market of ["sk", "pl"]) {
  test(`${market.toUpperCase()} shows verified shopping options directly after calculator results`, () => {
    const html = readFileSync(new URL(`../${market}/index.html`, import.meta.url), "utf8");
    const result = html.indexOf('id="result-next"');
    const products = html.indexOf('id="product-recommendations"');
    const setup = html.indexOf('id="existing-setup-check"');
    const sharing = html.indexOf('class="result-share-card"');
    const portable = html.indexOf('id="power-station-title"');
    assert.ok(result >= 0 && result < products, "products must follow the calculated result");
    assert.ok(products < setup && products < sharing && products < portable,
      "offers must precede optional reviews, sharing and portable education");
    assert.equal(html.match(/id="product-recommendations"/g)?.length, 1);
    assert.match(html.slice(products, setup), /id="package-variants"/);
    assert.match(html.slice(products, setup), /class="affiliate-note"/);
  });
}

test("HU shows verified offers before existing-setup checks and result sharing", () => {
  for (const file of ["hu/index.html", "src/page-hu.js"]) {
    const html = readFileSync(new URL("../" + file, import.meta.url), "utf8");
    const result = html.indexOf('id="result-next"');
    const products = html.indexOf('id="product-recommendations"');
    const setup = html.indexOf('id="existing-setup-check"');
    const share = html.indexOf('class="result-share-card"');
    assert.ok(result >= 0 && result < products);
    assert.ok(products < setup && setup < share,
      file + ": verified offers must precede optional existing-system review and sharing");
    assert.equal(html.match(/id="product-recommendations"/g)?.length, 1);
  }
});
