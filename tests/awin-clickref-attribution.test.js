import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { decorateAwinAffiliateUrl } from "../src/awin-attribution.js";

const awin = "https://www.awin1.com/cread.php?awinmid=97025&awinaffid=3044971&ued=https%3A%2F%2Fwww.ipowerqueen.de%2Fen%2Fproducts%2Fexample";
const ehub = "https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=95d61abf&desturl=https%3A%2F%2Fwww.padabo.pl%2Fexample";

test("expansion Awin links carry market/category and non-public role/priority click references", () => {
  const decorated = decorateAwinAffiliateUrl(awin, {
    market: "pt",
    category: "shore_charger",
    recommendationRole: "recommended",
    routePriority: "primary",
  });
  const url = new URL(decorated);
  assert.equal(url.searchParams.get("awinmid"), "97025");
  assert.equal(url.searchParams.get("awinaffid"), "3044971");
  assert.equal(url.searchParams.get("ued"), "https://www.ipowerqueen.de/en/products/example");
  assert.equal(url.searchParams.get("clickref"), "mps_pt_shore_charger");
  assert.equal(url.searchParams.get("clickref2"), "role_recommended");
  assert.equal(url.searchParams.get("clickref3"), "priority_primary");
});

test("Awin attribution preserves any pre-existing publisher references", () => {
  const existing = awin + "&clickref=existing_campaign&clickref2=existing_role";
  const url = new URL(decorateAwinAffiliateUrl(existing, {
    market: "ro",
    category: "battery",
    recommendationRole: "budget",
    routePriority: "secondary",
  }));
  assert.equal(url.searchParams.get("clickref"), "existing_campaign");
  assert.equal(url.searchParams.get("clickref2"), "existing_role");
  assert.equal(url.searchParams.get("clickref3"), "priority_secondary");
});

test("non-supported and malformed affiliate URLs are unchanged", () => {
  const other = "https://example.com/out?desturl=https%3A%2F%2Fshop.example%2F";
  assert.equal(decorateAwinAffiliateUrl(other, {
    market: "ro", category: "dc_charger", recommendationRole: "recommended", routePriority: "primary",
  }), other);
  assert.equal(decorateAwinAffiliateUrl("not a url", { market: "pt", category: "battery" }), "not a url");
});

test("unsafe attribution values are never written to the affiliate URL", () => {
  const url = new URL(decorateAwinAffiliateUrl(awin, {
    market: "pt<script>",
    category: "battery space",
    recommendationRole: "unknown",
    routePriority: "other",
    scenarioCampaign: "pl weekend<script>",
  }));
  assert.equal(url.searchParams.has("clickref"), false);
  assert.equal(url.searchParams.has("clickref2"), false);
  assert.equal(url.searchParams.has("clickref3"), false);
  assert.equal(url.searchParams.has("clickref4"), false);
});

