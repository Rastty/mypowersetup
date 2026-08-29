import test from "node:test";
import assert from "node:assert/strict";
import {
  buildArukeresoDognetDeeplink,
  buildDognetDeeplink,
  isArukeresoHost,
  validateDognetCampaignLink,
} from "../src/dognet-affiliate.js";

const campaign = "https://login.dognet.sk/scripts/fc27g82d?a_aid=publisher&a_bid=campaign&chan=mypowersetup_hu&utm_source=dognet";
const product = "https://napelem-toltesvezerlo.arukereso.hu/victron/smartsolar-mppt-100-30-p123456789/";

test("Dognet campaign link requires publisher, campaign and Arukereso channel tracking", () => {
  const parsed = validateDognetCampaignLink(campaign);
  assert.equal(parsed.searchParams.get("a_aid"), "publisher");
  assert.equal(parsed.searchParams.get("a_bid"), "campaign");
  assert.equal(parsed.searchParams.get("chan"), "mypowersetup_hu");
  assert.throws(
    () => validateDognetCampaignLink("https://login.dognet.sk/scripts/fc27g82d?a_aid=x&a_bid=y"),
    /MISSING_CHANNEL/
  );
});

test("Arukereso deeplink preserves every campaign parameter and adds only confirmed destination parameter", () => {
  const affiliate = new URL(buildArukeresoDognetDeeplink({
    campaignLink: campaign,
    destinationUrl: product,
    destinationParam: "data2",
  }));
  assert.equal(affiliate.hostname, "login.dognet.sk");
  assert.equal(affiliate.searchParams.get("a_aid"), "publisher");
  assert.equal(affiliate.searchParams.get("a_bid"), "campaign");
  assert.equal(affiliate.searchParams.get("chan"), "mypowersetup_hu");
  assert.equal(affiliate.searchParams.get("utm_source"), "dognet");
  assert.equal(affiliate.searchParams.get("data2"), product);
});

test("Dognet adapter refuses to guess whether campaign uses desturl or data2", () => {
  assert.throws(() => buildDognetDeeplink({
    campaignLink: campaign,
    destinationUrl: product,
    destinationHost: "arukereso.hu",
    destinationParam: "url",
  }), /DESTINATION_PARAM_UNCONFIRMED/);
});

test("Arukereso destination must stay on Arukereso and cannot be homepage", () => {
  assert.equal(isArukeresoHost("arukereso.hu"), true);
  assert.equal(isArukeresoHost("napelem-toltesvezerlo.arukereso.hu"), true);
  assert.equal(isArukeresoHost("example.hu"), false);
  assert.throws(() => buildArukeresoDognetDeeplink({
    campaignLink: campaign,
    destinationUrl: "https://example.hu/product",
    destinationParam: "data2",
  }), /ARUKERESO_DESTINATION_INVALID/);
  assert.throws(() => buildArukeresoDognetDeeplink({
    campaignLink: campaign,
    destinationUrl: "https://www.arukereso.hu/",
    destinationParam: "data2",
  }), /MUST_BE_DEEP/);
});

test("Dognet campaign link cannot point to a lookalike host", () => {
  assert.throws(
    () => validateDognetCampaignLink("https://login.dognet.sk.evil.example/scripts/x?a_aid=a&a_bid=b&chan=c"),
    /INVALID_HOST/
  );
});
