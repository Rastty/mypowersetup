import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  GUIDE_ATTRIBUTION_MAX_AGE_MS,
  clearGuideAttribution,
  rememberGuideAttribution,
  resolveGuideAttribution,
} from "../src/guide-attribution.js";

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

test("guide attribution preserves a validated commercial guide for the calculator journey", () => {
  const storage = memoryStorage();
  const now = 1_700_000_000_000;

  assert.deepEqual(
    rememberGuideAttribution({ sourcePath: "/pruvodce/jak-vybrat-mppt-regulator/", storage, now }),
    {
      guide_source_path: "/pruvodce/jak-vybrat-mppt-regulator/",
      guide_source_topic: "mppt",
      guide_source_market: "cs",
    }
  );

  assert.deepEqual(resolveGuideAttribution({ storage, market: "cz", now: now + 60_000 }), {
    guide_source_path: "/pruvodce/jak-vybrat-mppt-regulator/",
    guide_source_topic: "mppt",
    guide_source_market: "cs",
  });
  assert.equal(resolveGuideAttribution({ storage, market: "pl", now: now + 60_000 }), null);
});

test("guide attribution expires and removes stale session data", () => {
  const storage = memoryStorage();
  const now = 1_700_000_000_000;
  rememberGuideAttribution({ sourcePath: "/pl/poradnik/jak-dobrac-ladowarke-dc-dc/", storage, now });

  assert.equal(resolveGuideAttribution({ storage, market: "pl", now: now + GUIDE_ATTRIBUTION_MAX_AGE_MS + 1 }), null);
  assert.equal(storage.values.size, 0);
});

test("guide attribution rejects unsupported and corrupted values", () => {
  const storage = memoryStorage();
  assert.equal(rememberGuideAttribution({ sourcePath: "/affiliate/", storage, now: 10 }), null);
  assert.equal(storage.values.size, 0);

  storage.setItem("mypowersetup_guide_attribution", "not-json");
  assert.equal(resolveGuideAttribution({ storage, market: "cz", now: 20 }), null);
  assert.equal(storage.values.size, 0);
  assert.equal(clearGuideAttribution(storage), true);
});

test("analytics only stores guide attribution behind granted consent and resolves it on calculator context", async () => {
  const analytics = await readFile(new URL("../src/analytics.js", import.meta.url), "utf8");
  assert.match(analytics, /choice === "granted" && page\.page_type === "calculator" \? resolveGuideAttribution/);
  assert.match(analytics, /if \(choice === "granted"\) rememberGuideAttribution\(\{ sourcePath: window\.location\.pathname, storage: window\.sessionStorage \}\)/);
  assert.match(analytics, /guide_source_topic/);
});
