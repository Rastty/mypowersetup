import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("CamperTeam LiFePO4 draft uses the same conservative usable-capacity assumption as the calculator", () => {
  const draft = readFileSync(new URL("../docs/community/PL_CAMPERTEAM_REPLY_DRAFTS_2026-08-31.md", import.meta.url), "utf8");
  assert.match(draft, /około 80% pojemności użytecznej/);
  assert.match(draft, /2,87 kWh/);
  assert.doesNotMatch(draft, /około 90%/);
});
