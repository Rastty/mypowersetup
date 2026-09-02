import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const markets = [
  {
    root: "pruvodce",
    calculator: "/#kalkulator",
    promise: "Výpočet je zdarma a bez registrace; po výsledku uvidíte jen produkty, které splňují vypočtené parametry.",
  },
  {
    root: "sk/sprievodca",
    calculator: "/sk/#kalkulator",
    promise: "Výpočet je bezplatný a bez registrácie; po výsledku uvidíte iba produkty, ktoré spĺňajú vypočítané parametre.",
  },
  {
    root: "pl/poradnik",
    calculator: "/pl/#kalkulator",
    promise: "Obliczenie jest bezpłatne i nie wymaga rejestracji; po wyniku zobaczysz tylko produkty spełniające obliczone parametry.",
  },
  {
    root: "hu/utmutatok",
    calculator: "/hu/#kalkulator",
    promise: "A számítás ingyenes és regisztráció nélkül használható; az eredmény után csak a kiszámított paramétereknek megfelelő termékeket látod.",
  },
];

test("all mature-market guides promise the calculator-to-compatible-products journey", async () => {
  for (const market of markets) {
    const entries = await readdir(market.root, { withFileTypes: true });
    const guideDirectories = entries.filter((entry) => entry.isDirectory());
    assert.equal(guideDirectories.length, 12, `${market.root} guide coverage changed`);

    for (const entry of guideDirectories) {
      const file = join(market.root, entry.name, "index.html");
      const html = await readFile(file, "utf8");
      const cta = html.match(/<section class="cta">[\s\S]*?<\/section>/)?.[0] ?? "";
      assert.ok(cta.includes(market.promise), `${file} is missing the conversion promise`);
      assert.ok(cta.includes(`href="${market.calculator}"`), `${file} does not link to its local calculator`);
    }
  }
});
