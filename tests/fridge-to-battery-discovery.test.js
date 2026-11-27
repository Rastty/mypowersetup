import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { renderPortugalPrivateContentPage } from "../src/private-content-pt.js";
import { renderSloveniaPrivateContentPage } from "../src/private-content-si.js";
import { publicizeExpansionHtml } from "../src/expansion-publication.js";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const cases = Object.freeze([
  {
    locale: "pl",
    buyer: "/pl/poradnik/pojemnosc-akumulatora-do-kampera/",
    fridge: "/pl/poradnik/zuzycie-lodowki-kompresorowej/",
    anchor: "jak oszacować dobowe zużycie lodówki kompresorowej",
  },
  {
    locale: "hu",
    buyer: "/hu/utmutatok/lakoauto-akkumulator-kapacitas/",
    fridge: "/hu/utmutatok/kompresszoros-hutoszekreny-fogyasztasa/",
    anchor: "kompresszoros hűtőszekrény napi fogyasztásáról szóló útmutatót",
  },
  {
    locale: "pt",
    buyer: "/pt/guias/capacidade-bateria-autocaravana/",
    fridge: "/pt/guias/consumo-frigorifico-compressor-autocaravana/",
    anchor: "guia de consumo do frigorífico de compressor",
    renderer: renderPortugalPrivateContentPage,
  },
  {
    locale: "si",
    buyer: "/si/vodici/kapaciteta-baterije-avtodom/",
    fridge: "/si/vodici/poraba-kompresorski-hladilnik-avtodom/",
    anchor: "dejansko dnevno porabo kompresorskega hladilnika",
    renderer: renderSloveniaPrivateContentPage,
  },
]);

test("battery sizing examples link to matching market fridge evidence before purchase", async () => {
  const sitemap = await read("sitemap.xml");
  for (const { locale, buyer, fridge, anchor } of cases) {
    const [buyerHtml, fridgeHtml] = await Promise.all([
      read(`${buyer.slice(1)}index.html`),
      read(`${fridge.slice(1)}index.html`),
    ]);
    assert.match(buyerHtml, new RegExp(`<html lang="${locale === "si" ? "sl" : locale}"`));
    assert.ok(buyerHtml.includes(`<a href="${fridge}">${anchor}</a>`), `${locale}: contextual fridge source link missing`);
    assert.ok(fridgeHtml.includes(`href="${buyer}"`), `${locale}: fridge guide must lead back to battery sizing`);
    assert.ok(buyerHtml.indexOf(`<a href="${fridge}">${anchor}</a>`) < buyerHtml.indexOf("<aside"), `${locale}: link must be in useful main article content`);
    const dates = [...buyerHtml.matchAll(/"dateModified":"(\d{4}-\d{2}-\d{2})"/g)].map(m=>m[1]);
    assert.equal(dates.length, 1, `${locale}: one structured article date`);
    assert.ok(dates[0] >= "2026-11-17", `${locale}: modified date must not regress`);
    assert.equal(sitemap.split(`<loc>https://mypowersetup.com${buyer}</loc><lastmod>${dates[0]}</lastmod>`).length - 1, 1, `${locale}: exact matching sitemap date`);
    assert.ok(!buyerHtml.includes(`href="${cases.find((item) => item.locale !== locale).fridge}"`), `${locale}: no cross-market fridge link`);
  }
});

test("PT and SI localized handoffs survive a fresh expansion publication render", () => {
  for (const { locale, buyer, fridge, renderer } of cases.filter((item) => item.renderer)) {
    const rendered = publicizeExpansionHtml(renderer(buyer), locale, buyer, { home: false });
    assert.ok(rendered.includes(`href="${fridge}"`), `${locale}: generated article must retain fridge link`);
    assert.ok(rendered.includes('"dateModified":"2026-11-17"'), `${locale}: regenerated metadata must match published date`);
  }
});
