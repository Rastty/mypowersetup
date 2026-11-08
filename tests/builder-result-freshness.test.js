import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bindBuilderResultInvalidation, invalidateBuilderResult } from "../src/builder-result-freshness.js";

const selectorsToClear = [
  "#result-grid", "#package-variants", "#recommendation-groups",
  "#result-reasons", "#consumption-breakdown", "#result-notes", "#system-diagram",
  "#installation-plan", "#charging-options", "#roof-fit", "#power-station-profile",
];
const textSelectors = ["#result-intro", "#result-verdict", "#result-product-count", "#result-share-status", "#print-generated-at"];

function fakeFixture(fresh = true) {
  const nodes = new Map();
  for (const selector of selectorsToClear) {
    nodes.set(selector, {
      children: ["old technical recommendation", { href: "https://ehub.cz/stale-affiliate" }],
      replaceChildren() { this.children = []; },
    });
  }
  for (const selector of textSelectors) nodes.set(selector, { textContent: "old calculated result" });
  for (const selector of ["#result-next", "#result-products-link"]) nodes.set(selector, { hidden: false });
  nodes.set(".existing-setup-output", {
    hidden: false, children: ["old upgrade"],
    replaceChildren() { this.children = []; },
  });
  const handlers = {};
  const form = {
    addEventListener(type, fn) { handlers[type] = fn; },
    emit(type, step) {
      handlers[type]?.({ target: { closest(selector) {
        assert.equal(selector, ".form-step");
        return { dataset: { step: String(step) } };
      } } });
    },
  };
  let hasResult = fresh;
  let discarded = 0;
  const resultStep = { querySelector(selector) { return nodes.get(selector) || null; } };
  const onInvalidate = () => { hasResult = false; discarded += 1; };
  const invalidate = bindBuilderResultInvalidation({ form, resultStep, hasResult: () => hasResult, onInvalidate });
  return { form, nodes, invalidate, get hasResult() { return hasResult; }, get discarded() { return discarded; } };
}

test("a changed Builder sizing input removes every old calculation, affiliate link, share status and upgrade", () => {
  for (const eventType of ["input", "change"]) {
    const fixture = fakeFixture();
    fixture.form.emit(eventType, 2);
    assert.equal(fixture.discarded, 1);
    assert.equal(fixture.hasResult, false);
    for (const selector of selectorsToClear) assert.deepEqual(fixture.nodes.get(selector).children, [], selector);
    for (const selector of textSelectors) assert.equal(fixture.nodes.get(selector).textContent, "", selector);
    assert.equal(fixture.nodes.get("#result-next").hidden, true);
    assert.equal(fixture.nodes.get("#result-products-link").hidden, true);
    assert.equal(fixture.nodes.get(".existing-setup-output").hidden, true);
    assert.deepEqual(fixture.nodes.get(".existing-setup-output").children, []);
    fixture.form.emit(eventType, 1);
    assert.equal(fixture.discarded, 1, "no extra cleanup after the first edit");
  }
});

test("a changed step-one battery/season choice invalidates the same previously computed purchase basket", () => {
  const fixture = fakeFixture();
  fixture.form.emit("change", 1);
  assert.equal(fixture.discarded, 1);
  assert.equal(fixture.nodes.get("#package-variants").children.length, 0);
});

test("editing independent existing-setup values on result step does not invalidate the calculated system", () => {
  const fixture = fakeFixture();
  fixture.form.emit("input", 3);
  fixture.form.emit("change", 3);
  assert.equal(fixture.discarded, 0);
  assert.equal(fixture.hasResult, true);
  assert.equal(fixture.nodes.get("#package-variants").children.length, 2);
});

test("initial, not-yet-computed forms and irrelevant events remain unchanged", () => {
  const fixture = fakeFixture(false);
  fixture.form.emit("input", 1);
  fixture.form.emit("change", 2);
  assert.equal(fixture.discarded, 0);
  assert.equal(fixture.nodes.get("#recommendation-groups").children.length, 2);
  assert.equal(invalidateBuilderResult({ resultStep: {}, hasResult: () => false }), false);
  assert.equal(invalidateBuilderResult({}), false);
});

test("usage profile programmatic updates are explicitly invalidated, and step three requires a fresh result", async () => {
  for (const [path, variable] of [
    ["src/app.js", "latestResult"], ["src/app-sk.js", "latestResult"],
    ["src/app-pl.js", "latestResult"], ["src/app-hu-browser.js", "latest"],
  ]) {
    const source = await readFile(new URL("../" + path, import.meta.url), "utf8");
    assert.match(source, /import \{ bindBuilderResultInvalidation \} from "\.\/builder-result-freshness\.js";/, path);
    assert.match(source, /const invalidateStaleResult = bindBuilderResultInvalidation\(/, path);
    assert.match(source, /onChange: \(\) => \{ update(?:Live)?Summary\(\); invalidateStaleResult\(\); \}/, path);
    assert.match(source, /resultStep: form\.querySelector\('\.form-step\[data-step="3"\]'\)/, path);
    assert.match(source, /history\.replaceState\(\{\}, "", `\$\{window\.location\.pathname\}#kalkulator`\)/, path);
    assert.ok(source.includes(`step === 3 && !${variable} ? 2 : step`), path);
    assert.match(source, /function (?:resetForm|bindNavigation)\(/, path);
    assert.match(source, /invalidateStaleResult\(\);/, path);
  }
});

test("all four core Builder pages serve the refreshed JS version, without changing supported markets", async () => {
  for (const [path, app] of [
    ["index.html", "app.js"], ["sk/index.html", "app-sk.js"],
    ["pl/index.html", "app-pl.js"], ["hu/index.html", "app-hu-browser.js"],
  ]) {
    const html = await readFile(new URL("../" + path, import.meta.url), "utf8");
    assert.ok(html.includes(`src="/src/${app}?v=20261108-fail-closed-builder2"`), path);
    assert.match(html, /class="form-step[^"]*" data-step="3"/, path);
    assert.match(html, /id="product-recommendations"/, path);
  }
});


test("every core Builder fails closed after a partially completed result render", async () => {
  for (const path of ["src/app.js", "src/app-sk.js", "src/app-pl.js", "src/app-hu-browser.js"]) {
    const source = await readFile(new URL("../" + path, import.meta.url), "utf8");
    const catchBlock = path.endsWith("app-hu-browser.js")
      ? source.slice(source.indexOf("function calculate(event)"), source.indexOf("function renderResult(output)"))
      : source.slice(source.indexOf("function handleSubmit(event)"), source.indexOf("function trackCalculatorStarted(source)"));
    assert.match(catchBlock, /renderResult\(/, path);
    // Reject any implementation that only clears the current error, leaving
    // old share URLs, an installation plan or purchase recommendations intact.
    assert.match(catchBlock, /\} catch \((?:error|failure)\) \{\s*\/\/[^\n]*\n\s*invalidateStaleResult\(\);/, path);
    assert.match(catchBlock, /history\.replaceState/, path);
  }
});

test("all output ids populated by each Builder are covered by the shared result invalidator", async () => {
  const selectors = [
    "#result-grid", "#package-variants", "#recommendation-groups",
    "#result-reasons", "#consumption-breakdown", "#result-notes",
    "#system-diagram", "#installation-plan", "#charging-options",
    "#roof-fit", "#power-station-profile", "#print-generated-at",
  ];
  const helper = await readFile(new URL("../src/builder-result-freshness.js", import.meta.url), "utf8");
  for (const id of selectors) assert.ok(helper.includes(id), `${id} must be cleared on edit and render failure`);
});
