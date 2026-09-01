import test from "node:test";
import assert from "node:assert/strict";
import { syncPadaboMarket } from "../scripts/lib/sync-padabo.mjs";

const CASES = [
  ["sk", "padabo_sk", "https://www.padabo.sk/solarny-panel-200-w/", "Solárny panel 200 W"],
  ["pl", "padabo_pl", "https://www.padabo.pl/panel-fotowoltaiczny-200-w/", "Panel fotowoltaiczny 200 W"],
  ["hu", "padabo_hu", "https://www.padabo.hu/napelem-200-w/", "Napelem 200 W"],
];

function feed(url, title) {
  return `<rss><channel><item><g:id>panel-200</g:id><g:title>${title}</g:title><g:description>${"Monocrystalline caravan panel with verified specifications. ".repeat(20)}</g:description><g:link>${url}</g:link><g:price>199 EUR</g:price><g:availability>in_stock</g:availability></item></channel></rss>`;
}

function atomFeed(url, title) {
  return `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:g="http://base.google.com/ns/1.0"><entry><title>${title}</title><link>${url}</link><g:description>Monokryštalický solárny panel pre karavan, výkon 200 W.</g:description><g:id>atom-panel</g:id><g:price>199.00 EUR</g:price><g:availability>in stock</g:availability><g:product_type>Solárne panely</g:product_type></entry></feed>`;
}

for (const [market, merchant, destination, title] of CASES) {
  test(`${market} Padabo feed produces an exact eligible affiliate product`, async () => {
    const result = await syncPadaboMarket(market, { products: [] }, {
      feedUrl: `https://feeds.example.test/${market}.xml`,
      fetchImpl: async () => ({ ok: true, async text() { return feed(destination, title); } }),
    });
    assert.equal(result.source.status, "ok");
    assert.equal(result.products.length, 1);
    assert.equal(result.products[0].merchant, merchant);
    assert.equal(result.products[0].category, "solar_panel");
    assert.equal(result.products[0].available, true);
    assert.equal(result.products[0].description.length, 500);
    assert.equal(new URL(result.products[0].affiliateUrl).searchParams.get("desturl"), destination);
  });
}

test("Padabo Atom entry feed is parsed for SK and PL exports", async () => {
  const destination = "https://www.padabo.sk/solarny-panel-200-w/";
  const result = await syncPadaboMarket("sk", { products: [] }, {
    feedUrl: "https://feeds.example.test/padabo-sk.xml",
    fetchImpl: async () => ({ ok: true, async text() { return atomFeed(destination, "Solárny panel 200 W"); } }),
  });
  assert.equal(result.source.status, "ok");
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].merchant, "padabo_sk");
  assert.equal(result.products[0].category, "solar_panel");
});

test("Padabo sync preserves stale diagnostics but disables recommendations on a feed failure", async () => {
  const previous = { products: [{ merchant: "padabo_pl", id: "safe", available: true }] };
  const result = await syncPadaboMarket("pl", previous, {
    feedUrl: "https://feeds.example.test/pl.xml",
    fetchImpl: async () => { throw new TypeError("fetch failed"); },
  });
  assert.equal(result.source.status, "stale");
  assert.deepEqual(result.products, [{ ...previous.products[0], available: false, staleSource: true }]);
});

test("Padabo sync disables preserved recommendations when the workflow secret is missing", async () => {
  const previous = { products: [{ merchant: "padabo_sk", id: "safe", available: true }] };
  const result = await syncPadaboMarket("sk", previous);
  assert.equal(result.source.status, "stale");
  assert.equal(result.products[0].available, false);
  assert.equal(result.products[0].staleSource, true);
});
