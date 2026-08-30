import test from "node:test";
import assert from "node:assert/strict";
import { carryCommunityAttributionToUrl } from "../src/community-navigation.js";

const landingSearch = "?utm_source=camperteam&utm_medium=community&utm_campaign=pl_technical_help&utm_content=pl-camperteam-ford-dcdc-202608";

test("carries validated community attribution to a same-origin calculator link", () => {
  const carried = carryCommunityAttributionToUrl("/pl/#kalkulator", {
    search: landingSearch,
    pageUrl: "https://mypowersetup.com/pl/poradnik/jak-dobrac-ladowarke-dc-dc/",
  });
  const url = new URL(carried, "https://mypowersetup.com");
  assert.equal(url.pathname, "/pl/");
  assert.equal(url.hash, "#kalkulator");
  assert.equal(url.searchParams.get("utm_source"), "camperteam");
  assert.equal(url.searchParams.get("utm_medium"), "community");
  assert.equal(url.searchParams.get("utm_campaign"), "pl_technical_help");
  assert.equal(url.searchParams.get("utm_content"), "pl-camperteam-ford-dcdc-202608");
});

test("does not decorate links without validated community attribution", () => {
  const href = "/pl/#kalkulator";
  assert.equal(carryCommunityAttributionToUrl(href, {
    search: "?utm_source=newsletter&utm_medium=email&utm_campaign=pl_technical_help&utm_content=x",
    pageUrl: "https://mypowersetup.com/pl/poradnik/test/",
  }), href);
});

test("does not carry attribution to an external destination", () => {
  const href = "https://example.com/calculator";
  assert.equal(carryCommunityAttributionToUrl(href, {
    search: landingSearch,
    pageUrl: "https://mypowersetup.com/pl/poradnik/test/",
  }), href);
});

test("keeps malformed destinations untouched", () => {
  const href = "http://[invalid";
  assert.equal(carryCommunityAttributionToUrl(href, {
    search: landingSearch,
    pageUrl: "https://mypowersetup.com/pl/poradnik/test/",
  }), href);
});
