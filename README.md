# MyPowerSetup

Rychlý český kalkulátor pro návrh ostrovní elektrické sestavy. Uživatel vybere spotřebiče a dostane transparentní doporučení velikosti baterie, solárních panelů, měniče a MPPT regulátoru.

## Rozsah MVP

- bez přihlášení, AI a databáze,
- deterministický výpočet s viditelnými předpoklady,
- statická aplikace vhodná pro libovolný hosting,
- připraveno pro pozdější affiliate produktové karty bez vazby na konkrétní obchod.

## Produktová data a affiliate odkazy

Produktový katalog se generuje z feedů Reslshop a SvětKaravanů pomocí `npm run sync:products`.
URL feedů se neukládají do repozitáře; synchronizace je čte z proměnných
`RESLSHOP_FEED_URL` a `SVETKARAVANU_FEED_URL`. Výstupem je normalizovaný
`data/products.json` pouze s relevantními bateriemi, panely, měniči a regulátory.

Kompatibilitní engine nejprve kontroluje napětí a požadovaný výkon, kapacitu nebo proud.
Teprve poté produkty boduje. Affiliate URL vždy obsahuje `desturl` konkrétního produktu
a validátor odmítne odkaz na homepage obchodu.

## Lokální spuštění

```bash
npm start
```

Poté otevřete `http://localhost:4173`.

## Testy

```bash
npm test
```

## Výpočetní model

- Denní spotřeba: součet `příkon × hodiny denně × počet kusů`.
- Baterie: denní spotřeba × počet dnů autonomie × 15% rezerva ÷ využitelná hloubka vybití.
- Solár: denní spotřeba × 15% rezerva ÷ špičkové sluneční hodiny ÷ 75% účinnost systému.
- Měnič: odhad souběžné AC zátěže s 25% rezervou, minimálně nejvyšší rozběhová špička.
- Regulátor: proud panelů při zvoleném napětí systému s 25% rezervou.

Výsledek je orientační návrh, ne elektroprojekt. Před nákupem je nutné ověřit štítkové hodnoty a bezpečnostní prvky konkrétní instalace.
