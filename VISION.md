# MyPowerSetup — produktová vize a směr

Aktualizováno: 12. září 2026

## Vize

MyPowerSetup má být nejlepší praktický decision engine pro návrh elektrické sestavy karavanu: z několika srozumitelných vstupů převede skutečnou spotřebu na transparentní návrh baterie, soláru, měniče, MPPT regulátoru, DC–DC a 230V nabíjení a navazujících bezpečnostních prvků. Uživatel musí rozumět tomu, proč výsledek vznikl, co ještě ověřit a které konkrétní kompatibilní komponenty dávají smysl.

Nejde jen o kalkulačku ani o katalog produktů. Cílem je propojit cestu:

**konkrétní problém → výpočet → vysvětlení → bezpečný návrh → kompatibilní nákupní seznam → měřitelný affiliate click**

Dlouhodobě chceme, aby uživatel našel MyPowerSetup přes konkrétní problém nebo nákupní dotaz, během jedné minuty pochopil potřebné parametry a bez slepého doporučování přešel ke kompatibilním produktům.

## Aktuální tržní režim

### Core trhy — CZ / SK / PL / HU

Česká republika, Slovensko, Polsko a Maďarsko jsou veřejné core trhy. Sdílejí stejné výpočetní jádro, ale mají lokální jazyk, měnu, právní/affiliate texty, produktová data, hreflang a testované nákupní cesty.

- **CZ — golden master:** nejširší produktová a obsahová vrstva; referenční verze pro nové funkce.
- **SK — mature core:** plnohodnotná lokalizace se samostatným EUR katalogem a stejnými technickými guardrails jako CZ.
- **PL — mature growth market:** veřejná lokalizace s vlastním katalogem a měřitelnými scénáři; využívá mimo jiné eHUB/Ampul a další schválené affiliate cesty.
- **HU — mature core:** veřejná lokalizace se samostatným katalogem a dokončenými mobilními/technickými kontrolami. Nevracet ji zpět do režimu „před zveřejněním“ bez konkrétní regresní chyby.

U core trhů už není výchozím cílem „přidat další produkty“. Další produkt se přidává pouze tehdy, když odemyká reálnou technickou nebo komerční mezeru, zlepšuje nezávislost na jednom obchodě nebo přináší významně lepší fit.

### Controlled expansion — PT / RO / SI

Portugalsko, Rumunsko a Slovinsko jsou veřejné řízené expanzní trhy. Mají lokalizované kalkulátory, průvodce, sitemap/hreflang a produktové katalogy, ale nejsou považované za stejně široce monetizované jako core trhy.

Pro PT/RO/SI platí:

- doporučení musí zůstat **fail-closed** — neověřený produkt nebo neověřená checkout/affiliate cesta se nesmí tvářit jako nákupně připravená,
- portable fallback může být primární nákupní cesta pouze tehdy, když je technicky vhodný a ověřený,
- komponentové mezery řešíme podle skutečného dopadu na purchase-ready scénáře, ne podle počtu položek v katalogu,
- obsahová expanze zůstává úzká a high-intent, dokud data neprokážou důvod ji rozšířit.

Aktuální owner-action queue pro PT/RO/SI řadí nejvýše affiliate aktivaci Solaris, následně Xdatou a Butler Technik. Tyto externí kroky se řeší podle aktuálního commercial-opportunity reportu; jejich pořadí se nesmí ručně hardcodovat do vývoje, protože se může změnit s katalogy a ověřením checkoutu.

## Další trhy — research only

Novou lokalizaci teď nespouštíme jen proto, že je technicky levná. Výzkumná fronta může zahrnovat zejména Švédsko, Španělsko, Itálii, Nizozemsko a Německo, ale nový trh má smysl otevřít až tehdy, když:

- současné core/expansion trhy mají stabilní veřejný funnel,
- existuje jasný lokální search intent a odlišení,
- máme minimálně jednu přesnou a ověřenou nákupní/affiliate cestu,
- produktová a jazyková lokalizace není pouhý překlad,
- očekávaný přínos je vyšší než další zlepšení trafficu a konverze na existujících trzích.

### Brána pro otevření dalšího trhu

Nový trh se zveřejní pouze tehdy, když současně splní:

