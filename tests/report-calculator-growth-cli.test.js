import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const script = fileURLToPath(new URL("../scripts/report-calculator-growth.mjs", import.meta.url));

function runGrowth(gsc, ga4, indexing) {
  const dir = mkdtempSync(join(tmpdir(), "mps-growth-evidence-"));
  try {
    const gscFile = join(dir, "gsc.json");
    const ga4File = join(dir, "ga4.json");
    writeFileSync(gscFile, JSON.stringify(gsc));
    writeFileSync(ga4File, JSON.stringify(ga4));
    const indexingFile = join(dir, "indexing.json");
    if (indexing !== undefined) writeFileSync(indexingFile, JSON.stringify(indexing));
    return spawnSync(process.execPath, [script, gscFile, ga4File, ...(indexing !== undefined ? [indexingFile] : [])], {
      encoding: "utf8",
      timeout: 10000,
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("growth prioritization rejects unavailable GSC or GA4 instead of inventing zero evidence", () => {
  const readyGsc = { status: "ready", searchAnalytics: [], pageTotals: [], indexing: [] };
  const readyGa4 = { status: "ready", customDimensions: { ready: true }, events: [] };
  for (const [gsc, ga4, reason] of [
    [{ status: "missing-google-auth", searchAnalytics: [] }, readyGa4, "gsc:missing-google-auth"],
    [{ searchAnalytics: [], pageTotals: [] }, readyGa4, "gsc:status_missing"],
    [{ status: null, searchAnalytics: [] }, readyGa4, "gsc:status_missing"],
    [readyGsc, { status: "route_dimensions_missing", events: [] }, "ga4:route_dimensions_missing"],
    [readyGsc, { status: "ready", summary: [] }, "ga4:rows_missing"],
    [{ status: "ready" }, readyGa4, "gsc:rows_missing"],
    [readyGsc, { status: "ready", customDimensions: { ready: false }, events: [] }, "ga4:route_dimensions_missing"],
    [readyGsc, { status: "ready", events: [] }, "ga4:route_dimensions_missing"],
    [readyGsc, { status: "ready", customDimensions: null, events: [] }, "ga4:route_dimensions_missing"],
    [readyGsc, { events: [], customDimensions: { ready: true } }, "ga4:status_missing"],
    [readyGsc, { status: null, events: [], customDimensions: { ready: true } }, "ga4:status_missing"],
  ]) {
    const result = runGrowth(gsc, ga4);
    assert.equal(result.status, 2, `${reason}: ${result.stderr}`);
    assert.match(result.stderr, new RegExp(reason));
    assert.equal(result.stdout, "", reason);
  }
});

test("growth prioritization still accepts valid empty API exports and legacy arrays", () => {
  for (const [gsc, ga4] of [
    [{ status: "ready", searchAnalytics: [], pageTotals: [], indexing: [] },
      { status: "ready", customDimensions: { ready: true }, events: [] }],
    [[], []],
  ]) {
    const result = runGrowth(gsc, ga4);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /No evidence-backed optimization is ready yet/);
  }
});

test("optional structured indexing exports must be explicitly ready, not silently treated as empty", () => {
  const readyGsc = { status: "ready", searchAnalytics: [], pageTotals: [] };
  const readyGa4 = { status: "ready", customDimensions: { ready: true }, events: [] };
  for (const [indexing, reason] of [
    [{ status: "missing-google-auth", indexing: [] }, "indexing:missing-google-auth"],
    [{ indexing: [] }, "indexing:status_missing"],
    [{ status: null, indexing: [] }, "indexing:status_missing"],
    [{ status: "ready" }, "indexing:rows_missing"],
  ]) {
    const result = runGrowth(readyGsc, readyGa4, indexing);
    assert.equal(result.status, 2, `${reason}: ${result.stderr}`);
    assert.ok(result.stderr.includes(reason), result.stderr);
    assert.equal(result.stdout, "", reason);
  }
  for (const indexing of [{ status: "ready", indexing: [] }, []]) {
    const result = runGrowth(readyGsc, readyGa4, indexing);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /No evidence-backed optimization is ready yet/);
  }
});
