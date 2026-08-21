# MyPowerSetup

Rychlý český kalkulátor pro návrh ostrovní elektrické sestavy. Uživatel vybere spotřebiče a dostane transparentní doporučení velikosti baterie, solárních panelů, měniče a MPPT regulátoru.

## Rozsah MVP

- bez přihlášení, AI a databáze,
- deterministický výpočet s viditelnými předpoklady,
- statická aplikace vhodná pro libovolný hosting,
- připraveno pro pozdější affiliate produktové karty bez vazby na konkrétní obchod.

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

## Zdroj pravdy a nasazení

Repozitář `Rastty/mypowersetup` je jediný kanonický zdroj produktu. Dočasná adresa `*.chatgpt.site` slouží pouze k rychlé uživatelské kontrole během vývoje; produkční nasazení na `mypowersetup.com` musí vycházet z tohoto repozitáře.

Affiliate odkazy se publikují pouze jako deeplinky na konkrétní produkty, které prošly kompatibilitním filtrem. Výchozí odkazy na homepage se jako produktové doporučení nepoužívají.
