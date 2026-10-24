import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");

test("changing any expansion sizing answer clears prior result, share URL and purchase CTAs", () => {
  const start = source.indexOf("function invalidateResult() {");
  const end = source.indexOf("\nasync function calculateAndRender", start);
  assert.ok(start >= 0 && end > start, "result invalidation must be a concrete function");
  const fn = source.slice(start, end);
  const actual = vm.runInNewContext(`
    let resultRevision = 4;
    let latestResult = { batteryWh: 1200 };
    let latestShareUrl = "https://mypowersetup.com/ro/?loads=fridge";
    let currentStep = 3;
    let removed = 0;
    const result = { replaceChildren() { removed += 1; } };
    function showStep(next) { currentStep = next; }
    ${fn}
    invalidateResult();
    ({ resultRevision, latestResult, latestShareUrl, currentStep, removed });
  `);
  assert.equal(actual.resultRevision, 5);
  assert.equal(actual.latestResult, null);
  assert.equal(actual.latestShareUrl, "");
  assert.equal(actual.currentStep, 2);
  assert.equal(actual.removed, 1);
  assert.match(source, /form\.addEventListener\("change", \(\) => \{\s*invalidateResult\(\);/);
  assert.match(source, /form\.addEventListener\("input", \(\) => \{\s*invalidateResult\(\);/);
  assert.match(source, /async function calculateAndRender\(\{ source \}\) \{\s*invalidateResult\(\);/);
});

test("each lazy market catalog rejects stale asynchronous responses before showing links or analytics", () => {
  for (const [market, next] of [
    ["Portugal", "Slovenia"], ["Slovenia", "Romania"], ["Romania", null],
  ]) {
    const start = source.indexOf(`async function render${market}Products(calculation, revision) {`);
    const end = next
      ? source.indexOf(`async function render${next}Products`, start)
      : source.indexOf("\nfunction trackProductCoverage", start);
    assert.ok(start >= 0 && end > start, `${market} function exists`);
    const body = source.slice(start, end);
    const guard = "if (revision !== resultRevision || !target.isConnected) return;";
    assert.equal(body.split(guard).length - 1, 2, `${market} guards success and failure paths`);
    assert.ok(body.indexOf(guard) < body.indexOf("trackProductCoverage("), `${market} guard precedes affiliate coverage telemetry`);
    assert.match(body, /const catalog = await load\w+ProductCatalog\(\);\s*if \(revision !== resultRevision/);
  }
  for (const market of ["Portugal", "Slovenia", "Romania"]) {
    assert.ok(source.includes(`await render${market}Products(calculation, revision)`));
  }
});
