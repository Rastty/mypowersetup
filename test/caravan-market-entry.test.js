import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getUsageProfiles } from "../src/usage-profiles.js";

for (const locale of ["sk", "pl"]) {
  test(`${locale} caravan homepage uses its own localized 4-scenario entry and shared safe builder`, () => {
    const html = readFileSync(new URL(`../${locale}/index.html`, import.meta.url), "utf8");
    const ids = [...html.matchAll(/data-caravan-profile="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(ids, getUsageProfiles(locale).map(({ id }) => id));
    assert.match(html, /caravan-entry\.css\?v=20261121-2/);
    assert.match(html, /caravan-entry\.js\?v=20261121-2/);
    assert.match(html, new RegExp(`/src/app-${locale}\\.js\\?v=20261122-bms-alternatives1`));
    assert.ok(html.indexOf(`/src/app-${locale}.js`) < html.indexOf("/src/caravan-entry.js"),
      "canonical buyer flow must mount before hero shortcuts");
  });
}
