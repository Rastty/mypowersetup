import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

function report(asOf) {
  return execFileSync(process.execPath, ["scripts/report-community-links.mjs", "--market", "pl", "--as-of", asOf], {
    encoding: "utf8",
  });
}

test("manual reply report provides the exact evidence-backed response while fresh", () => {
  const output = report("2026-11-17");
  assert.match(output, /as-of=2026-11-17.*actionable=1/);
  assert.match(output, /Ford Transit \+ DC\/DC/);
  assert.match(output, /reply draft: docs\/community\/pl-ford-transit-dcdc-followup-20261117\.md/);
  assert.match(output, /rule: answer_first_no_link_drop/);
});

test("manual reply report does not preserve stale candidates after their freshness window", () => {
  const output = report("2026-12-01");
  assert.match(output, /as-of=2026-12-01.*actionable=0/);
  assert.doesNotMatch(output, /Ford Transit \+ DC\/DC/);
});