- přirozenou jazykovou a technickou kontrolu hlavního kalkulátoru,
- samostatný produktový katalog s lokální měnou, dostupností a bezpečným párováním,
- alespoň jednu ověřenou affiliate cestu s přesným deeplinkem; ideálně druhý nezávislý obchod,
- lokální právní, soukromí a affiliate texty, hreflang, sitemap a měření,
- ověřený mobilní průchod od vstupu přes výsledek až ke konkrétnímu produktu,
- jasnou odpověď na otázku „proč tento trh teď?“ podloženou traffic/SEO/monetizační příležitostí.

## Produktové principy

- Výpočet a technická kompatibilita mají vždy přednost před provizí.
- Affiliate odměna nesmí změnit pořadí ani vhodnost produktu.
- Žádný obchod nesmí být jediným bodem závislosti, pokud existuje realistická alternativa.
- Každý výsledek musí ukázat předpoklady, rezervy, omezení a důvod doporučení.
- Orientační návrh se nesmí vydávat za elektroprojekt, revizi nebo potvrzení bezpečnosti montáže.
- Neznámý technický parametr znamená omezení doporučení, ne domyšlenou hodnotu.
- Stale nebo unavailable produkt se nesmí započítat do kompletní nákupní sestavy.
- Neúplný katalog se nesmí prezentovat jako kompletní balíček; výsledek musí pojmenovat chybějící kategorie a ponechat přesné technické minimum pro jejich výběr.
- Unikátní užitečný nástroj a jeho výstupy mají přednost před množstvím obecných článků.
- Obsah a komunitní distribuce musí být autentické, užitečné a bez spamu.
- Web musí být rychlý, přístupný, dobře ovladatelný na mobilu a srozumitelný začátečníkovi.
- Běžný uživatel musí během jedné minuty pochopit, co potřebuje, proč to potřebuje a které konkrétní produkty odpovídají výsledku.
- Rychlé profily a scenario pages smějí pouze transparentně předvyplnit společný kalkulátor; nesmějí skrývat spotřebu ani nahrazovat upravitelné vstupy.
- Kontrola existující sestavy má nejdříve určit hlavní omezení a nejmenší smysluplný upgrade, ne automaticky doporučit kompletní výměnu.
- Přesné ekonomické výsledky se nesmí tvrdit bez skutečných dat.

## Produktová cesta

### P0 — spolehlivý veřejný základ

Trvale udržovat:

- bezchybný HTTPS, CSS a JavaScript,
- fungující výpočet na běžných mobilních i desktopových prohlížečích,
- automatické testy výpočtu, odkazů, dat, lokalizací a nasazení,
- transparentní metodiku, autorství, soukromí a affiliate disclosure,
- fail-closed produktové a affiliate guardrails.

P0 není jednorázově „hotovo“; je to regresní brána pro každou změnu.

### P1 — nejlepší kalkulátor a výstup

Rozvíjet pouze tam, kde zvyšuje užitečnost výsledku:

- uložitelná a sdílitelná konfigurace,
- srozumitelné varianty nákupního řešení pouze při úplném pokrytí potřebných kategorií,
- DC–DC a 230V nabíjení,
- výpočet kabelů a bezpečnostních parametrů bez vymýšlení konkrétního jištění mimo dostupná data,
- result-aware instalační checklist a sdílený výstup,
- dynamické schéma a další výstupy tam, kde mají jasnou uživatelskou hodnotu.

### P2 — rozhodovací a nákupní vrstva

- automaticky aktualizované katalogy,
- tvrdé kontroly napětí, kapacity, výkonu, proudu a dalších kompatibilit,
- deduplikace variant a odmítnutí produktů s nedoloženými klíčovými parametry,
- vysvětlení, proč produkt vyhovuje a co má uživatel před nákupem ověřit,
- více obchodů a alternativ bez obchodního zkreslení,
- měření product impression → affiliate click → později potvrzená transakce,
- při každé změně chránit invariant: neúplné nebo stale doporučení nesmí vytvořit falešně kompletní balíček.

### P3 — návštěvnost, konverze a autorita

Toto je aktuální hlavní growth lane pro core trhy:

