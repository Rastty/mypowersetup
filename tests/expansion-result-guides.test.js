import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { expansionResultGuides } from "../src/expansion-result-guides.js";

const PREFIX = Object.freeze({ pt: "/pt/guias/", ro: "/ro/ghiduri/", si: "/si/vodici/" });

for (const market of Object.keys(PREFIX)) {
  test(`${market} result offers three localized, live guide next steps`, () => {
    const config = expansionResultGuides(market);
    assert.ok(config.title.length > 10);
    assert.ok(config.intro.length > 20);
    assert.deepEqual(config.links.map((item) => item.topic), ["battery", "solar", "system"]);
    assert.equal(new Set(config.links.map((item) => item.href)).size, 3);
    for (const item of config.links) {
      assert.ok(item.href.startsWith(PREFIX[market]));
      const file = new URL(`..${item.href}index.html`, import.meta.url);
      const html = readFileSync(file, "utf8");
      assert.doesNotMatch(html, /noindex/i);
      assert.ok(html.includes(`rel="canonical" href="https://mypowersetup.com${item.href}"`));
    }
  });
}

test("result guide config fails closed for unsupported markets", () => {
  assert.throws(() => expansionResultGuides("de"), /MARKET_INVALID/);
});
