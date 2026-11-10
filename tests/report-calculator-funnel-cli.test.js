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

test("ready GA4 API rows use distinct users for funnel rates but preserve click actions", () => {
  const dir = mkdtempSync(join(tmpdir(), "mps-ga4-funnel-"));
  try {
    const input = join(dir, "ga4-live.json");
    const base = {
      calculatorLandingPath: "/kalkulacky/kapacita-baterie/",
      calculatorLandingLocale: "cs",
      calculatorLandingIntent: "battery-capacity",
      hostName: "mypowersetup.com",
    };
    const event = (eventName, eventCount, totalUsers) => ({ ...base, eventName, eventCount, totalUsers });
    writeFileSync(input, JSON.stringify({
      status: "ready",
      customDimensions: { ready: true },
      events: [
        event("calculator_landing_view", 20, 10),
        event("calculator_started", 18, 9),
        event("calculation_completed", 13, 8),
        event("product_choice_impression", 11, 5),
        event("affiliate_click", 4, 2),
      ],
    }));
    const result = spawnSync(process.execPath, [script, input], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const row = result.stdout.split("\n").find((line) => line.includes("/kalkulacky/kapacita-baterie/"));
    assert.ok(row, result.stdout);
    const cells = row.split("|").map((value) => value.trim());
    assert.deepEqual(cells.slice(4, 12), ["10", "9", "8", "0", "5", "2", "4", "20.0%"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("aggregate GA4 rows with malformed eventCount fail instead of using user totals", () => {
  const dir = mkdtempSync(join(tmpdir(), "mps-ga4-funnel-"));
  try {
    const input = join(dir, "corrupt-count.json");
    writeFileSync(input, JSON.stringify({
      status: "ready",
      customDimensions: { ready: true },
      events: [{
        eventName: "affiliate_click",
        eventCount: "unknown",
        totalUsers: 2,
        calculatorLandingPath: "/kalkulacky/kapacita-baterie/",
        calculatorLandingLocale: "cs",
        calculatorLandingIntent: "battery-capacity",
      }],
    }));
    const result = spawnSync(process.execPath, [script, input], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /GA4_EVENT_COUNT_INVALID/);
    assert.equal(result.stdout, "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
