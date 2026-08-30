import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseAllpowersPtProducts, validatePtCatalog } from "../src/products-pt.js";
import { parseAllpowersPtDeeplink } from "../src/affiliate-allpowers-pt.js";
import { syncAllpowersPt } from "../scripts/lib/sync-allpowers-pt.mjs";

function product(overrides = {}) {
  return {
    id: 1001,
    title: "ALLPOWERS SF100 Painel Solar Flexível 100W",
    handle: "sf100-painel-solar-flexivel-100w",
    product_type: "Solar Panel",
    vendor: "ALLPOWERS",
    body_html: "<p>Painel solar flexível de 100 W para utilização móvel.</p>",
    variants: [{ price: "129.99", available: true }],
    images: [{ src: "https://cdn.shopify.com/example.jpg" }],
    ...overrides,
  };
}

test("Portugal parser creates exact approved Awin links for safe solar panels", () => {
  const [parsed] = parseAllpowersPtProducts({ products: [product()] });
  assert.equal(parsed.merchant, "allpowers_pt");
  assert.equal(parsed.category, "solar_panel");
  assert.equal(parsed.specs.powerW, 100);
  assert.equal(parsed.priceCurrency, "EUR");
  assert.match(parsed.productUrl, /^https:\/\/allpowers-pt\.com\/products\//);
  const tracking = parseAllpowersPtDeeplink(parsed.affiliateUrl);
  assert.ok(tracking);
  assert.equal(tracking.merchantId, "125820");
  assert.equal(tracking.destinationUrl, parsed.productUrl);
});

test("Portugal parser refuses bundles, tiny panels and malformed handles", () => {
  const payload = { products: [
    product({ id: 1, title: "Kit Gerador Solar ALLPOWERS 100W", handle: "kit-gerador-100w" }),
    product({ id: 2, title: "Painel Solar 40W", handle: "painel-solar-40w", body_html: "40 W" }),
    product({ id: 3, handle: "unsafe/path" }),
  ] };
  assert.deepEqual(parseAllpowersPtProducts(payload), []);
});

test("Portugal power stations fail closed until electrical limits are explicitly verified", () => {
  const station = product({
    id: 2001,
    title: "ALLPOWERS S1500 Plus Estação de Energia Portátil 1500W",
    handle: "s1500-plus-estacao-de-energia-portatil",
    product_type: "Portable Power Station",
    body_html: "Capacidade 1092 Wh, potência 1500 W.",
  });
  assert.deepEqual(parseAllpowersPtProducts({ products: [station] }), []);

  const productUrl = "https://allpowers-pt.com/products/s1500-plus-estacao-de-energia-portatil";
  const [verified] = parseAllpowersPtProducts({ products: [station] }, { verifiedProducts: [{
    productUrl,
    verifiedAt: "2026-08-29",
    specs: { capacityWh: 1092, powerW: 1500, solarInputW: 400, dcOutputA: 10 },
  }] });
  assert.equal(verified.category, "power_station");
  assert.equal(verified.verifiedAt, "2026-08-29");
  assert.equal(verified.specs.solarInputW, 400);
});

test("Portugal verified power-station evidence contains exact local product pages and critical limits", async () => {
  const evidence = JSON.parse(await readFile(new URL("../data/products-pt-verified.json", import.meta.url), "utf8"));
  assert.ok(evidence.products.length >= 3);
  for (const item of evidence.products) {
    const url = new URL(item.productUrl);
    assert.equal(url.hostname, "allpowers-pt.com");
    assert.match(url.pathname, /^\/products\/[a-z0-9-]+$/i);
    assert.ok(item.verifiedAt);
    assert.ok(item.specs.capacityWh > 0);
    assert.ok(item.specs.powerW > 0);
    assert.ok(item.specs.solarInputW > 0);
    assert.ok(item.specs.dcOutputA > 0);
    assert.equal(item.specs.pureSine, true);
  }
});

test("Portugal catalog rejects foreign merchants and accepts only pt-PT EUR shape", () => {
  const safe = parseAllpowersPtProducts({ products: [product()] });
  const validated = validatePtCatalog({
    generatedAt: "2026-08-29T00:00:00.000Z",
    market: "pt-PT",
    currency: "EUR",
    sources: { allpowers_pt: { status: "ok" } },
    products: safe,
  });
  assert.equal(validated.products.length, 1);
  assert.throws(() => validatePtCatalog({ market: "pt-PT", currency: "EUR", sources: {}, products: [{ ...safe[0], merchant: "allpowers_eu" }] }), /FOREIGN_MERCHANT/);
  assert.throws(() => validatePtCatalog({ market: "pt-BR", currency: "BRL", sources: {}, products: [] }), /MARKET_INVALID/);
});

test("Portugal sync preserves the last safe catalog when the merchant endpoint fails", async () => {
  const previousProduct = parseAllpowersPtProducts({ products: [product()] })[0];
  const result = await syncAllpowersPt({ products: [previousProduct] }, {
    fetchImpl: async () => ({ ok: false, status: 503 }),
  });
  assert.equal(result.source.status, "stale");
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].productUrl, previousProduct.productUrl);
});

test("Portugal first sync fails rather than inventing products when the endpoint is unavailable", async () => {
  await assert.rejects(
    () => syncAllpowersPt({ products: [] }, { fetchImpl: async () => ({ ok: false, status: 503 }) }),
    /HTTP 503/
  );
});
