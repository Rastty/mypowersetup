import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { renderExpansionProductMedia, safeExpansionProductImageUrl } from "../src/expansion-product-media.js";

test("product image cards accept only actual merchant CDN image paths", () => {
  const shopify = "https://cdn.shopify.com/s/files/1/123/products/battery.webp?v=123&width=480";
  const oxe = "https://www.oxe.cz/galeria/produkty/big/2022/01/21/oxe-s400.jpg";
  assert.equal(safeExpansionProductImageUrl(shopify), shopify);
  assert.equal(safeExpansionProductImageUrl(oxe), oxe);
  assert.match(renderExpansionProductMedia({ imageUrl: shopify }), /width="320" height="200" loading="lazy" decoding="async"/);
  assert.match(renderExpansionProductMedia({ imageUrl: shopify }), /v=123&amp;width=480/);
  assert.match(renderExpansionProductMedia({ imageUrl: oxe }), /alt=""/);

  for (const imageUrl of [
    "http://cdn.shopify.com/s/files/1/123/battery.webp",
    "javascript:alert(1)",
    "data:image/svg+xml;base64,PHN2Zz4=",
    "https://cdn.shopify.com.evil.example/s/files/1/123/battery.webp",
    "https://other.example/s/files/1/123/battery.webp",
    "https://cdn.shopify.com/tracking/pixel.png",
    "https://cdn.shopify.com/s/files/1/123/interactive.svg",
    "https://user:password@cdn.shopify.com/s/files/1/123/battery.webp",
    "https://cdn.shopify.com:8443/s/files/1/123/battery.webp",
    "https://cdn.shopify.com/s/files/1/123/battery.webp#tracker",
    null,
  ]) {
    assert.equal(safeExpansionProductImageUrl(imageUrl), null, `must reject ${imageUrl}`);
    assert.equal(renderExpansionProductMedia({ imageUrl }), "");
  }
});

test("every committed PT RO SI merchant photo is safe to display", async () => {
  for (const market of ["pt", "ro", "si"]) {
    const catalog = JSON.parse(await readFile(new URL(`../data/products-${market}.json`, import.meta.url), "utf8"));
    const images = catalog.products.map((product) => product.imageUrl).filter(Boolean);
    assert.ok(images.length > 0, `${market}: no source images`);
    for (const imageUrl of images) assert.ok(safeExpansionProductImageUrl(imageUrl), `${market}: unexpected image host ${imageUrl}`);
  }
});

test("public calculators wire optional real product images without changing affiliate CTAs", async () => {
  const browser = await readFile(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(browser, /renderExpansionProductMedia\(item\)/);
  assert.match(browser, /expansion-product-media\.js\?v=20261117-product-media1/);
  assert.match(css, /\.expansion-product-media img \{[^}]*object-fit: contain/);
  assert.match(browser, /data-affiliate-product/);
});