test("expansion product renderer decorates the outbound href while preserving analytics dimensions", async () => {
  const source = await readFile(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");
  assert.match(source, /decorateAwinAffiliateUrl\(item\.affiliateUrl/);
  assert.match(source, /href="\$\{escapeHtml\(attributedAffiliateUrl\)\}"/);
  assert.match(source, /data-recommendation-role=/);
  assert.match(source, /data-route-priority=/);
  assert.match(source, /data-category=/);
  assert.match(source, /data-merchant=/);
});

test("mature-market source attribution uses clickref3 when route priority is absent", () => {
  const packageUrl = new URL(decorateAwinAffiliateUrl(awin, {
    market: "cz",
    category: "battery",
    recommendationRole: "budget",
    source: "package",
  }));
  assert.equal(packageUrl.searchParams.get("clickref"), "mps_cz_battery");
  assert.equal(packageUrl.searchParams.get("clickref2"), "role_budget");
  assert.equal(packageUrl.searchParams.get("clickref3"), "source_package");

  const cardUrl = new URL(decorateAwinAffiliateUrl(awin, {
    market: "hu",
    category: "inverter",
    recommendationRole: "recommended",
    source: "product-card",
  }));
  assert.equal(cardUrl.searchParams.get("clickref"), "mps_hu_inverter");
  assert.equal(cardUrl.searchParams.get("clickref2"), "role_recommended");
  assert.equal(cardUrl.searchParams.get("clickref3"), "source_product-card");
});

test("scenario campaign is written to clickref4 without disturbing existing dimensions", () => {
  const url = new URL(decorateAwinAffiliateUrl(awin, {
    market: "pl",
    category: "battery",
    recommendationRole: "recommended",
    source: "product-card",
    scenarioCampaign: "pl_weekend",
  }));
  assert.equal(url.searchParams.get("clickref"), "mps_pl_battery");
  assert.equal(url.searchParams.get("clickref2"), "role_recommended");
  assert.equal(url.searchParams.get("clickref3"), "source_product-card");
  assert.equal(url.searchParams.get("clickref4"), "scenario_pl_weekend");
});

test("scenario clickref4 is inferred from the consented browser analytics context", () => {
  const previousWindow = globalThis.window;
  globalThis.window = {
    MyPowerSetupAnalytics: {
      context: () => ({ scenario_source: "scenario_page", scenario_campaign: "pl_weekend" }),
    },
  };
  try {
    const url = new URL(decorateAwinAffiliateUrl(awin, {
      market: "pl",
      category: "battery",
      recommendationRole: "recommended",
      source: "product-card",
    }));
    assert.equal(url.searchParams.get("clickref4"), "scenario_pl_weekend");
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("pre-existing clickref4 is preserved and overlong scenario references are rejected", () => {
  const existing = new URL(decorateAwinAffiliateUrl(`${awin}&clickref4=existing_scenario`, {
    market: "pl",
    category: "battery",
    scenarioCampaign: "pl_weekend",
  }));
  assert.equal(existing.searchParams.get("clickref4"), "existing_scenario");

  const tooLong = new URL(decorateAwinAffiliateUrl(awin, {
    market: "pl",
    category: "battery",
    scenarioCampaign: "a".repeat(64),
  }));
  assert.equal(tooLong.searchParams.has("clickref4"), false);
});

test("eHUB links carry market/category and scenario dimensions into data1/data2", () => {
  const url = new URL(decorateAwinAffiliateUrl(ehub, {
    market: "pl",
    category: "battery",
    scenarioCampaign: "pl_weekend",
  }));
  assert.equal(url.searchParams.get("a_aid"), "f34c86c8");
  assert.equal(url.searchParams.get("a_bid"), "95d61abf");
  assert.equal(url.searchParams.get("desturl"), "https://www.padabo.pl/example");
  assert.equal(url.searchParams.get("data1"), "mps_pl_battery");
  assert.equal(url.searchParams.get("data2"), "scenario_pl_weekend");
});

test("eHUB scenario data2 is inferred from browser context and existing publisher data is preserved", () => {
  const previousWindow = globalThis.window;
  globalThis.window = {
    MyPowerSetupAnalytics: {
      context: () => ({ scenario_source: "scenario_page", scenario_campaign: "pl_weekend" }),
    },
  };
  try {
    const inferred = new URL(decorateAwinAffiliateUrl(ehub, { market: "pl", category: "solar_panel" }));
    assert.equal(inferred.searchParams.get("data1"), "mps_pl_solar_panel");
    assert.equal(inferred.searchParams.get("data2"), "scenario_pl_weekend");

    const existing = new URL(decorateAwinAffiliateUrl(`${ehub}&data1=existing_slot&data2=existing_campaign`, {
      market: "pl",
      category: "battery",
      scenarioCampaign: "pl_weekend",
    }));
    assert.equal(existing.searchParams.get("data1"), "existing_slot");
    assert.equal(existing.searchParams.get("data2"), "existing_campaign");
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("invalid eHUB links fail closed without adding publisher data", () => {
  const missingCreative = new URL(decorateAwinAffiliateUrl(
    "https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&desturl=https%3A%2F%2Fwww.padabo.pl%2Fexample",
    { market: "pl", category: "battery", scenarioCampaign: "pl_weekend" },
  ));
  assert.equal(missingCreative.searchParams.has("data1"), false);
  assert.equal(missingCreative.searchParams.has("data2"), false);

  const unsafe = new URL(decorateAwinAffiliateUrl(ehub, {
    market: "pl<script>", category: "battery space", scenarioCampaign: "pl weekend<script>",
  }));
  assert.equal(unsafe.searchParams.has("data1"), false);
  assert.equal(unsafe.searchParams.has("data2"), false);
});

test("Polish mature-market renderer sends package and product-card links through affiliate attribution", async () => {
  const source = await readFile(new URL("../src/app-pl.js", import.meta.url), "utf8");
  assert.match(source, /decorateAwinAffiliateUrl\(product\?\.affiliateUrl/);
  assert.match(source, /attributedAwinUrl\(product, category,/);
  assert.match(source, /attributedAwinUrl\(product, product\.category,/);
  assert.match(source, /market:\s*"pl"/);
});
