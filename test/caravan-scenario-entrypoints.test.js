import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getUsageProfiles } from "../src/usage-profiles.js";

test("CZ caravan hero shortcuts map one-to-one to supported editable usage profiles", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const ids = [...html.matchAll(/data-caravan-profile="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(ids, ["weekend", "family", "work", "comfort"]);
  assert.deepEqual(ids, getUsageProfiles("cs").map((profile) => profile.id));
  assert.match(html, /href="#kalkulator" data-caravan-profile="weekend"/);
  assert.match(html, /id="usage-profiles"/);
  assert.match(html, /id="featured-recommendations"/);
});

test("hero shortcut goes through editable profile selection, not direct calculation", () => {
  const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const handler = app.slice(app.indexOf("function bindCaravanEntry()"), app.indexOf("function bindNavigation()"));
  assert.match(handler, /showStep\(2\)/);
  assert.match(handler, /preset\.click\(\)/);
  assert.doesNotMatch(handler, /calculateSetup|renderProductRecommendations|handleSubmit/);
  assert.match(app, /bindCaravanEntry\(\)/);
});
