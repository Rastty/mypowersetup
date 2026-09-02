import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const applications = ["app.js", "app-sk.js", "app-pl.js", "app-hu-browser.js"];

test("every mature market measures recommendation role on package and product-card clicks", async () => {
  for (const application of applications) {
    const source = await readFile(new URL(`../src/${application}`, import.meta.url), "utf8");
    assert.match(source, /data-source="package"[^>]*data-recommendation-role=/, application);
    assert.match(source, /data-source="product-card"[^>]*data-recommendation-role=/, application);
    assert.match(source, /packageId === "economy" \? "budget" : packageId/, application);
    assert.match(source, /affiliate-analytics\.js\?v=20260902-visible-impressions1/, application);
  }
});
