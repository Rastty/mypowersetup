import test from "node:test";
import assert from "node:assert/strict";
import { syncOxeMarket } from "../scripts/lib/sync-oxe.mjs";

const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0"><channel><item>
  <g:id>S400</g:id>
  <g:title>OXE Powerstation S400 - večnamenski polnilni generator 400W / 386Wh</g:title>
  <g:link>https://www.oxepower.si/oxe-powerstation-s400-vecnamenski-polnilni-generator-400w386wh/</g:link>
  <g:price>257.17 EUR</g:price>
  <g:brand>OXE</g:brand>
  <g:product_type>Generatorji električne energije</g:product_type>
  <g:availability>in_stock</g:availability>
</item></channel></rss>`;

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return body; },
  };
}

function fakeFetch(productPage) {
  return async (url) => {
    if (String(url).endsWith("google-dognet-si.xml")) return response(feedXml);
    if (String(url).includes("oxe-powerstation-newsmy-s2400-vecnamenski-polnilni-napajalnik-2400w20475wh")) return response(productPage);
    return response("", 404);
  };
}

test("Slovenia sync adds S2400 only after its exact live page confirms stock", async () => {
  const catalog = await syncOxeMarket("si", { products: [] }, fakeFetch(`
    <html><body>
      <h1>OXE Powerstation Newsmy S2400 - večnamenski polnilni napajalnik 2400W/2047,5Wh</h1>
      <div>Na zalogi</div>
    </body></html>
  `));
  const s2400 = catalog.products.find((product) => /S2400/.test(product.name));
  assert.ok(s2400);
  assert.equal(s2400.available, true);
  assert.equal(s2400.merchant, "oxe_si");
  assert.equal(s2400.specs.capacityWh, 2047.5);
  assert.equal(s2400.specs.powerW, 2400);
  assert.equal(s2400.specs.solarInputW, 1200);
  assert.equal(s2400.specs.dcOutputA, 10);
  assert.equal(s2400.specs.pureSine, true);
  assert.match(s2400.affiliateUrl, /go\.dognet\.com/);
  assert.equal(catalog.source.liveSupplements, 1);
});

test("Slovenia sync does not invent S2400 availability when the live page says out of stock", async () => {
  const catalog = await syncOxeMarket("si", { products: [] }, fakeFetch(`
    <html><body>
      <h1>OXE Powerstation Newsmy S2400 - večnamenski polnilni napajalnik 2400W/2047,5Wh</h1>
      <div>ni na zalogi</div>
    </body></html>
  `));
  assert.equal(catalog.products.some((product) => /S2400/.test(product.name)), false);
  assert.equal(catalog.source.liveSupplements, 0);
});

test("Slovenia sync does not accept a stock marker from an unrelated page", async () => {
  const catalog = await syncOxeMarket("si", { products: [] }, fakeFetch(`
    <html><body><h1>Unrelated OXE product</h1><div>Na zalogi</div></body></html>
  `));
  assert.equal(catalog.products.some((product) => /S2400/.test(product.name)), false);
  assert.equal(catalog.source.liveSupplements, 0);
});


test("stale fallback drops a legacy solar panel carrying copied power-station specs", async () => {
  const legacyCorruptedPanel = {
    id: "oxe_si:OXE8020",
    merchant: "oxe_si",
    name: "OXE SP100W - Solarni panel za elektrarno OXE Powerstation S200, S400, P600, S1000",
    category: "power_station",
    verifiedAt: "2026-08-31",
    specs: { capacityWh: 193, powerW: 200, solarInputW: 50, dcOutputA: 8, pureSine: true },
  };
  const catalog = await syncOxeMarket(
    "si",
    { products: [legacyCorruptedPanel] },
    async () => response("", 503),
  );

  assert.equal(catalog.source.status, "error");
  assert.deepEqual(catalog.products, []);
});
