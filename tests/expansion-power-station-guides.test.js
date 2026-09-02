import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderPortugalPrivateContentPage } from "../src/private-content-pt.js";
import { renderRomaniaPrivateContentPage } from "../src/private-content-ro.js";
import { renderSloveniaPrivateContentPage } from "../src/private-content-si.js";
import { expansionPublicationManifest, publicizeExpansionHtml } from "../src/expansion-publication.js";

const GUIDES = Object.freeze([
  Object.freeze({ market: "pt", locale: "pt-PT", route: "/pt/guias/power-station-ou-instalacao-fixa-autocaravana/", path: "pt/guias/power-station-ou-instalacao-fixa-autocaravana/index.html", render: renderPortugalPrivateContentPage, calculator: "/pt/#calculator-preview", system: "/pt/guias/cabos-fusiveis-12v-autocaravana/", local: /Power station ou instalação fixa/ }),
  Object.freeze({ market: "ro", locale: "ro-RO", route: "/ro/ghiduri/statie-portabila-sau-instalatie-fixa-autorulota/", path: "ro/ghiduri/statie-portabila-sau-instalatie-fixa-autorulota/index.html", render: renderRomaniaPrivateContentPage, calculator: "/ro/#calculator-preview", system: "/ro/ghiduri/cabluri-sigurante-12v-autorulota/", local: /Stație portabilă sau instalație fixă/ }),
  Object.freeze({ market: "si", locale: "sl-SI", route: "/si/vodici/prenosna-elektrarna-ali-fiksna-instalacija-avtodom/", path: "si/vodici/prenosna-elektrarna-ali-fiksna-instalacija-avtodom/index.html", render: renderSloveniaPrivateContentPage, calculator: "/si/#calculator-preview", system: "/si/vodici/kabli-varovalke-12v-avtodom/", local: /Prenosna elektrarna ali fiksna instalacija/ }),
]);

for (const guide of GUIDES) {
  test(`${guide.market} power-station decision guide is substantial, local and conversion-ready`, async () => {
    assert.ok(expansionPublicationManifest(guide.market).some(({ route }) => route === guide.route));
    const privateHtml = guide.render(guide.route);
    const generated = publicizeExpansionHtml(privateHtml, guide.market, guide.route);
    const committed = await readFile(guide.path, "utf8");
    assert.equal(committed.trimEnd(), generated.trimEnd());
    assert.match(committed, guide.local);
    assert.ok(committed.includes(`rel="canonical" href="https://mypowersetup.com${guide.route}"`));
    assert.ok(committed.includes(`href="${guide.calculator}"`));
    assert.ok(committed.includes(`href="${guide.system}"`));
    assert.match(committed, /data-power-station-growth=/);
    assert.match(committed, /data-power-station-schema/);
    assert.match(committed, /data-power-station-faq/);
    assert.ok(committed.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").length > 4_000);
    for (const locale of ["pt-PT", "ro-RO", "sl-SI"]) assert.match(committed, new RegExp(`hreflang="${locale}"`));
  });
}

test("new expansion decision guides are published in discovery surfaces and local hubs", async () => {
  const [sitemap, llms, ptHub, roHub, siHub] = await Promise.all([
    readFile("sitemap.xml", "utf8"),
    readFile("llms.txt", "utf8"),
    readFile("pt/guias/index.html", "utf8"),
    readFile("ro/ghiduri/index.html", "utf8"),
    readFile("si/vodici/index.html", "utf8"),
  ]);
  for (const guide of GUIDES) {
    assert.ok(sitemap.includes(guide.route));
    assert.ok(llms.includes(guide.route));
  }
  assert.match(ptHub, /power-station-ou-instalacao-fixa-autocaravana/);
  assert.match(roHub, /statie-portabila-sau-instalatie-fixa-autorulota/);
  assert.match(siHub, /prenosna-elektrarna-ali-fiksna-instalacija-avtodom/);
});
