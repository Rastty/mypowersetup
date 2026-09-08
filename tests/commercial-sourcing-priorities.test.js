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
    assert.equal(best.blocker, "exact_cj_eu_deeplink_unverified");
    assert.equal(best.standaloneUnlockWeight, 5);
    assert.equal(best.affectedWeight, 5);
    assert.equal(best.shippingVerified, true);
    assert.equal(best.stockStatus, "in_stock");
    assert.equal(best.nextAction, "provide_exact_cj_elite300_deeplink");
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


test("category-specific routing includes secondary-only candidates without polluting the portfolio ranking", () => {
  for (const market of ["pt-PT", "ro-RO", "sl-SI"]) {
    const portfolioRoutes = rankCommercialSourcingRoutes(market);
    assert.equal(portfolioRoutes.some(({ id }) => id === "ampul-eu-dcdc-12v-30a"), false);
    assert.ok(portfolioRoutes.every((route) => route.standaloneUnlockWeight > 0 || route.affectedWeight > 0));

    const dcRoutes = rankCommercialSourcingRoutes(market, { category: "dc_charger" });
    assert.ok(dcRoutes.length >= 2, `${market}: expected secondary DC-DC sourcing routes`);
    assert.equal(dcRoutes[0].id, "ampul-eu-dcdc-12v-30a");
    assert.equal(dcRoutes[0].nextActionOwner, "system");
    assert.equal(dcRoutes[0].nextAction, "verify_pt_ro_si_checkout");
    assert.equal(dcRoutes[0].blocker, "market_shipping_checkout_unverified");
    assert.equal(dcRoutes[0].stockStatus, "in_stock");

    const butler = dcRoutes.find(({ id }) => id === "butler-victron-orion-xs-12-12-50");
    assert.ok(butler);
    assert.equal(butler.nextActionOwner, "user");
    assert.equal(butler.blocker, "awin_program_approval");

    assert.equal(bestCommercialSourcingRoute(market, { category: "dc_charger" }).id, "ampul-eu-dcdc-12v-30a");
  }
});
