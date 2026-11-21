import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const WORKFLOWS = [
  ".github/workflows/sync-products.yml",
  ".github/workflows/sync-products-expansion-eu.yml",
];

test("all catalog-writing workflows share one serialized write queue and checkout latest main", async () => {
  for (const path of WORKFLOWS) {
    const yaml = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(yaml, /concurrency:\s*\n\s*group:\s*affiliate-catalog-write\s*\n\s*cancel-in-progress:\s*false/);
    assert.match(yaml, /uses:\s*actions\/checkout@v5\s*\n\s*with:\s*\n\s*ref:\s*main/);
    assert.match(yaml, /permissions:\s*\n\s*contents:\s*write/);
  }
});

test("catalog worker quarantines a failed CZ buyer feed without blocking independently checked markets", async () => {
  const yaml = await readFile(new URL("../.github/workflows/sync-products.yml", import.meta.url), "utf8");
  assert.match(yaml, /id:\s*cz_refresh\s*\n\s*continue-on-error:\s*true\s*\n\s*run:\s*node scripts\/sync-products\.mjs/);
  assert.match(yaml, /if:\s*steps\.cz_refresh\.outcome == 'failure'\s*\n\s*run:\s*\|[\s\S]*?git restore -- data\/products\.json data\/calculator-offers-cz\.json data\/dcdc-guide-offers-cz\.json data\/inverter-calculator-offers-cz\.json data\/solar-calculator-offers-cz\.json/);
  for (const label of [
    "Validate small, same-source CZ buyer catalog",
    "Validate small, same-source CZ DC-DC editorial offers",
    "Validate exact-SKU CZ inverter calculator offers",
    "Validate exact-SKU CZ solar calculator offers",
  ]) {
    assert.ok(yaml.includes(`- name: ${label}\n        if: steps.cz_refresh.outcome == 'success'\n        run:`), label);
  }
  const quarantine = yaml.indexOf("- name: Discard only CZ refresh outputs");
  const otherMarket = yaml.indexOf("node scripts/sync-products-sk.mjs");
  const commit = yaml.indexOf("- name: Commit refreshed catalog");
  const release = yaml.indexOf("- name: Prove the exact published buyer catalog");
  const failure = yaml.indexOf("- name: Report quarantined CZ merchant outage");
  assert.ok(quarantine > 0 && quarantine < otherMarket && otherMarket < commit && commit < release && release < failure);
  assert.match(yaml, /- name: Report quarantined CZ merchant outage[^]*?if: steps\.cz_refresh\.outcome == 'failure'[^]*?exit 1/);
  // The previously established hard-stop feed continuity guard is unchanged.
  const guard = await readFile(new URL("../src/cz-buyer-feed-continuity.js", import.meta.url), "utf8");
  assert.match(guard, /throw new Error\(`CZ_SOLARIMPORT_/);
});
