import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { scrollToCaravanStep } from "../src/caravan-result-scroll.js";

function mockRoot({ resultAvailable = true, calculatorAvailable = true } = {}) {
  const calls = [];
  const heading = resultAvailable ? { scrollIntoView: (options) => calls.push(["result", options]) } : null;
  const calculator = calculatorAvailable ? { scrollIntoView: (options) => calls.push(["calculator", options]) } : null;
  const queries = [];
  return {
    calls,
    queries,
    querySelector(selector) {
      queries.push(selector);
      return selector === ".result-step .result-heading" ? heading
        : selector === "#kalkulator" ? calculator : null;
    },
  };
}

test("computed caravan result scrolls to actual recommendations, not top of calculator", () => {
  const root = mockRoot();
  assert.equal(scrollToCaravanStep(3, { root, reduceMotion: false }), true);
  assert.deepEqual(root.calls, [["result", { behavior: "smooth", block: "start" }]]);
  assert.deepEqual(root.queries, [".result-step .result-heading"]);
});

test("earlier wizard steps continue to the calculator and never jump to buying", () => {
  for (const step of [1, 2]) {
    const root = mockRoot();
    assert.equal(scrollToCaravanStep(step, { root }), true);
    assert.equal(root.calls[0][0], "calculator");
    assert.deepEqual(root.queries, ["#kalkulator"]);
  }
});

test("missing result heading gracefully falls back and reduced-motion is respected", () => {
  const fallback = mockRoot({ resultAvailable: false });
  assert.equal(scrollToCaravanStep(3, { root: fallback, reduceMotion: true }), true);
  assert.deepEqual(fallback.calls, [["calculator", { behavior: "auto", block: "start" }]]);
  const absent = mockRoot({ resultAvailable: false, calculatorAvailable: false });
  assert.equal(scrollToCaravanStep(3, { root: absent }), false);
  assert.deepEqual(absent.calls, []);
});

test("every core market ships the new buyer-result navigation module with a fresh script version", async () => {
  for (const [htmlPath, appPath, appName] of [
    ["index.html", "src/app.js", "app.js"],
    ["sk/index.html", "src/app-sk.js", "app-sk.js"],
    ["pl/index.html", "src/app-pl.js", "app-pl.js"],
  ]) {
    const html = await readFile(new URL("../" + htmlPath, import.meta.url), "utf8");
    const app = await readFile(new URL("../" + appPath, import.meta.url), "utf8");
    assert.ok(html.includes("/src/" + appName + "?v=20261122-shore-mca1-result-scroll1-cz-mca1-superpack-cz1-orion-cz1-mppt-cz1-featured6"), htmlPath);
    assert.ok(app.includes('import { scrollToCaravanStep } from "./caravan-result-scroll.js?v=20261122-result-scroll1"'), appPath);
    assert.ok(app.includes("  scrollToCaravanStep(currentStep);"), appPath);
    assert.ok(!app.includes('document.querySelector("#kalkulator").scrollIntoView({ behavior: "smooth", block: "start" });'), appPath);
    assert.ok(html.indexOf('id="featured-recommendations"') < html.indexOf('id="result-next"'), htmlPath);
  }
});
