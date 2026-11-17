import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderPrivateMarketSeedPage } from "../src/private-market-page.js";
import { PT_MARKET_SEED } from "../src/market-seed-pt.js";
import { RO_MARKET_SEED } from "../src/market-seed-ro.js";
import { SI_MARKET_SEED } from "../src/market-seed-si.js";
import { addExpansionHomeAlternate, publicizeExpansionHtml } from "../src/expansion-publication.js";

const CASES = [
  ["pt", PT_MARKET_SEED, ["/pt/guias/", "/pt/metodologia/", "/pt/sobre-o-projeto/"], ["/pt/afiliacao/", "/pt/privacidade/"]],
  ["ro", RO_MARKET_SEED, ["/ro/ghiduri/", "/ro/metodologie/", "/ro/despre-proiect/"], ["/ro/afiliere/", "/ro/confidentialitate/"]],
  ["si", SI_MARKET_SEED, ["/si/vodici/", "/si/metodologija/", "/si/o-projektu/"], ["/si/affiliate/", "/si/zasebnost/"]],
];

for (const [market, seed, headerLinks, footerOnlyLinks] of CASES) {
  test(`${market} seed keeps three useful primary links, full trust footer and cache-busted calculator`, () => {
    const html = renderPrivateMarketSeedPage(seed);
    const header = html.match(/<header class="site-header">([\s\S]*?)<\/header>/)?.[1] || "";
    const footer = html.match(/<footer class="expansion-footer">([\s\S]*?)<\/footer>/)?.[1] || "";
    assert.equal((header.match(/class="header-link"/g) || []).length, 3);
    for (const href of headerLinks) assert.match(header, new RegExp(`href="${href.replaceAll("/", "\\/")}"`));
    for (const href of [...headerLinks, ...footerOnlyLinks]) assert.match(footer, new RegExp(`href="${href.replaceAll("/", "\\/")}"`));
    assert.equal(footer.includes("</a><a"), false, "footer links need a wrapping opportunity on narrow screens");
    assert.match(html, /expansion-calculator-browser\.js\?v=20261117-pq-region1/);
  });
}

test("home publicizer does not mistake body language-switch hreflang for head alternates", () => {
  const html = '<html><head></head><body><nav class="expansion-nav"><a class="header-link language-switch" href="/" hreflang="cs-CZ">CZ</a></nav></body></html>';
  const output = publicizeExpansionHtml(html, "ro", "/ro/", { home: true });
  const head = output.match(/<head>([\s\S]*?)<\/head>/)?.[1] || "";
  for (const locale of ["cs-CZ", "sk-SK", "pl-PL", "hu-HU", "pt-PT", "sl-SI", "ro-RO", "x-default"]) {
    assert.match(head, new RegExp(`rel="alternate" hreflang="${locale}"`));
  }
});

test("alternate injection ignores matching hreflang attributes outside head", () => {
  const html = '<html><head><link rel="alternate" hreflang="x-default" href="https://mypowersetup.com/" /></head><body><a hreflang="sl-SI" href="/si/">SI</a></body></html>';
  const output = addExpansionHomeAlternate(html, "si");
  const head = output.match(/<head>([\s\S]*?)<\/head>/)?.[1] || "";
  assert.match(head, /hreflang="sl-SI" href="https:\/\/mypowersetup.com\/si\/"/);
});

test("expansion desktop nav gets the same spaced flex layout as core nav and collapses on mobile", async () => {
  const [css, browserSmoke] = await Promise.all([
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
    readFile(new URL("../scripts/smoke-public-mobile.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(css, /\.header-nav, \.expansion-nav \{ display: flex; align-items: center; gap: 24px; \}/);
  assert.match(css, /\.header-nav, \.expansion-nav \{ gap: 0; \}/);
  assert.match(browserSmoke, /smokeExpansionNavigation\(cdp\)/);
  assert.match(browserSmoke, /desktop guide\/method\/about links touch/);
});

test("PT, RO and SI homepage heroes fill the available width instead of reserving an empty visual column", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(css, /\.hero:has\(> \.hero-copy:only-child\) \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(css, /\.hero:has\(> \.hero-copy:only-child\) \.hero-copy \{ max-width: 980px; \}/);
  for (const market of ["pt", "ro", "si"]) {
    const html = await readFile(new URL(`../${market}/index.html`, import.meta.url), "utf8");
    const hero = html.match(/<section class="hero"[\s\S]*?<\/section>/)?.[0] || "";
    assert.match(hero, /<div class="hero-copy">/);
    assert.doesNotMatch(hero, /class="hero-visual"/, `${market}: visual column requires a real illustration`);
  }
});
