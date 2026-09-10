import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const markets = [
  {
    prefix: "/pruvodce/",
    calculator: "/#kalkulator",
    promise: "Výpočet je zdarma a bez registrace; po výsledku uvidíte jen produkty, které splňují vypočtené parametry.",
  },
  {
    prefix: "/sk/sprievodca/",
    calculator: "/sk/#kalkulator",
    promise: "Výpočet je bezplatný a bez registrácie; po výsledku uvidíte iba produkty, ktoré spĺňajú vypočítané parametre.",
  },
  {
    prefix: "/pl/poradnik/",
    calculator: "/pl/#kalkulator",
    promise: "Obliczenie jest bezpłatne i nie wymaga rejestracji; po wyniku zobaczysz tylko produkty spełniające obliczone parametry.",
  },
  {
    prefix: "/hu/utmutatok/",
    calculator: "/hu/#kalkulator",
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

test("all mature-market core guides promise the calculator-to-compatible-products journey", async () => {
  const sitemap = await readFile("sitemap.xml", "utf8");

  for (const market of markets) {
    const guideRoutes = directGuideRoutes(sitemap, market.prefix);
    assert.equal(guideRoutes.length, 12, `${market.prefix} core guide coverage changed`);

    for (const route of guideRoutes) {
      const file = routeFile(route);
      const html = await readFile(file, "utf8");
      const cta = html.match(/<section class="cta">[\s\S]*?<\/section>/)?.[0] ?? "";
      assert.ok(cta.includes(market.promise), `${file} is missing the conversion promise`);
      assert.ok(cta.includes(`href="${market.calculator}"`), `${file} does not link to its local calculator`);
    }
  }
});
