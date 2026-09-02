import test from "node:test";
import assert from "node:assert/strict";
import { moduleScriptSources } from "../src/production-live-audit.js";

test("module asset comparison keeps versioned production entrypoints", () => {
  const html = `<!doctype html><script type="module" src="/src/app.js?v=one"></script><script src="/legacy.js"></script><script src='/src/analytics.js' type='module'></script>`;
  assert.deepEqual(moduleScriptSources(html), ["/src/app.js?v=one", "/src/analytics.js"]);
});

test("module asset extraction is safe for missing markup", () => {
  assert.deepEqual(moduleScriptSources(), []);
  assert.deepEqual(moduleScriptSources("<html></html>"), []);
});
