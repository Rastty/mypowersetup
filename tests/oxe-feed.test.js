import test from "node:test";
import assert from "node:assert/strict";
import { isOxeTechnicallyCompletePowerStation, parseOxeGoogleFeed } from "../src/oxe-feed.js";
import { validateOxeDognetDeeplink } from "../src/oxe-affiliate.js";

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0"><channel>
  <item>
    <g:id>S400</g:id>
    <g:title>OXE Powerstation S400 400W/386Wh</g:title>
    <g:description>Portable power station for camping.</g:description>
    <g:link>https://www.oxepower.pl/oxe-powerstation-s400-wielofunkcyjny-generator-ladujacy-400w386wh-torba/</g:link>
    <g:image_link>https://www.oxepower.pl/user/shop/big/s400.jpg</g:image_link>
    <g:price>1999.00 PLN</g:price>
    <g:brand>OXE</g:brand>
    <g:product_type>Powerstation</g:product_type>
    <g:availability>in_stock</g:availability>
  </item>
  <item>
    <g:id>SP100W</g:id>
    <g:title>OXE solar panel SP100W</g:title>
    <g:link>https://www.oxepower.pl/oxe-panel-solarny-sp100w/</g:link>
    <g:price>599.00 PLN</g:price>
    <g:brand>OXE</g:brand>
    <g:product_type>Solar panels</g:product_type>
    <g:availability>in_stock</g:availability>
  </item>
  <item>
    <g:id>GF22</g:id>
    <g:title>OXE GF-22 lokalizator GPS</g:title>
    <g:link>https://www.oxepower.pl/oxe-gf-22-lokalizator-gps-pl/</g:link>
    <g:price>199.00 PLN</g:price>
    <g:brand>OXE</g:brand>
    <g:product_type>GPS</g:product_type>
    <g:availability>in_stock</g:availability>
  </item>
</channel></rss>`;

const s2400SiXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0"><channel><item>
  <g:id>S2400</g:id>
  <g:title>OXE Powerstation Newsmy S2400 - večnamenski polnilni napajalnik 2400W/2047,5Wh</g:title>
  <g:link>https://www.oxepower.si/oxe-powerstation-newsmy-s2400-vecnamenski-polnilni-napajalnik-2400w20475wh/</g:link>
  <g:price>1245.96 EUR</g:price>
  <g:brand>OXE</g:brand>
  <g:product_type>Generatorji električne energije</g:product_type>
  <g:availability>in_stock</g:availability>
</item></channel></rss>`;

test("OXE Google feed keeps local products but classifies only relevant power products", () => {
  const products = parseOxeGoogleFeed(xml, "pl");
  assert.equal(products.length, 3);
  const station = products.find((product) => product.id.endsWith(":S400"));
  const panel = products.find((product) => product.id.endsWith(":SP100W"));
  const gps = products.find((product) => product.id.endsWith(":GF22"));
  assert.equal(station.category, "power_station");
  assert.deepEqual(station.specs, { capacityWh: 385.56, powerW: 400, solarInputW: 90, dcOutputA: 8, pureSine: true });
  assert.equal(station.priceCurrency, "PLN");
  assert.equal(station.available, true);
  assert.equal(isOxeTechnicallyCompletePowerStation(station), true);
  assert.equal(panel.category, "solar_panel");
  assert.equal(panel.specs.powerW, 100);
  assert.equal(gps.category, "other");
});

test("verified OXE S2400 carries the complete high-autonomy electrical envelope", () => {
  const [station] = parseOxeGoogleFeed(s2400SiXml, "si");
  assert.equal(station.category, "power_station");
  assert.equal(station.available, true);
  assert.deepEqual(station.specs, { capacityWh: 2047.5, powerW: 2400, solarInputW: 1200, dcOutputA: 10, pureSine: true });
  assert.equal(isOxeTechnicallyCompletePowerStation(station), true);
  assert.match(station.specEvidenceUrl, /oxe\.ro\/oxe-powerstation-newsmy-s2400/);
});

test("OXE feed products receive an exact Dognet deeplink to the feed destination", () => {
  const station = parseOxeGoogleFeed(xml, "pl").find((product) => product.category === "power_station");
  const parsed = validateOxeDognetDeeplink("pl", station.affiliateUrl);
  assert.equal(parsed.destination, station.productUrl);
});

test("cross-market feed destination is dropped instead of silently relinked", () => {
  const products = parseOxeGoogleFeed(xml, "ro");
  assert.equal(products.length, 0);
});
