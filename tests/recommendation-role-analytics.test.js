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
    assert.match(source, /affiliate-analytics\.js\?v=20260902-product-impressions1/, application);
  }
});

test("every mature market explains recommended and alternative product roles visibly", async () => {
  const localizedLabels = {
    "app.js": ["Nejlepší shoda", "Kompatibilní alternativa"],
    "app-sk.js": ["Najlepšia zhoda", "Kompatibilná alternatíva"],
    "app-pl.js": ["Najlepsze dopasowanie", "Zgodna alternatywa"],
    "app-hu-browser.js": ["HU_UI_COPY.products.roles.recommended", "HU_UI_COPY.products.roles.alternative"],
  };

  for (const application of applications) {
    const source = await readFile(new URL(`../src/${application}`, import.meta.url), "utf8");
    assert.match(source, /class="product-recommendation-role is-/i, application);
    for (const label of localizedLabels[application]) assert.ok(source.includes(label), `${application}: ${label}`);
  }

  const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(styles, /\.product-recommendation-role\.is-recommended/);
});
