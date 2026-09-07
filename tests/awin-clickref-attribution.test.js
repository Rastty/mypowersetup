import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { decorateAwinAffiliateUrl } from "../src/awin-attribution.js";

const awin = "https://www.awin1.com/cread.php?awinmid=97025&awinaffid=3044971&ued=https%3A%2F%2Fwww.ipowerqueen.de%2Fen%2Fproducts%2Fexample";

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

test("non-Awin and malformed affiliate URLs are unchanged", () => {
  const ehub = "https://ehub.cz/system/scripts/click.php?a_aid=x&a_bid=y&desturl=https%3A%2F%2Fampul.eu%2F";
  assert.equal(decorateAwinAffiliateUrl(ehub, {
    market: "ro", category: "dc_charger", recommendationRole: "recommended", routePriority: "primary",
  }), ehub);
  assert.equal(decorateAwinAffiliateUrl("not a url", { market: "pt", category: "battery" }), "not a url");
});

test("unsafe attribution values are never written to the affiliate URL", () => {
  const url = new URL(decorateAwinAffiliateUrl(awin, {
    market: "pt<script>",
    category: "battery space",
    recommendationRole: "unknown",
    routePriority: "other",
  }));
  assert.equal(url.searchParams.has("clickref"), false);
  assert.equal(url.searchParams.has("clickref2"), false);
  assert.equal(url.searchParams.has("clickref3"), false);
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
