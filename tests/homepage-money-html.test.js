import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { coreMoneyLinks } from "../src/homepage-money-routing.js";
import {
  HOMEPAGE_MONEY_GENERATED_END,
  HOMEPAGE_MONEY_GENERATED_START,
  syncHomepageMoneyLinksHtml,
} from "../src/homepage-money-html.js";

const TARGETS = [
  ["cs", "index.html"],
  ["sk", "sk/index.html"],
  ["pl", "pl/index.html"],
  ["hu", "hu/index.html"],
];

function occurrences(haystack, needle) {
  return String(haystack).split(needle).length - 1;
}

test("static transform makes all six core money guides crawlable from each homepage", async () => {
  for (const [lang, path] of TARGETS) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    const transformed = syncHomepageMoneyLinksHtml(source, { lang });
    const links = coreMoneyLinks(lang);

    assert.equal(links.length, 6, `${lang} route source`);
    assert.equal(occurrences(transformed, HOMEPAGE_MONEY_GENERATED_START), 1, `${lang} generated block start`);
    assert.equal(occurrences(transformed, HOMEPAGE_MONEY_GENERATED_END), 1, `${lang} generated block end`);
    for (const item of links) {
      assert.equal(occurrences(transformed, `href="${item.href}"`), 1, `${lang} ${item.href}`);
    }
    assert.equal(syncHomepageMoneyLinksHtml(transformed, { lang }), transformed, `${lang} idempotent`);
  }
});

test("static transform preserves editorial guide cards and fails closed without the homepage grid", () => {
  const html = `<section class="guide-preview"><div class="guide-preview-grid"><a href="/pruvodce/agm-vs-lifepo4/"><h3>AGM vs LiFePO4</h3></a></div></section>`;
  const transformed = syncHomepageMoneyLinksHtml(html, { lang: "cs" });
  assert.match(transformed, /\/pruvodce\/agm-vs-lifepo4\//);
  assert.equal(occurrences(transformed, "data-money-guide"), 6);

  const noGrid = "<main><h1>Other page</h1></main>";
  assert.equal(syncHomepageMoneyLinksHtml(noGrid, { lang: "cs" }), noGrid);
  assert.equal(syncHomepageMoneyLinksHtml(html, { lang: "pt" }), html);
});
