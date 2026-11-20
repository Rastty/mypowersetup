import test from "node:test";
import assert from "node:assert/strict";
import { parseOxeRomaniaLiveOffer } from "../src/oxe-ro-live-product.js";
import { syncOxeMarket } from "../scripts/lib/sync-oxe.mjs";

const purchaseTable = (stock, price) => `<html><body>
  <section class="unrelated">Another OXE model: în stoc, 199,99 Lei</section>
  <div class="thumbForm"><table class="cislaTab">
    <tr><td colspan="2"><span style="color:green">${stock}</span></td></tr>
    <tr><td>Preț inițial:</td><td>2 018,18 Lei</td></tr>
    <tr class="cena"><td style=font-size:22px;>${price}</td><td>1 000,75 Lei fără TVA</td></tr>
  </table></div>
</body></html>`;

test("Romanian product parser uses the exact purchase table, not the old feed/list price or unrelated stock", () => {
  assert.deepEqual(parseOxeRomaniaLiveOffer(purchaseTable("în stoc", "1 210,91 Lei")), {
    available: true, price: 1210.91, evidence: "live_in_stock",
  });
  assert.deepEqual(parseOxeRomaniaLiveOffer(purchaseTable("nu este în stoc", "1 392,73 Lei")), {
    available: false, price: 1392.73, evidence: "live_out_of_stock",
  });
  assert.deepEqual(parseOxeRomaniaLiveOffer("<div>în stoc 99,99 Lei</div>"), {
    available: false, price: null, evidence: "purchase_table_missing",
  });
  assert.deepEqual(parseOxeRomaniaLiveOffer(purchaseTable("în stoc", "contactați-ne")), {
    available: true, price: null, evidence: "price_unverified",
  });
});

const productRows = [
  ["OXE8817", "OXE Powerstation S400 400W/386Wh", "oxe-powerstation-s400-generator-de-incarcare-multifunctional", "1984.82", "in stock"],
  ["OXE8818", "OXE Powerstation P600 600W/578Wh", "oxe-powerstation-p600-generator-multifunctional", "2282.84", "in stock"],
  ["OXE12269", "OXE Powerstation S400 with camera", "centrala-electrica-oxe-powerstation-s400-si-camera", "1984.82", "in stock"],
];
const feedXml = `<rss xmlns:g="http://base.google.com/ns/1.0"><channel>${productRows.map(([id, name, slug, price, stock]) => `<item>
  <g:id>${id}</g:id><g:title>${name}</g:title>
  <g:link>https://www.oxe.ro/${slug}/</g:link><g:price>${price} RON</g:price>
  <g:brand>OXE</g:brand><g:availability>${stock}</g:availability>
</item>`).join("")}</channel></rss>`;

function response(url, body, status = 200) {
  return { ok: status >= 200 && status < 300, status, url, text: async () => body };
}

test("Romanian sync reconciles sale prices, fails closed on stock conflicts and homepage redirects", async () => {
  const fetchImpl = async (url) => {
    const href = String(url);
    if (href.endsWith("google-dognet-ro.xml")) return response(href, feedXml);
    if (href.includes("s400-generator")) return response(href, purchaseTable("în stoc", "1 210,91 Lei"));
    if (href.includes("p600-generator")) return response(href, purchaseTable("nu este în stoc", "1 392,73 Lei"));
    return response("https://www.oxe.ro/", purchaseTable("în stoc", "999,99 Lei"));
  };
  const result = await syncOxeMarket("ro", { products: [] }, fetchImpl);
  assert.equal(result.source.status, "ok");
  assert.equal(result.source.liveOfferChecks, 3);
  assert.equal(result.source.liveOfferVerified, 2);
  assert.equal(result.source.liveOfferRedirects, 1);
  const s400 = result.products.find((p) => p.id === "oxe_ro:OXE8817");
  const p600 = result.products.find((p) => p.id === "oxe_ro:OXE8818");
  const homepageRedirect = result.products.find((p) => p.id === "oxe_ro:OXE12269");
  assert.equal(s400.available, true);
  assert.equal(s400.priceCzk, 1210.91);
  assert.equal(s400.priceCurrency, "RON");
  assert.equal(p600.available, false);
  assert.equal(p600.priceCzk, 1392.73);
  assert.equal(homepageRedirect.available, false);
  assert.equal(homepageRedirect.priceCzk, null);
});

test("Romanian sync suppresses unverified pages even when the merchant feed claims stock", async () => {
  const fetchImpl = async (url) => {
    const href = String(url);
    if (href.endsWith("google-dognet-ro.xml")) return response(href, feedXml);
    return response(href, "<html><h1>Unavailable product</h1><p>în stoc</p></html>");
  };
  const result = await syncOxeMarket("ro", { products: [] }, fetchImpl);
  assert.equal(result.products.every((p) => p.available === false && p.priceCzk === null), true);
  assert.equal(result.source.liveOfferVerified, 0);
});
