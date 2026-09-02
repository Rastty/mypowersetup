import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const report = JSON.parse(await readFile(new URL("../data/commercial-opportunity-report.json", import.meta.url), "utf8"));

test("commercial opportunity artifact distinguishes component and portable purchase routes", () => {
  assert.equal(report.schemaVersion, 4);
  assert.equal(report.markets.length, 7);
  for (const market of report.markets) {
    assert.ok(Number.isFinite(market.purchaseReadyRatio));
    assert.ok(Number.isFinite(market.componentReadyRatio));
    assert.ok(Number.isFinite(market.portableFitRatio));
    assert.ok(market.purchaseReadyRatio >= market.componentReadyRatio);
  }

  const slovenia = report.markets.find((market) => market.market === "sl-SI");
  assert.ok(slovenia.portableFitRatio > 0);
  assert.ok(slovenia.purchaseReadyRatio > slovenia.componentReadyRatio);
});

test("component sourcing gain excludes scenarios already covered by a portable route", () => {
  for (const market of report.markets) {
    for (const opportunity of market.opportunities) {
      assert.ok(opportunity.unlockWeight <= opportunity.affectedWeight);
      assert.ok(opportunity.unlockScenarioIds.length <= opportunity.primaryScenarioIds.length);
    }
  }

  const sloveniaController = report.markets
    .find((market) => market.market === "sl-SI")
    .opportunities.find((opportunity) => opportunity.category === "controller");
  assert.ok(sloveniaController.unlockWeight < sloveniaController.affectedWeight);
});
