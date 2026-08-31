import test from "node:test";
import assert from "node:assert/strict";
import { buildOxeDognetDeeplink, getOxeMarket, OXE_MARKETS, validateOxeDognetDeeplink } from "../src/oxe-affiliate.js";

const examples = Object.freeze({
  ro: "https://go.dognet.com/?chid=2mRVFbhJ&url=https%3A%2F%2Fwww.oxe.ro%2Foxe-gf-22-localizator-gps-ro%2F",
  si: "https://go.dognet.com/?chid=2mRVFbhJ&url=https%3A%2F%2Fwww.oxepower.si%2Foxe-gf-22-gps-lokator-si%2F",
  sk: "https://go.dognet.com/?chid=2mRVFbhJ&url=https%3A%2F%2Fwww.oxepower.sk%2Foxe-gf-22-gps-lokator-sk%2F",
  pl: "https://go.dognet.com/?chid=2mRVFbhJ&url=https%3A%2F%2Fwww.oxepower.pl%2Foxe-gf-22-lokalizator-gps-pl%2F",
  hu: "https://go.dognet.com/?chid=v9mcMMKw&url=https%3A%2F%2Fwww.oxe.hu%2Foxe-gf-22-gps-lokator-hu%2F",
});

test("OXE config uses the five approved market feeds and exact Dognet channels", () => {
  assert.deepEqual(Object.keys(OXE_MARKETS).sort(), ["hu", "pl", "ro", "si", "sk"]);
  assert.equal(getOxeMarket("pl").feedUrl, "https://www.oxepower.pl/export/google-dognet-pl.xml");
  assert.equal(getOxeMarket("si").feedUrl, "https://www.oxepower.si/export/google-dognet-si.xml");
  assert.equal(getOxeMarket("ro").feedUrl, "https://www.oxe.ro/export/google-dognet-ro.xml");
  assert.equal(getOxeMarket("hu").feedUrl, "https://www.oxe.hu/export/google-dognet-hu.xml");
  assert.equal(getOxeMarket("sk").feedUrl, "https://www.oxepower.sk/export/google-dognet-sk.xml");
  assert.equal(getOxeMarket("hu").chid, "v9mcMMKw");
  for (const market of ["pl", "ro", "si", "sk"]) assert.equal(getOxeMarket(market).chid, "2mRVFbhJ");
});

test("supplied Dognet deeplink examples validate exactly for their own market", () => {
  for (const [market, example] of Object.entries(examples)) {
    const parsed = validateOxeDognetDeeplink(market, example);
    assert.equal(parsed.merchant, getOxeMarket(market).merchant);
    assert.equal(new URL(parsed.destination).hostname.replace(/^www\./, ""), getOxeMarket(market).hostname);
  }
});

test("generated OXE deeplink preserves exact local product destination", () => {
  const product = "https://www.oxepower.pl/oxe-powerstation-s400-wielofunkcyjny-generator-ladujacy-400w386wh-torba/";
  const url = buildOxeDognetDeeplink("pl", product);
  const parsed = validateOxeDognetDeeplink("pl", url);
  assert.equal(parsed.destination, product);
  assert.equal(new URL(url).searchParams.get("chid"), "2mRVFbhJ");
});

test("OXE deeplinks fail closed for wrong channel, cross-market host and homepage", () => {
  assert.throws(() => validateOxeDognetDeeplink("hu", examples.pl), /OXE_DOGNET_CHANNEL_INVALID/);
  assert.throws(() => buildOxeDognetDeeplink("ro", "https://www.oxepower.pl/product/test/"), /OXE_DESTINATION_HOST_INVALID/);
  assert.throws(() => buildOxeDognetDeeplink("sk", "https://www.oxepower.sk/"), /OXE_DESTINATION_MUST_BE_DEEP/);
  assert.throws(() => validateOxeDognetDeeplink("pl", "https://go.dognet.com.evil.example/?chid=2mRVFbhJ&url=https%3A%2F%2Fwww.oxepower.pl%2Fx%2F"), /OXE_DOGNET_HOST_INVALID/);
});