- využít existující buyer-intent money pages místo nekontrolované tvorby dalších URL,
- posílat návštěvníka co nejrychleji z odpovědi do kalkulátoru a kompatibilních produktů,
- měřit `guide_to_calculator_click` včetně `source_position=early|late`,
- držet tematické clustery kolem baterie, soláru, MPPT, DC–DC, měniče a 230V nabíjení,
- používat případové/scenario stránky jen tehdy, když řeší konkrétní intent a vedou do měřitelného předvyplněného kalkulátoru,
- využívat interní odkazy k distribuci existujícího trafficu do money funnelu,
- komunitní distribuci dělat jen jako odpověď na skutečný problém; nevyrábět odkazy nebo odpovědi bez relevantní otázky.

## Aktuální stav growth vrstvy

- Core buyer-intent vrstva pokrývá v CZ/SK/PL/HU baterii, solár, MPPT, DC–DC, měnič a 230V nabíječku.
- 24 hlavních money pages v CZ/SK/PL/HU mají měřitelný early/late vstup do lokálního kalkulátoru.
- CZ má měřitelné scenario landing pages; PL má řízený weekend scenario pilot a interní traffic routing.
- Scenario attribution se přenáší přes kalkulaci, product impression a affiliate click; u podporovaných affiliate sítí i do transaction reference.
- IndexNow pracuje se všemi sitemapami deklarovanými v robots.txt, takže scenario stránky nejsou mimo discovery flow.

Nové content nebo scenario URL se mají přidávat až tehdy, když mají lepší očekávaný dopad než zlepšení CTR, interní distribuce nebo konverze na současném inventáři.

## Co znamená úspěch

Po zapnutí měření sledujeme zejména:

- organická zobrazení, kliknutí a query/page růst,
- podíl návštěvníků guide/scenario pages, kteří vstoupí do kalkulátoru,
- poměr early vs. late CTA vstupů na money pages,
- zahájení a dokončení výpočtu,
- product choice impressions a affiliate clicks,
- podíl výsledků s úplným purchase-ready pokrytím a důvody neúplnosti,
- potvrzené affiliate transakce tam, kde je síť poskytuje,
- opakované použití a sdílení konfigurací,
- technické chyby a čas potřebný k dokončení výpočtu.

Neoptimalizujeme na počet článků, produktů nebo PR. Optimalizujeme na **užitečný traffic → dokončený výpočet → kompatibilní produkt → měřitelný obchodní výsledek**.

## Pracovní pravidla

- GitHub a tento dokument jsou zdrojem pravdy pro směr produktu.
- Živé generované reporty mají přednost před ručně zapsaným pořadím jednotlivých merchantů nebo produktových mezer.
- Vývoj pokračuje samostatně v malých, testovaných a veřejně ověřitelných krocích.
- Hotové kvalitní změny se mohou sloučit bez jednotlivého schvalování Petra Gálíka.
- Petr dostane okamžitou zprávu pouze při významném omezení vyžadujícím jeho zásah, například DNS, přístupu, schválení programu nebo rozhodnutí s podstatným obchodním dopadem.
- Search Console a analytická data slouží k prioritizaci, ale jejich dočasná nedostupnost nemá zastavit technické a obsahové kroky s jasným přínosem.
- Nevracet se k již dokončeným market gates nebo coverage úkolům bez konkrétní regrese v testu/reportu.

## Nejbližší pořadí práce

1. **Traffic → calculator → product conversion:** měřit a zlepšovat využití existujících core money pages; první aktivní experiment je early vs. late CTA na 24 CZ/SK/PL/HU stránkách.
2. **Product integrity:** průběžně hlídat coverage, stale/unavailable produkty a úplnost balíčků. Přidávat produkt pouze podle reálné mezery, ne pro vyšší počet položek.
3. **PT/RO/SI commercial gaps:** řešit komponentové mezery podle aktuálního `data/commercial-opportunity-report.json` a owner kroky podle `data/owner-action-queue.json`. Aktuálně jsou user-owned externí bottlenecky hlavně affiliate aktivace Solaris, Xdatou a Butler; systémové checkout/feed ověření řešit samostatně bez čekání na Petra.
4. **SEO exploitation:** posilovat interní traffic routing, snippet/intent fit a existující scenario/money pages dříve než přidávat další generický obsah.
5. **Measured expansion only:** nový trh nebo větší novou content family otevřít až po prokázaném signálu z trafficu, engagementu nebo monetizace současných trhů.

Pokud se živý report dostane do rozporu s tímto seznamem, rozhoduje report a tento dokument se má v nejbližším bezpečném PR aktualizovat.
