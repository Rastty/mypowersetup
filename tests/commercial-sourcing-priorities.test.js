import test from "node:test";
import assert from "node:assert/strict";

import { bestCommercialSourcingRoute, rankCommercialSourcingRoutes } from "../src/commercial-sourcing-priorities.js";

test("PT and RO sourcing prioritizes live shipping-verified Elite 300 family route", () => {
  for (const market of ["pt-PT", "ro-RO"]) {
    const routes = rankCommercialSourcingRoutes(market);
    assert.ok(routes.length > 0);
    const best = routes[0];

    assert.equal(best.id, "bluetti-eu-elite-300");
    assert.equal(best.category, "power_station");
    assert.equal(best.status, "blocked_affiliate_verification");
    assert.equal(best.blocker, "eu_affiliate_deeplink_unverified");
    assert.equal(best.standaloneUnlockWeight, 5);
    assert.equal(best.affectedWeight, 5);
    assert.equal(best.shippingVerified, true);
    assert.equal(best.stockStatus, "in_stock");
    assert.equal(best.nextAction, "verify_eu_affiliate_deeplink");
    assert.equal(bestCommercialSourcingRoute(market).id, best.id);

    const solaris = routes.find(({ id }) => id === "solaris-victron-phoenix-12-250");
    assert.ok(solaris);
    assert.equal(solaris.standaloneUnlockWeight, 5);
    assert.equal(solaris.shippingVerified, false);
    assert.ok(routes.indexOf(best) < routes.indexOf(solaris));
  }
});

test("Slovenia excludes Elite 300 and keeps Solaris 12/250 as top family unlock", () => {
  const routes = rankCommercialSourcingRoutes("sl-SI");
  assert.equal(routes.some(({ id }) => id === "bluetti-eu-elite-300"), false);

  const best = bestCommercialSourcingRoute("sl-SI");
  assert.equal(best.id, "solaris-victron-phoenix-12-250");
  assert.equal(best.category, "inverter");
  assert.equal(best.standaloneUnlockWeight, 5);
  assert.equal(best.shippingVerified, false);
  assert.equal(best.blocker, "affiliate_tracking_not_verified");
});

test("ranked sourcing routes omit zero-impact planning candidates", () => {
  for (const market of ["pt-PT", "ro-RO", "sl-SI"]) {
    const routes = rankCommercialSourcingRoutes(market);
    assert.ok(routes.every((route) => route.standaloneUnlockWeight > 0 || route.affectedWeight > 0));
  }
});
