# VšeElektro.eu — schválený eHub inzerent (CZ)

**Stav k 2026-10-13:** Program eHub schválen, soukromý `VSELEKTRO_FEED_URL` přidán do GitHub Actions. První živý běh 2026-10-13 úspěšně importoval 100Ah a 200Ah baterii. Další modely se aktivují jen při explicitním `DELIVERY_DATE=0`, pozitivní ceně a shodě technických údajů.

- Publisher: `f34c86c8`
- Campaign: `f897865f`
- Base click: `https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=f897865f`
- Deeplink parametr: `desturl` s URL zakódovanou přes `URLSearchParams` / `encodeURIComponent`.
- Obchod: `https://www.vselektro.eu/` — při generování odkazu vyžadovat HTTPS a kontrolovat host.
- Aktivní první trh: **ČR**. Neprohlašovat ostatní trhy automaticky za ověřené, i když e-shop může doručovat na Slovensko.

## Relevantní ověřené produkty

| SKU / výrobce | Přesná produktová URL | Základní parametry ze stránky obchodu |
|---|---|---|
| Sunstone Power SLPO12-100N | https://www.vselektro.eu/lifepo4-baterie-12v-100ah-sunstone-power-slpo12-100n/ | LiFePO4 12,8 V, 100 Ah, 1280 Wh, BMS 100 A, 11,5 kg; nabíjení od 0 °C |
| Sunstone Power SLPO12-200N HC200A | https://www.vselektro.eu/lifepo4-baterie-12v-200ah-slpo12-200n-hc200a-sunstone-power/ | LiFePO4 12,8 V, 200 Ah, 2560 Wh, BMS 200 A, 20 kg; nabíjení od 0 °C |
| Sunstone Power SLPO12-150N HC150A | https://www.vselektro.eu/lifepo4-baterie-12v-150ah-slpo12-150n-hc150a-sunstone-power/ | 12,8 V, 150 Ah, 1920 Wh, BMS 150 A, 14 kg; 13. 10. stránka uváděla dodání do čtyř dnů, nikoliv okamžitý sklad |
| Sunstone Power SLPO12-200M HC200A | https://www.vselektro.eu/lifepo4-baterie-12v-200ah-slpo12-200m-hc200a-sunstone-power/ | 12,8 V, 200 Ah, BMS 200 A; nízké provedení pod sedadlo (320 × 283 × 187 mm), M6 svorky |
| Sunstone Power SLPO12-300N HC200A | https://www.vselektro.eu/lifepo4-baterie-12v-300ah-slpo12-300n-hc200a-sunstone-power/ | 12,8 V, 300 Ah, 3840 Wh, BMS 200 A (ne 300 A), 29 kg; rozměry 483 × 170 × 240 mm |

Produktové a technické údaje byly ověřeny dne 2026-10-13 na obchodních stránkách. Bez data-rich feedu **nepřenášet jednorázovou cenu nebo dostupnost do trvalého katalogu**.

## Rozhodnutí pro MyPowerSetup

1. Merchant je registrován v `src/products.js`; deeplink smí vzniknout jen na HTTPS doménu obchodu a nese potvrzené eHub identifikátory.
2. Článek `pruvodce/kapacita-baterie-do-karavanu/` zobrazuje 100Ah a 200Ah model **jako příklady k porovnání**, s transparentním označením partnerského odkazu. Čtenář stále musí provést výpočet.
3. Automatický katalóg ověřen: `data/products.json` již načetl 100Ah a 200Ah model z živého feedu. Povolovací seznam je rozšířen na 150Ah, podsedadlové 200Ah M a 300Ah. **Nezaměňovat allowlist s aktuální dostupností:** pro doporučení je nutný `DELIVERY_DATE=0`; `1`, `4` či chybějící hodnota nesmí zůstat aktivní.
4. Feed je připojen přes neveřejný GitHub Actions secret `VSELEKTRO_FEED_URL`; běžné synchronizace aktualizují ceny a dostupnost. Chyba feedu automaticky deaktivuje dřívější výsledky místo použití zastaralé nabídky. Přístupový klíč nikdy neukládat do repozitáře ani diagnostického reportu.
5. Neprodávat velké hybridní měniče nebo celodomovní FV systémy jako kompatibilní řešení pro 12V karavan. Sestavy Mobil I a Mobil II jsou na e-shopu označeny jako již neprodávané.
6. Další možné kategorie po získání aktuálního feedu: 12V/24V MPPT, LiFePO4 150Ah, měniče s čistou sinusovkou a příslušenství; vše jen po ověření skutečné elektrické kompatibility, ceny, dostupnosti a správné klasifikace.

