import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const APPS = Object.freeze([
  ["app.js", "cz"],
  ["app-sk.js", "sk"],
  ["app-pl.js", "pl"],
  ["app-hu-browser.js", "hu"],
]);

test("CZ SK PL HU product-card and package links use shared Awin attribution", async () => {
  for (const [file, market] of APPS) {
    const source = await readFile(new URL(`../src/${file}`, import.meta.url), "utf8");
    assert.match(source, /import \{ decorateAwinAffiliateUrl \} from "\.\/awin-attribution\.js";/, file);
    assert.match(source, new RegExp(`market: "${market}"`), file);
    assert.match(source, /attributedAwinUrl\(product, [^,]+, [^,]+, "package"\)/, `${file}: package attribution missing`);
    assert.match(source, /attributedAwinUrl\(product, [^,]+, [^,]+, "product-card"\)/, `${file}: product-card attribution missing`);
    assert.match(source, /data-affiliate-click/, file);
    assert.match(source, /data-recommendation-role=/, file);
    assert.match(source, /data-category=/, file);
    assert.match(source, /data-merchant=/, file);
  }
});
