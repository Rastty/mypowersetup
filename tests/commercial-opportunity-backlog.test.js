import test from "node:test";
import assert from "node:assert/strict";
import { buildCommercialOpportunityBacklog, aggregateCommercialOpportunityBacklogs } from "../src/commercial-opportunity-backlog.js";

const synthetic = {
  market: "xx-XX",
  sources: { safe: { status: "ok" } },
  products: [],
};

test("commercial backlog converts scenario gaps into ranked acquisition work", () => {
  const backlog = buildCommercialOpportunityBacklog(synthetic, "cs");
  assert.equal(backlog.market, "xx-XX");
  assert.ok(backlog.opportunities.length >= 4);
  assert.equal(backlog.opportunities[0].priority, "P0");
  assert.ok(backlog.opportunities[0].score >= backlog.opportunities.at(-1).score);
  assert.ok(backlog.opportunities.some((item) => item.category === "battery" && item.maxPurchaseReadyGain > 0));
  assert.ok(backlog.opportunities.some((item) => item.category === "shore_charger" && item.secondaryWeight > 0));
});

test("portfolio aggregation ranks shared gaps above isolated ones", () => {
  const a = { market: "a", opportunities: [{ category: "inverter", label: "inverter", priority: "P0", score: 8, maxPurchaseReadyGain: 0.4 }] };
  const b = { market: "b", opportunities: [
    { category: "inverter", label: "inverter", priority: "P1", score: 4, maxPurchaseReadyGain: 0.2 },
    { category: "battery", label: "battery", priority: "P1", score: 5, maxPurchaseReadyGain: 0.3 },
  ] };
  const portfolio = aggregateCommercialOpportunityBacklogs([a, b]);
  assert.equal(portfolio[0].category, "inverter");
  assert.equal(portfolio[0].score, 12);
  assert.equal(portfolio[0].markets.length, 2);
});

test("portable-ready scenarios do not inflate maximum component sourcing gain", () => {
  const station = {
    id: "station", merchant: "safe", category: "power_station", available: true,
    name: "Portable power station", categoryPath: "Power stations", description: "",
    productUrl: "https://shop.example/products/station",
    affiliateUrl: "https://affiliate.example/click?desturl=https%3A%2F%2Fshop.example%2Fproducts%2Fstation",
    priceCzk: 1000,
    specs: { capacityWh: 2000, powerW: 1000, solarInputW: 800, dcOutputA: 15, pureSine: true },
  };
  const backlog = buildCommercialOpportunityBacklog({ ...synthetic, products: [station] }, "cs");
  const controller = backlog.opportunities.find((item) => item.category === "controller");
  assert.ok(controller.affectedWeight >= controller.unlockWeight);
  assert.ok(controller.primaryScenarioIds.length >= controller.unlockScenarioIds.length);
  assert.ok(controller.maxPurchaseReadyGain <= controller.affectedWeight / 19);
  assert.ok(backlog.portableFitRatio > 0);
});
