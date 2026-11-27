# MyPowerSetup — PROJECT_STATE

**Ověřeno 2026-11-27 (UTC).** Zdroj pravdy: [aktuální main](https://github.com/Rastty/mypowersetup/tree/main), zdrojově ověřené katalogy, přesné SHA v GitHub Actions/Pages a produkční readback. Cíl: důvěryhodný, vysoce konverzní **12/24V průvodce návrhem a nákupem karavanových systémů CZ/SK/PL**, který propojí scénář → technicky bezpečný výběr → konkrétní schválené prodejce → měřený affiliate proklik → schválenou a vyplacenou provizi. Nejprve prohlubovat karavany a již aktivní trhy, **ne nové vertikály, Solaris ani neschválené inzerenty**.

## HOTOVO — produkt

- [#693](https://github.com/Rastty/mypowersetup/pull/693): automatické posunutí výsledku kalkulace do zorného pole CZ/SK/PL.
- [#694–#699](https://github.com/Rastty/mypowersetup/pull/699): produktově podložené šestikategoriové nákupní sestavy 12/24V, viditelné doporučení a součet jen ověřitelných cen.
- [#700](https://github.com/Rastty/mypowersetup/pull/700), [#704](https://github.com/Rastty/mypowersetup/pull/704): důkaz přesného BMS limitu podle výrobce/modelu; nikdy nedovozovat z Ah ani špičkového údaje.
- [#701–#705](https://github.com/Rastty/mypowersetup/pull/705): schválená affiliate atribuce, skutečný počet samostatných obchodů, měnově správné součty a přiznané neznámé ceny.
- [#706](https://github.com/Rastty/mypowersetup/pull/706): přesné 12/24V Dometic DPSI SKU (600/1000 W trvalý výkon), SK/PL šestikategoriové cesty, upozornění na nutný výběr varianty.
- [#707](https://github.com/Rastty/mypowersetup/pull/707): výrobcem doložená Power Queen 12V/200Ah Plus 200 A max. trvale; SK/PL šestikategoriové příklady pro 12V/1000W, bez záměny s 100A sesterským modelem.

## TURBO cyklus #1 — OPRAVA a PRODUKČNÍ NASAZENÍ, 2026-11-27

**Problém:** denní [sync 26.–27. 11.](https://github.com/Rastty/mypowersetup/actions/runs/45934030456) končil ještě před obnovením nabídek, protože pět testovacích assertions předpokládalo fixních 13 Solar-import měničů, ale schválený aktuální zdroj obsahoval **12** (chybí E7931 24V/300W). Současně padala pravidelná kontrola veřejných nákupních cest. Závažný blocker pro aktuálnost feedů; nikoli důvod znovu zařadit chybějící výrobek.

**Doručeno:** [PR #708](https://github.com/Rastty/mypowersetup/pull/708), merge `920f8f1b8d914c0a3d0445331712fe88977e81cd`. Jednotkové testy fallbacku nyní používají separátní **test-only** schválenou historickou fixture (12 měničů + 2 panely); veřejný audit a katalogový test odvozují počet z ověřeného skutečného snímku, nadále povolují nejvýše 13 přesně kontrolovaných SKU a kontrolují původ, napětí, výkon, dostupnost, cenu a affiliate URL. Přidán okamžitý sync trigger při změně těchto testů. **Žádný produkt nebyl uměle vrácen do nabídky.**

**Ověření exact SHA:**
- PR [Test PASS](https://github.com/Rastty/mypowersetup/actions/runs/46016594005) a [PR parity PASS](https://github.com/Rastty/mypowersetup/actions/runs/46016594010).
- Merge `920f8f1`: [main Test PASS](https://github.com/Rastty/mypowersetup/actions/runs/46016805497), [Pages PASS](https://github.com/Rastty/mypowersetup/actions/runs/46016805407), [produkční HTML/JS/asset/buyer readback PASS](https://github.com/Rastty/mypowersetup/actions/runs/46016805801).
- Nový [Sync affiliate products PASS](https://github.com/Rastty/mypowersetup/actions/runs/46016805466), včetně předběžných i finálních bezpečnostních bran a **přesného readbacku publikovaného kupního katalogu**. Automaticky vytvořil datový commit [`cb1219af16764e1fcfc94d1610282b8d3e28d740`](https://github.com/Rastty/mypowersetup/commit/cb1219af16764e1fcfc94d1610282b8d3e28d740). Jeho [Pages build+deploy+report PASS](https://github.com/Rastty/mypowersetup/actions/runs/46016997960).
- Čerstvá data: CZ Solar-import `status=ok`, snímek **2026-11-27 14:32:44 UTC**, **12 měničů** a **2 FV panely**; SK Padabo `status=ok`, **14:32:58 UTC**, **2 FV panely**. CZ DC–DC scénář 12V/30A má ve zdrojovém reportu `status=ready`, **7 identifikovaných shod**. To nejsou reálné prodeje ani garantované budoucí ceny/sklad.

## TURBO cyklus #1b — Navazující ochrana SK/HU katalogu, 2026-11-27

**Odhalený následný blocker:** první obnovení katalogů odstranilo neplatné CZ SKU, ale nová `main Test` kontrola zároveň odhalila další historický pevný limit: test Allpowers požadoval alespoň 22 FV produktů, zatímco čerstvý schválený evropský zdroj obsahoval **16 panelových položek + 4 power stations** (SK/HU zdroj `status=ok`, po 20 shodných Allpowers EU položkách). Chybějící produkty nebyly uměle doplněny.

**Doručeno:** [PR #709](https://github.com/Rastty/mypowersetup/pull/709), merge `50a8bad9ff43152e9af9cbcd2a82668b7ddfaf53`. Test namísto historického počtu ověřuje jedinečné SKU, schválené AWIN identifikátory, EUR, přesné kategorie, technické parametry ověřených stanic, nulovou nákupní způsobilost při chybě zdroje a shodu přesného katalogu SK/HU. Produkční doporučovací engine ani pravidla pro způsobilost SKU se neměnila.

**Ověřeno:** [PR Test PASS](https://github.com/Rastty/mypowersetup/actions/runs/46017632754), [main Test PASS](https://github.com/Rastty/mypowersetup/actions/runs/46017753563), [Pages PASS pro merge SHA](https://github.com/Rastty/mypowersetup/actions/runs/46017753615). Následný [Sync affiliate products PASS](https://github.com/Rastty/mypowersetup/actions/runs/46017753457) včetně bezpečnostních kontrol a **exact published buyer catalog readback** vytvořil datový commit [`fb923ae581e5a797228e645818e96dc6bcfbbcfa`](https://github.com/Rastty/mypowersetup/commit/fb923ae581e5a797228e645818e96dc6bcfbbcfa), jehož [Pages build+deploy+report PASS](https://github.com/Rastty/mypowersetup/actions/runs/46017934951). `main` nemá otevřená PR.

## BLOKACE / nezaměňovat za tržby

- **Návštěvnost, consented impressions/prokliky, skutečné objednávky, schválené a vyplacené provize a zisk: NEOVĚŘENO, nikoli nula.** Není zde validovaný výpis GA4 a affiliate financí pro MyPowerSetup.
- Neprohlašovat samostatné produktové nákupy za hotový elektroprojekt; kabeláž, jištění, zapojení, doprava a montáž nejsou naceněné. Jen přesná SKU, výrobce, napětí, BMS, trvalý výkon, čerstvé zdroje, sklad, lokální měna a schválená affiliate cesta mohou být označeny jako nákupní.
- Reslshop dříve vracel HTTP 403 a stale záznamy se odmítaly. Bez nového potvrzení netvrdit, že zdroj opět funguje. Core výrobní evidence: existující [Prometheus Core #1726](https://github.com/Rastty/prometheus-growth-os/issues/1726), **neduplikovat**.

## DALŠÍ 3 pracovní cykly podle očekávaného dopadu

1. **[HOTOVO] Zprovoznit každodenní CZ/SK/PL katalog a produkční kontrolu** po změně skladových SKU. #708 + `cb1219af` jsou nasazeny a ověřeny.
2. **[DALŠÍ PRIORITA] Prohloubit nákupní cestu pro 24V / vyšší souběžné zátěže na stávajících CZ/SK/PL trzích.** Prioritizovat konkrétní nekompletní, hodnotné karavanové scénáře a pouze již schválené prodejce; před aktivací přesný výrobce+model, BMS trvalý proud, skutečný sinusový trvalý výkon, MPPT PV limity a čerstvá dostupnost. Neodvozovat kompatibilitu z marketingových peak čísel; neplýtvat na další trhy.
3. **Změřit výkon nákupní cesty a skutečné peníze.** Ověřit s přístupnými reálnými daty `calculation_completed → featured product impression → merchant outbound` jen při souhlasu; affiliate network approved/paid provize odděleně. Z priorit vybrat první empiricky potvrzený konverzní problém; při nedostupné GA4/network integraci nevymýšlet uplift.

**Zásah majitele:** pro bezpečný vývoj nyní žádný. Pro finanční validaci bude případně třeba přístup ke správné GA4 službě a výpisům schválených/vyplacených provizí, pokud dosud nejsou přístupné.
