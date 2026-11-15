import test from "node:test";
import assert from "node:assert/strict";
import { buildAffiliateClickParameters, buildAffiliateImpressionParameters, readNetworkAffiliatePlacement, trackAffiliateClick, trackAffiliateImpressions, trackVisibleAffiliateImpressions } from "../src/affiliate-analytics.js";
import { decorateAwinAffiliateUrl } from "../src/awin-attribution.js";

test("affiliate clicks are sent exactly once with stable product dimensions", () => {
  const calls = [];
  const link = {
    dataset: {
      productId: "panel-200w",
      merchant: "padabo_sk",
      category: "solar_panel",
      source: "package",
      packageId: "recommended",
      recommendationRole: "recommended",
    },
  };

  const result = trackAffiliateClick(link, (...args) => {
    calls.push(args);
    return true;
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [["affiliate_click", {
    productId: "panel-200w",
    merchant: "padabo_sk",
    category: "solar_panel",
    purchaseRoute: "components",
    source: "package",
    packageId: "recommended",
    recommendationRole: "recommended",
  }]]);
});

test("affiliate click dimensions use explicit fallbacks", () => {
  assert.deepEqual(buildAffiliateClickParameters({ dataset: {} }), {
    productId: "unknown",
    merchant: "unknown",
    category: "unknown",
    purchaseRoute: "unknown",
    source: "unknown",
    packageId: undefined,
    recommendationRole: undefined,
  });
  assert.equal(trackAffiliateClick(null, null), false);
});

test("affiliate clicks distinguish portable and component purchase routes", () => {
  assert.equal(buildAffiliateClickParameters({ dataset: { category: "power_station" } }).purchaseRoute, "portable");
  assert.equal(buildAffiliateClickParameters({ dataset: { category: "battery" } }).purchaseRoute, "components");
});

test("real eHUB calculator placements share their exact click and impression GA4 dimension", () => {
  const affiliateUrl = "https://ehub.cz/system/scripts/click.php?a_aid=publisher1&a_bid=merchant2&desturl=https%3A%2F%2Fshop.example%2Fitem";
  for (const [market, category, placement] of [
    ["cz", "battery", "battery_calculator"],
    ["cz", "controller", "mppt_calculator"],
    ["cz", "inverter", "inverter_calculator"],
    ["cz", "dc_charger", "dcdc_calculator"],
    ["cz", "solar_panel", "solar_calculator"],
    ["sk", "solar_panel", "solar_calculator"],
  ]) {
    const href = decorateAwinAffiliateUrl(affiliateUrl, { market, category, placement });
    const link = { href, dataset: { category, source: "product-card" } };
    assert.equal(readNetworkAffiliatePlacement(link), placement);
    const clicks = [];
    trackAffiliateClick(link, (...args) => { clicks.push(args); return true; });
    assert.equal(clicks[0][1].affiliatePlacement, placement);
    const impressions = [];
    trackAffiliateImpressions([link], (...args) => { impressions.push(args); return true; });
    assert.equal(impressions[0][1].affiliatePlacement, placement);
    assert.deepEqual(new URL(href).searchParams.getAll("data2"), [`placement_${placement}`]);
  }
});

test("AWIN placement matches the network's actual clickref4 value", () => {
  const url = decorateAwinAffiliateUrl("https://www.awin1.com/cread.php?awinmid=123&awinaffid=456&ued=https%3A%2F%2Fshop.example%2Fitem", {
    market: "cz", category: "battery", placement: "battery_calculator",
  });
  assert.equal(readNetworkAffiliatePlacement({href:url}), "battery_calculator");
  assert.equal(buildAffiliateClickParameters({href:url,dataset:{category:"battery"}}).affiliatePlacement, "battery_calculator");
});

test("scenario, merchant-owned, malformed and arbitrary clickrefs are excluded from GA4 placement", () => {
  const base = "https://ehub.cz/system/scripts/click.php?a_aid=p&a_bid=b&desturl=https%3A%2F%2Fshop.example";
  const cases = [
    decorateAwinAffiliateUrl(base, {market:"cz",category:"battery",placement:"battery_calculator",scenarioCampaign:"promo"}),
    base + "&data1=mps_cz_battery&data2=merchant_label",
    base + "&data1=mps_cz_battery&data2=placement_battery_calculator&data2=placement_mppt_calculator",
    base + "&data1=mps_cz_battery&data2=placement_unapproved_calculator",
    base + "&data2=placement_battery_calculator",
    "https://ehub.cz/system/scripts/click.php?a_aid=&a_bid=b&data1=mps_cz_battery&data2=placement_battery_calculator",
    "https://www.awin1.com/cread.php?clickref=mps_cz_battery&clickref4=placement_battery_calculator",
    "https://shop.example/item?data1=mps_cz_battery&data2=placement_battery_calculator",
    "javascript:alert(1)",
  ];
  for (const href of cases) {
    const link = {href,dataset:{category:"battery"}};
    assert.equal(readNetworkAffiliatePlacement(link), null);
    assert.equal(Object.hasOwn(buildAffiliateClickParameters(link), "affiliatePlacement"), false);
  }
  assert.equal(readNetworkAffiliatePlacement({ dataset: {} }), null);
});

test("choice impressions provide exclusive CTR denominators by role and purchase route", () => {
  const links = [
    { dataset: { category: "battery", recommendationRole: "recommended" } },
    { dataset: { category: "solar_panel", recommendationRole: "budget" } },
    { dataset: { category: "inverter", recommendationRole: "reserve" } },
    { dataset: { category: "controller", recommendationRole: "alternative" } },
    { dataset: { category: "power_station", recommendationRole: "recommended" } },
  ];
  assert.deepEqual(buildAffiliateImpressionParameters(links), {
    productCount: 5,
    componentCount: 4,
    portableCount: 1,
    recommendedCount: 2,
    budgetCount: 1,
    reserveCount: 1,
    alternativeCount: 1,
    unknownRoleCount: 0,
  });

  const calls = [];
  assert.equal(trackAffiliateImpressions(links, (...args) => { calls.push(args); return true; }), true);
  assert.equal(calls.length, 6);
  assert.deepEqual(calls.slice(0, 5), links.map((link) => ["product_choice_impression", buildAffiliateClickParameters(link)]));
  assert.deepEqual(calls[5], ["product_choices_rendered", buildAffiliateImpressionParameters(links)]);
});

test("choice impressions count each rendered link once", () => {
  const link = { dataset: { category: "battery", recommendationRole: "recommended" } };
  const calls = [];
  const tracker = (...args) => { calls.push(args); return true; };

  assert.equal(trackAffiliateImpressions([link], tracker), true);
  assert.equal(trackAffiliateImpressions([link], tracker), true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], "product_choice_impression");
  assert.equal(calls[1][0], "product_choices_rendered");
  assert.equal(link.dataset.affiliateImpressionTracked, "true");
});

