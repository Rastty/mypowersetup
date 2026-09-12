import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { coreResultGuideItems, enhanceCoreResultGuides } from "../src/core-result-guides.js";

const CORE_MARKETS = [
  ["cs", "index.html", "/pruvodce/"],
  ["sk", "sk/index.html", "/sk/sprievodca/"],
  ["pl", "pl/index.html", "/pl/poradnik/"],
  ["hu", "hu/index.html", "/hu/utmutatok/"],
];
const TOPICS = ["battery", "solar", "mppt", "dcdc", "shore", "inverter"];

test("core calculator results map all six commercial components to local guides", async () => {
  for (const [lang, htmlPath, prefix] of CORE_MARKETS) {
    const items = coreResultGuideItems(lang);
    assert.equal(items.length, 6, `${lang} result guide count`);
    assert.deepEqual(items.map((item) => item.topic), TOPICS, `${lang} topic order`);
    assert.equal(new Set(items.map((item) => item.href)).size, 6, `${lang} unique guide destinations`);
    assert.ok(items.every((item) => item.href.startsWith(prefix)), `${lang} local-only destinations`);

    const html = await readFile(new URL(`../${htmlPath}`, import.meta.url), "utf8");
    assert.match(html, /id="result-grid"/, `${lang} result anchor exists`);
  }

  assert.deepEqual(coreResultGuideItems("pt"), []);
  assert.deepEqual(coreResultGuideItems("ro"), []);
  assert.deepEqual(coreResultGuideItems("sl"), []);
});

test("result guide enhancer inserts one measurable component-guide block", () => {
  let inserted = null;
  let enhanced = false;
  const resultGrid = {
    insertAdjacentElement(position, node) {
      inserted = { position, node };
      enhanced = true;
    },
  };
  const root = {
    documentElement: { lang: "cs" },
    querySelector(selector) {
      if (selector === "[data-core-result-guides]") return enhanced ? inserted?.node : null;
      if (selector === "#result-grid") return resultGrid;
      return null;
    },
    createElement(tag) {
      assert.equal(tag, "section");
      return {
        className: "",
        dataset: {},
        attributes: new Map(),
        innerHTML: "",
        setAttribute(name, value) { this.attributes.set(name, value); },
      };
    },
  };

  assert.equal(enhanceCoreResultGuides({ root, lang: "cs" }), true);
  assert.equal(inserted.position, "afterend");
  assert.equal(inserted.node.dataset.coreResultGuides, "");
  assert.equal(inserted.node.attributes.get("aria-labelledby"), "core-result-guides-title");
  assert.equal((inserted.node.innerHTML.match(/data-component-guide/g) || []).length, 6);
  assert.equal((inserted.node.innerHTML.match(/data-result-guide-topic=/g) || []).length, 6);
  assert.match(inserted.node.innerHTML, /\/pruvodce\/jak-vybrat-dc-dc-nabijecku\//);
  assert.match(inserted.node.innerHTML, /data-topic="shore"/);

  assert.equal(enhanceCoreResultGuides({ root, lang: "cs" }), false);
});

test("result guide enhancer fails closed outside core calculators", () => {
  const root = {
    documentElement: { lang: "pt" },
    querySelector() { return null; },
    createElement() { throw new Error("must not create markup"); },
  };
  assert.equal(enhanceCoreResultGuides({ root, lang: "pt" }), false);
});
