# VšeElektro.eu — schválený eHub inzerent (CZ)

**Stav k 2026-10-13:** Majitel potvrdil schválení programu VšeElektro.eu u eHubu.

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

Produktové a technické údaje byly ověřeny dne 2026-10-13 na obchodních stránkách. Bez data-rich feedu **nepřenášet jednorázovou cenu nebo dostupnost do trvalého katalogu**.

## Rozhodnutí pro MyPowerSetup

1. Merchant je registrován v `src/products.js`; deeplink smí vzniknout jen na HTTPS doménu obchodu a nese potvrzené eHub identifikátory.
2. Článek `pruvodce/kapacita-baterie-do-karavanu/` zobrazuje 100Ah a 200Ah model **jako příklady k porovnání**, s transparentním označením partnerského odkazu. Čtenář stále musí provést výpočet.
3. Automatické produktové výsledky **zatím neobsahují nové staticky vložené položky**. Do `data/products.json` je může bezpečně propsat až `scripts/sync-products.mjs` z aktuálního feedu.
4. Feed je připojen jako **volitelný** GitHub Actions secret `VSELEKTRO_FEED_URL`. Dokud není nastaven, prodejce nebude předstírat aktivní produktové pokrytí.
5. Neprodávat velké hybridní měniče nebo celodomovní FV systémy jako kompatibilní řešení pro 12V karavan. Sestavy Mobil I a Mobil II jsou na e-shopu označeny jako již neprodávané.
6. Další možné kategorie po získání aktuálního feedu: 12V/24V MPPT, LiFePO4 150Ah, měniče s čistou sinusovkou a příslušenství; vše jen po ověření skutečné elektrické kompatibility, ceny, dostupnosti a správné klasifikace.

## Další krok

Po získání přímé exportní URL feedu (např. Heureka nebo Google Merchant XML) uložit ji do GitHub Actions secrets jako `VSELEKTRO_FEED_URL`; navržený optional sync ji umí začít zpracovávat bez změny kódu. Feed se nesmí nahrazovat kopírováním starých cen.

Používat `rel="sponsored nofollow noopener"` v externích komerčních odkazech a zachovávat oddělení nákupního příkladu od matematického výběru sestavy.