test("choice impressions exclude links hidden in closed comparisons", () => {
  const visible = { dataset: { category: "battery", recommendationRole: "recommended" }, closest: () => null };
  const hidden = { dataset: { category: "battery", recommendationRole: "alternative" }, closest: () => ({ open: false }) };
  const root = { querySelectorAll: () => [visible, hidden] };
  const calls = [];

  assert.equal(trackVisibleAffiliateImpressions(root, (...args) => { calls.push(args); return true; }), true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], "product_choice_impression");
  assert.equal(calls[1][1].productCount, 1);
  assert.equal(calls[1][1].recommendedCount, 1);
  assert.equal(calls[1][1].alternativeCount, 0);
  assert.equal(hidden.dataset.affiliateImpressionTracked, undefined);
});

test("failed consent-gated tracking remains eligible after consent", () => {
  const link = { dataset: { category: "power_station", recommendationRole: "recommended" } };
  assert.equal(trackAffiliateImpressions([link], () => false), false);
  assert.equal(link.dataset.affiliateImpressionTracked, undefined);

  const calls = [];
  assert.equal(trackAffiliateImpressions([link], (...args) => { calls.push(args); return true; }), true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], "product_choice_impression");
  assert.equal(calls[0][1].purchaseRoute, "portable");
  assert.equal(calls[1][1].portableCount, 1);
});

test("product-choice impressions share the exact click dimensions", () => {
  const link = {
    dataset: {
      productId: "ps-1000",
      merchant: "allpowers_pt",
      category: "power_station",
      source: "product-card",
      packageId: "recommended",
      recommendationRole: "recommended",
    },
  };
  const calls = [];
  trackAffiliateImpressions([link], (...args) => { calls.push(args); return true; });
  assert.deepEqual(calls[0], ["product_choice_impression", buildAffiliateClickParameters(link)]);
});


test("primary portable product choices expose route priority on impressions and clicks", () => {
  const link = {
    dataset: {
      productId: "ps-complete",
      merchant: "allpowers_pt",
      category: "power_station",
      source: "product-card",
      recommendationRole: "recommended",
      routePriority: "primary",
      ctaVariant: "portable-primary",
    },
  };
  assert.deepEqual(buildAffiliateClickParameters(link), {
    productId: "ps-complete",
    merchant: "allpowers_pt",
    category: "power_station",
    purchaseRoute: "portable",
    source: "product-card",
    packageId: undefined,
    recommendationRole: "recommended",
    routePriority: "primary",
    ctaVariant: "portable-primary",
  });
});


test("collapsed budget and reserve baskets create impressions only after intentionally opening", () => {
  const details = { open: false };
  const recommended = {
    dataset: { category: "battery", recommendationRole: "recommended", source: "package", packageId: "recommended" },
    closest(selector) { return selector === "[hidden], details:not([open])" ? null : null; },
  };
  const budget = {
    dataset: { category: "battery", recommendationRole: "budget", source: "package", packageId: "economy" },
    closest(selector) {
      return selector === "[hidden], details:not([open])" && !details.open ? details : null;
    },
  };
  const root = { querySelectorAll: () => [recommended, budget] };
  const events = [];
  const track = (name, params) => { events.push({name,params}); return true; };
  assert.equal(trackVisibleAffiliateImpressions(root, track),true);
  assert.deepEqual(events.filter(x=>x.name==="product_choice_impression").map(x=>x.params.recommendationRole),["recommended"]);
  details.open = true;
  assert.equal(trackVisibleAffiliateImpressions(root, track),true);
  assert.deepEqual(events.filter(x=>x.name==="product_choice_impression").map(x=>x.params.recommendationRole),["recommended","budget"]);
  assert.equal(trackVisibleAffiliateImpressions(root, track),true);
  assert.equal(events.filter(x=>x.name==="product_choice_impression").length,2);
  assert.deepEqual(events.filter(x=>x.name==="product_choices_rendered").map(x=>x.params.productCount),[1,1]);
});
