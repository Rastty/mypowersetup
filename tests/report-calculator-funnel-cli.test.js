import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const script = fileURLToPath(new URL("../scripts/report-calculator-funnel.mjs", import.meta.url));

test("unavailable GA4 evidence fails closed rather than printing a fake zero-click funnel", () => {
  const dir = mkdtempSync(join(tmpdir(), "mps-ga4-funnel-"));
  try {
    const input = join(dir, "unavailable.json");
    writeFileSync(input, JSON.stringify({ status: "route_dimensions_missing", events: [] }));
    const result = spawnSync(process.execPath, [script, input], { encoding: "utf8" });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Calculator funnel evidence unavailable: route_dimensions_missing/);
    assert.equal(result.stdout, "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
