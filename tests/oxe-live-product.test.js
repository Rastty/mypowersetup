import test from "node:test";
import assert from "node:assert/strict";
import { parseOxeLiveOffer } from "../src/oxe-live-product.js";
import { syncOxeMarket } from "../scripts/lib/sync-oxe.mjs";

const table = (stock, price) => `<section>Unrelated product: in stock 999 €</section>
  <form class="thumbForm"><table class="cislaTab">
  <tr><td><span>${stock}</span></td></tr>
  <tr class="cena"><td style=font-size:22px;>${price}</td></tr>
  </table></form>`;

test("OXE live product reads each local store's public stock and currency, not a sidebar", () => {
  const examples = [
    ["ro", "în stoc", "1 210,91 Lei", 1210.91],
    ["sk", "skladom", "215,85 €", 215.85],
    ["pl", "w magazynie", "1 128,35 zł", 1128.35],
    ["hu", "raktáron", "372 168 Ft", 372168],
    ["si", "Na zalogi", "1 245,96 €", 1245.96],
  ];
  for (const [market, stock, price, numeric] of examples) {
    assert.deepEqual(parseOxeLiveOffer(table(stock, price), market), {
      available: true, price: numeric, evidence: "live_in_stock",
    }, market);
  }
});

test("out-of-stock, invalid prices and unrelated public stock fail closed in other OXE stores", () => {
  const stockCases = [
    ["pl", "brak na stanie", "1 297,77 zł", 1297.77],
    ["hu", "nincs raktáron", "865 736 Ft", 865736],
    ["si", "ni na zalogi", "1 245,96 €", 1245.96],
  ];
  for (const [market, status, price, numeric] of stockCases) {
    assert.deepEqual(parseOxeLiveOffer(table(status, price), market), {
      available: false, price: numeric, evidence: "live_out_of_stock",
    }, market);
  }
  assert.equal(parseOxeLiveOffer("<p>skladom 250 €</p>", "sk").available, false);
  assert.equal(parseOxeLiveOffer(table("w magazynie", "2428.38 RON"), "pl").price, null);
  assert.equal(parseOxeLiveOffer(table("raktáron", "103 805,00 Ft"), "hu").price, null);
  assert.equal(parseOxeLiveOffer(table("maybe available", "1 128,35 zł"), "pl").evidence, "stock_unverified");
  assert.throws(() => parseOxeLiveOffer("", "unknown"), /OXE_LIVE_MARKET_UNSUPPORTED/);
});

const cases = [
  { market: "sk", feedId: "OXE8817", name: "OXE Powerstation S400 400W/386Wh", slug: "oxe-powerstation-s400", currency: "EUR", amount: "908.68", page: { redirect: true } },
  { market: "pl", feedId: "OXE8817", name: "OXE Powerstation S400 400W/386Wh", slug: "oxe-powerstation-s400", currency: "PLN", amount: "2428.38", page: { stock: "w magazynie", price: "1 128,35 zł", available: true, livePrice: 1128.35 } },
  { market: "hu", feedId: "OXE8817", name: "OXE Powerstation S400 400W/386Wh", slug: "oxe-powerstation-s400", currency: "HUF", amount: "103805", page: { stock: "nincs raktáron", price: "103 805 Ft", available: false, livePrice: 103805 } },
];

test("SK/PL/HU synchronization refuses redirects and stock conflicts, updates PL sale prices", async () => {
  const hosts = { sk: "oxepower.sk", pl: "oxepower.pl", hu: "oxe.hu" };
  for (const fixture of cases) {
    const configHost = hosts[fixture.market];
    const url = `https://www.${configHost}/${fixture.slug}/`;
    const feed = `<rss xmlns:g="http://base.google.com/ns/1.0"><channel><item>
      <g:id>${fixture.feedId}</g:id><g:title>${fixture.name}</g:title>
      <g:link>${url}</g:link><g:price>${fixture.amount} ${fixture.currency}</g:price>
      <g:brand>OXE</g:brand><g:availability>in stock</g:availability>
    </item></channel></rss>`;
    const fakeFetch = async (requested) => {
      if (String(requested).endsWith(`google-dognet-${fixture.market}.xml`)) return { ok: true, status: 200, url: String(requested), text: async () => feed };
      return { ok: true, status: 200, url: fixture.page.redirect ? `https://www.${configHost}/` : url, text: async () => table(fixture.page.stock, fixture.page.price) };
    };
    const result = await syncOxeMarket(fixture.market, { products: [] }, fakeFetch);
    assert.equal(result.source.liveOfferChecks, 1);
    assert.equal(result.products[0].available, fixture.page.available === true);
    assert.equal(result.products[0].priceCzk, fixture.page.livePrice ?? null);
    assert.equal(result.source.liveOfferRedirects, fixture.page.redirect ? 1 : 0);
  }
});
