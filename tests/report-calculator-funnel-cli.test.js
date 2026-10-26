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


test("ready GA4 payload without events is unavailable, not an observed empty funnel", () => {
  const dir = mkdtempSync(join(tmpdir(), "mps-ga4-funnel-"));
  try {
    const input = join(dir, "missing-events.json");
    writeFileSync(input, JSON.stringify({ status: "ready", summary: [] }));
    const result = spawnSync(process.execPath, [script, input], { encoding: "utf8" });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Calculator funnel evidence unavailable: events_missing/);
    assert.equal(result.stdout, "");
    writeFileSync(input, JSON.stringify({ status: "ready", customDimensions: { ready: true }, events: [] }));
    const observed = spawnSync(process.execPath, [script, input], { encoding: "utf8" });
    assert.equal(observed.status, 0);
    assert.match(observed.stdout, /Affiliate clicks/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("missing GA4 status is unknown even with an explicit empty events array", () => {
  const dir = mkdtempSync(join(tmpdir(), "mps-ga4-funnel-"));
  try {
    const input = join(dir, "missing-status.json");
    for (const payload of [
      { events: [] },
      { events: [], customDimensions: { ready: true } },
      { status: null, events: [], customDimensions: { ready: true } },
    ]) {
      writeFileSync(input, JSON.stringify(payload));
      const result = spawnSync(process.execPath, [script, input], { encoding: "utf8" });
      assert.equal(result.status, 2, result.stderr);
      assert.match(result.stderr, /status_missing/);
      assert.equal(result.stdout, "");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("ready GA4 status without verified route dimensions is not a measured funnel", () => {
  const dir = mkdtempSync(join(tmpdir(), "mps-ga4-funnel-"));
  try {
    const input = join(dir, "dimensions.json");
    for (const payload of [
      { status: "ready", events: [] },
      { status: "ready", events: [], customDimensions: { ready: false } },
    ]) {
      writeFileSync(input, JSON.stringify(payload));
      const result = spawnSync(process.execPath, [script, input], { encoding: "utf8" });
      assert.equal(result.status, 2, result.stderr);
      assert.match(result.stderr, /route_dimensions_missing/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("raw event arrays remain supported as intentional offline imports", () => {
  const dir = mkdtempSync(join(tmpdir(), "mps-ga4-funnel-"));
  try {
    const input = join(dir, "raw-events.json");
    writeFileSync(input, "[]");
    const result = spawnSync(process.execPath, [script, input], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Affiliate clicks/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
