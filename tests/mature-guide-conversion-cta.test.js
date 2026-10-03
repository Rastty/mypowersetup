import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { classifyGuideCalculatorLink } from "../src/analytics-links.js";

const markets = [
  {
    prefix: "/pruvodce/",
    promise: "Výpočet je zdarma a bez registrace; po výsledku uvidíte jen produkty, které splňují vypočtené parametry.",
  },
  {
    prefix: "/sk/sprievodca/",
    promise: "Výpočet je bezplatný a bez registrácie; po výsledku uvidíte iba produkty, ktoré spĺňajú vypočítané parametre.",
  },
  {
    prefix: "/pl/poradnik/",
    promise: "Obliczenie jest bezpłatne i nie wymaga rejestracji; po wyniku zobaczysz tylko produkty spełniające obliczone parametry.",
  },
  {
    prefix: "/hu/utmutatok/",
    promise: "A számítás ingyenes és regisztráció nélkül használható; az eredmény után csak a kiszámított paramétereknek megfelelő termékeket látod.",
  },
];

function directGuideRoutes(sitemap, prefix) {
  const routes = [...sitemap.matchAll(/<loc>https:\/\/mypowersetup\.com([^<]*)<\/loc>/g)]
    .map((match) => match[1] || "/")
    .filter((route) => route.startsWith(prefix) && route !== prefix);
  return routes.filter((route) => {
    const remainder = route.slice(prefix.length);
    return remainder.endsWith("/") && !remainder.slice(0, -1).includes("/");
  });
}

function routeFile(route) {
  return `${route.slice(1)}index.html`;
}

const TECHNICAL_ONLY_CTA = new Map([
  ["/pruvodce/kabely-a-pojistky-12-v/", "Výsledek je podklad ke kontrole, nikoli instalační pokyn."],
]);

test("mature-market guide CTAs stay truthful and point to recognized calculator destinations", async () => {
  const sitemap = await readFile("sitemap.xml", "utf8");

  for (const market of markets) {
    const guideRoutes = directGuideRoutes(sitemap, market.prefix);
    assert.equal(guideRoutes.length, 12, `${market.prefix} core guide coverage changed`);

    for (const route of guideRoutes) {
      const file = routeFile(route);
      const html = await readFile(file, "utf8");
      const cta = html.match(/<section class="cta">[\s\S]*?<\/section>/)?.[0] ?? "";
      const technicalOnlyCopy = TECHNICAL_ONLY_CTA.get(route);
      if (technicalOnlyCopy) {
        assert.ok(cta.includes(technicalOnlyCopy), `${file} is missing the technical-only safety promise`);
        assert.ok(!cta.includes(market.promise), `${file} must not promise product matching from a technical-only calculator`);
      } else {
        assert.ok(cta.includes(market.promise), `${file} is missing the conversion promise`);
      }
      const href = cta.match(/<a\s+href="([^"]+)"/)?.[1];
      assert.ok(href && classifyGuideCalculatorLink(href), `${file} does not link to a recognized calculator destination`);
    }
  }
});
