import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("next localization playbook keeps new markets private and fail-closed", async () => {
  const text = await readFile("docs/NEXT_LOCALIZATION_PLAYBOOK.md", "utf8");
  assert.match(text, /private\/noindex/);
  assert.match(text, /Do not add canonical, hreflang, sitemap, IndexNow/);
  assert.match(text, /Affiliate links remain disabled/);
  assert.match(text, /local RV\/camper terminology/);
  assert.match(text, /Mobile smoke at 390x844/);
  assert.match(text, /Do not use unverified scraping/);
});
