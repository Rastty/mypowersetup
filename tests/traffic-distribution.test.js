import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const registry = JSON.parse(readFileSync(new URL("../data/traffic-distribution.json", import.meta.url), "utf8"));
const MARKET_PREFIX = Object.freeze({
  cs: "/",
  sk: "/sk/",
  pl: "/pl/",
  hu: "/hu/",
  pt: "/pt/",
  si: "/si/",
  ro: "/ro/",
});

function routeFile(route) {
  if (route === "/") return resolve("index.html");
  return resolve(route.slice(1), "index.html");
}

test("distribution registry has a portable explicit anti-spam policy", () => {
  assert.equal(registry.version, 1);
  assert.equal(registry.policy.defaultPostingRule, "answer_first_no_link_drop");
  assert.ok(registry.policy.principles.some((item) => /Do not automate posting/i.test(item)));
  assert.ok(registry.policy.principles.some((item) => /Do not revive stale threads/i.test(item)));
});

test("distribution opportunities are unique, valid and point only to published local routes", () => {
  assert.ok(registry.opportunities.length >= 8);
  const ids = new Set();
  const urls = new Set();

  for (const item of registry.opportunities) {
    assert.ok(!ids.has(item.id), `duplicate id ${item.id}`);
    ids.add(item.id);
    assert.ok(!urls.has(item.sourceUrl), `duplicate sourceUrl ${item.sourceUrl}`);
    urls.add(item.sourceUrl);

    assert.ok(Object.hasOwn(MARKET_PREFIX, item.market), `unsupported market ${item.market}`);
    assert.ok(registry.policy.allowedStatuses.includes(item.status), `invalid status ${item.status}`);
    assert.ok(registry.policy.allowedPriorities.includes(item.priority), `invalid priority ${item.priority}`);
    assert.equal(item.postingRule, registry.policy.defaultPostingRule, `unsafe posting rule ${item.id}`);
    assert.match(item.sourceUrl, /^https:\/\//, `non-https source ${item.id}`);
    assert.match(item.lastKnownActivity, /^\d{4}-\d{2}-\d{2}$/, `invalid activity date ${item.id}`);
    assert.ok(Array.isArray(item.problemIntent) && item.problemIntent.length > 0, `missing intent ${item.id}`);

    const prefix = MARKET_PREFIX[item.market];
    assert.ok(item.targetRoute.startsWith(prefix), `target route crosses market for ${item.id}`);
    assert.ok(existsSync(routeFile(item.targetRoute)), `target route does not exist: ${item.targetRoute}`);

    assert.ok(Array.isArray(item.supportingRoutes) && item.supportingRoutes.length > 0, `missing supporting routes ${item.id}`);
    for (const route of item.supportingRoutes) {
      assert.ok(route.startsWith(prefix), `supporting route crosses market for ${item.id}: ${route}`);
      assert.ok(existsSync(routeFile(route)), `supporting route does not exist: ${route}`);
    }
  }
});

test("ready opportunities are current direct technical fits, never stale research entries", () => {
  const ready = registry.opportunities.filter((item) => item.status === "ready_for_manual_reply");
  assert.ok(ready.length >= 2);
  for (const item of ready) {
    assert.equal(item.priority, "high");
    assert.match(item.fit, /direct_camper_technical_current/);
    assert.ok(item.lastKnownActivity >= "2026-01-01", `ready item is too stale: ${item.id}`);
  }
});
