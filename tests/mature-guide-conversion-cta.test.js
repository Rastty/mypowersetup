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
    // Distinct purchase comparisons and the winter battery decision guide
    // have dedicated tests; keep mature *core* coverage at 12/market.
    const comparisonRoutes = ["/pruvodce/lifepo4-100ah-nebo-200ah-karavan/","/pruvodce/victron-mppt-100-20-vs-100-30-vs-100-50/","/pruvodce/dc-dc-nabijecka-18a-vs-30a-vs-50a-karavan/","/pruvodce/lifepo4-baterie-zima-karavan/","/pruvodce/solarni-panely-seriove-nebo-paralelne-karavan/","/pl/poradnik/oxe-s400-czy-zestaw-sp100w-kamper/"];
    return remainder.endsWith("/") && !remainder.slice(0, -1).includes("/")
      && !["/pruvodce/modelove-sestavy/", "/pl/poradnik/zasilanie-kampera-na-weekend/","/sk/sprievodca/elektrina-v-karavane-na-vikend/","/sk/sprievodca/elektrina-rodinna-dovolenka-karavan/","/sk/sprievodca/praca-z-karavanu-elektrina/","/pl/poradnik/zasilanie-kampera-rodzinny-urlop/","/pl/poradnik/praca-z-kampera-zasilanie-laptopa/","/sk/sprievodca/vyssi-komfort-karavan/","/sk/sprievodca/zimny-karavan-spotreba/","/pl/poradnik/zasilanie-kampera-wiekszy-komfort/","/pl/poradnik/zasilanie-kampera-zima/"].includes(route)
      && !comparisonRoutes.includes(route);
  });
}

function routeFile(route) {
  return `${route.slice(1)}index.html`;
}

const TECHNICAL_ONLY_CTA = new Map([
  ["/pruvodce/kabely-a-pojistky-12-v/", "Výsledek je podklad ke kontrole, nikoli instalační pokyn."],
  ["/pruvodce/jak-vybrat-dc-dc-nabijecku/", "Konkrétní modely automaticky neschvaluje"],
  // Native SK/PL/HU calculators return a transparent technical calculation;
  // unlike the full builder, they must not promise matched merchant products.
  ["/sk/sprievodca/ako-vybrat-dc-dc-nabijacku/", "výsledok overte podľa alternátora"],
  ["/pl/poradnik/jak-dobrac-ladowarke-dc-dc/", "Wynik sprawdź z parametrami alternatora"],
  ["/hu/utmutatok/dc-dc-tolto-kivalasztasa/", "eredményt ellenőrizd az alternátor"],
  ["/sk/sprievodca/kable-a-poistky-12-v/", "overení skutočnej prúdovej zaťažiteľnosti"],
  ["/pl/poradnik/przewody-i-bezpieczniki-12-v/", "potwierdzeniu obciążalności przewodu"],
  ["/hu/utmutatok/12-v-vezetekek-es-biztositekok/", "igazolt áramterhelhetőség"],
  ["/sk/sprievodca/ako-vybrat-mppt-regulator/", "Voc v mraze, Isc"],
  ["/pl/poradnik/jak-dobrac-regulator-mppt/", "Voc przy mrozie, Isc"],
  ["/hu/utmutatok/mppt-szabalyozo-kivalasztasa/", "hideg Voc, az Isc"],
  ["/sk/sprievodca/aky-velky-menic-do-karavanu/", "finálne limity potvrdí výrobca"],
  ["/pl/poradnik/jak-dobrac-przetwornice-do-kampera/", "wynik zweryfikuj z dokumentacją"],
  ["/hu/utmutatok/lakoauto-inverter-kivalasztasa/", "indítási csúcsot és az akkumulátorterhelést"],
  ["/sk/sprievodca/12-v-alebo-24-v-karavan/", "Porovnajte obe napätia"],
  ["/pl/poradnik/12-v-czy-24-v-kamper/", "Przelicz prąd, moc przetwornicy"],
  ["/hu/utmutatok/12-v-vagy-24-v-lakoauto/", "Hasonlítsd össze az áramerősséget"],
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
