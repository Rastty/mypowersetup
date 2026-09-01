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
