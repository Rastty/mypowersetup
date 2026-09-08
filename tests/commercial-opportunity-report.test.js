import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const report = JSON.parse(await readFile(new URL("../data/commercial-opportunity-report.json", import.meta.url), "utf8"));

test("commercial opportunity artifact distinguishes component and portable purchase routes", () => {
  assert.equal(report.schemaVersion, 6);
  assert.equal(report.markets.length, 7);
  for (const market of report.markets) {
    assert.ok(Number.isFinite(market.purchaseReadyRatio));
    assert.ok(Number.isFinite(market.componentReadyRatio));
    assert.ok(Number.isFinite(market.portableFitRatio));
    assert.ok(market.purchaseReadyRatio >= market.componentReadyRatio);
  }

  for (const marketCode of ["pt-PT", "ro-RO", "sl-SI"]) {
    const market = report.markets.find((entry) => entry.market === marketCode);
    assert.ok(market.portableFitRatio > 0, `${marketCode} should recognize a verified portable fit`);
  }

  const slovenia = report.markets.find((market) => market.market === "sl-SI");
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


test("schema v6 surfaces actionable sourcing routes", () => {

  for (const marketCode of ["pt-PT", "ro-RO", "sl-SI"]) {
    const market = report.markets.find((entry) => entry.market === marketCode);
    assert.ok(Array.isArray(market.sourcingRoutes) && market.sourcingRoutes.length > 0, `${marketCode}: sourcing routes missing`);
    assert.ok(market.topSourcingRoute, `${marketCode}: top sourcing route missing`);
    assert.equal(market.topSourcingRoute.id, market.sourcingRoutes[0].id);
    assert.ok(market.topSourcingRoute.standaloneUnlockWeight > 0 || market.topSourcingRoute.affectedWeight > 0);
  }

  assert.equal(report.markets.find(({ market }) => market === "pt-PT").topSourcingRoute.id, "bluetti-eu-elite-300");
  assert.equal(report.markets.find(({ market }) => market === "ro-RO").topSourcingRoute.id, "bluetti-eu-elite-300");
  assert.equal(report.markets.find(({ market }) => market === "sl-SI").topSourcingRoute.id, "solaris-victron-phoenix-12-250");
});


test("opportunity-specific sourcing route matches the missing category and exposes the handoff", () => {
  for (const marketCode of ["pt-PT", "ro-RO", "sl-SI"]) {
    const market = report.markets.find((entry) => entry.market === marketCode);
    for (const opportunity of market.opportunities) {
      const route = opportunity.bestSourcingRoute;
      if (!route) continue;
      assert.equal(route.category, opportunity.category, `${marketCode}/${opportunity.category}: route category mismatch`);
      assert.ok(route.id, `${marketCode}/${opportunity.category}: route id missing`);
      assert.ok(route.status, `${marketCode}/${opportunity.category}: route status missing`);
      assert.ok(route.blocker || route.status === "ready_for_ingest", `${marketCode}/${opportunity.category}: blocker missing`);

      if (route.nextActionOwner === "user") {
        assert.ok(route.nextAction, `${marketCode}/${opportunity.category}: user action missing`);
        assert.ok(route.applicationUrl || route.applicationPacketPath || route.activationFieldsNeeded,
          `${marketCode}/${opportunity.category}: user handoff details missing`);
      }
    }
  }

  const pt = report.markets.find((market) => market.market === "pt-PT");
  const controller = pt.opportunities.find((item) => item.category === "controller");
  assert.equal(controller.bestSourcingRoute.category, "controller");
  assert.ok(["solaris-victron-smartsolar-150-60-tr", "butler-victron-scc125060321"].includes(controller.bestSourcingRoute.id));

  const inverter = pt.opportunities.find((item) => item.category === "inverter");
  assert.equal(inverter.bestSourcingRoute.category, "inverter");
  assert.ok(inverter.bestSourcingRoute.applicationPacketPath || inverter.bestSourcingRoute.nextActionOwner === "system");
});