## Další krok

Feed již běží v GitHub Actions, proto dále ověřovat, zda se nově povolené SKU objeví v `data/products.json`, a zda nejde o `DELIVERY_DATE>0`, chybějící cenu nebo technicky odlišný model. Prodejce lze dál rozšiřovat až po ověření přesných produktových stránek a parametrů; feed se nesmí nahrazovat kopírováním starých cen.

Používat `rel="sponsored nofollow noopener"` v externích komerčních odkazech a zachovávat oddělení nákupního příkladu od matematického výběru sestavy.

## Ověřené rozšíření nabídky — MPPT a DC–DC (2026-10-13)

Povoleny pouze níže uvedené přesné URL a výrobkové varianty. Automatické zveřejnění je možné **jen při shodě titulku/modelu, kladné CZK ceně a okamžité dostupnosti z čerstvého Heureka feedu**; ostatní produkty zůstávají mimo. Modely se mohou stát nepoužitelnými, když z obchodu zmizí nebo budou pouze na objednávku.

| Komponent | Přesný produkt u prodejce | Ověřené parametry |
|---|---|---|
| Victron SmartSolar MPPT 100/20 | https://www.vselektro.eu/solarni-regulator-victron-energy-mppt-smartsolar-100v-20a/ | 12/24/48 V baterie, 20 A, nominální FV 290/580/1160 Wp, max. Voc 100 V, max. FV Isc 20 A |
| Victron SmartSolar MPPT 100/30 | https://www.vselektro.eu/solarni-regulator-victron-energy-smartsolar-30a/ | 12/24 V baterie, 30 A, nominální FV 440/880 Wp, max. Voc 100 V, max. FV Isc 35 A |
| Victron SmartSolar MPPT 100/50 | https://www.vselektro.eu/solarni-regulator-victron-energy-mppt-smartsolar-100v-50a/ | 12/24 V baterie, 50 A, nominální FV 700/1400 Wp, max. Voc 100 V, max. FV Isc 35 A |
| SRNE SR-ML2430 MPPT | https://www.vselektro.eu/solarni-regulator-sr-ml2430-30a/ | 12/24 V baterie, 30 A, nominální FV 400/800 Wp, max. Voc 100 V |
| Victron Orion-Tr Smart 12-12/18 izolovaná | https://www.vselektro.eu/nabijecka-dc-dc-orion-tr-smart-12-12-18a/ | 12V vstup, 12V servisní baterie, 18 A, programovatelný profil pro olovo i lithium |
| Victron Orion-Tr Smart 12-12/30 izolovaná | https://www.vselektro.eu/nabijecka-dc-dc-orion-tr-smart-12-12-30a/ | 12V vstup/výstup, 30 A, oddělené mínus, olovo/LiFePO4 |
| Victron Orion-Tr Smart 12-12/30 neizolovaná | https://www.vselektro.eu/nabijecka-dc-dc-orion-tr-smart-12-12-30a-neizolovana/ | 12V vstup/výstup, 30 A, společné mínus, olovo/LiFePO4 |
| Victron Orion XS Smart 12-12/50 neizolovaná | https://www.vselektro.eu/nabijecka-dc-dc-orion-xs-smart-12-12-50a-neizolovana/ | 12V vstup/výstup, 50 A, společné mínus, olovo/LiFePO4, 700 W |

**Výběrové brzdy:** Kalkulačka prověřuje jmenovitý výkon FV pole, výstupní proud MPPT, napětí baterie a u DC–DC proud/napětí startovací i servisní baterie a technologii. Nezná však skutečný Voc panelového stringu za mrazu ani Isc panelů; na produktové kartě proto musí zůstat upozornění na fyzickou kontrolu zapojení, jištění a limitů datasheetu. U DC–DC vždy ověřit omezení odběru ze startovací baterie/alternátoru, kabely, BMS, profil a požadavek na galvanické oddělení; nelze generický DC/DC **měnič napětí** považovat za nabíječku baterie. Z dostupnosti v e-shopu nelze usuzovat na skladovou dostupnost v XML.

**Poznámka k historickým datům:** Ceny se nesmí propsat ze statického veřejného katalogu ani z ručně napsaného souboru. Autoritativní je živý feed a jeho časová značka `generatedAt`.
