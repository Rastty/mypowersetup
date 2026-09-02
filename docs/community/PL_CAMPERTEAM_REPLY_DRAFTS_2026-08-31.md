# CamperTeam — answer-first reply drafts (2026-08-31)

These are manual reply drafts, not published posts. Before posting, open the source thread and confirm that the latest question, component list and dates still match this brief. Remove the optional link if it does not materially help the current discussion.

## 280 Ah LiFePO₄ + 910 Wp solar, all-season camper

Source: https://camperteam.pl/forum/viewtopic.php?p=975382

Known scenario: 280 Ah LiFePO₄, 910 Wp PV, camper used throughout the year.

### Polish reply draft

Przy 280 Ah LiFePO₄ najpierw przeliczyłbym cały bilans na Wh, a nie oceniał zestawu tylko po Ah i Wp. Jeżeli jest to bank 12,8 V, ma około 3,58 kWh energii nominalnej. Do konserwatywnego planowania warto przyjąć około 80% pojemności użytecznej, czyli mniej więcej 2,87 kWh. To dużo, ale o autonomii decyduje faktyczne zużycie na dobę.

Dla przykładu:

- 800 Wh/dobę daje teoretycznie około 3,5 dnia bez ładowania,
- 1,2 kWh/dobę — około 2,4 dnia,
- 1,8 kWh/dobę — około 1,5 dnia.

Od tych wartości trzeba jeszcze odjąć straty przetwornicy i uwzględnić temperaturę oraz rezerwę, więc w praktyce wynik będzie trochę niższy.

910 Wp na dachu może latem pokrywać duże zużycie, ale samo „910 Wp” nie gwarantuje określonej energii na dobę. Wiosną i jesienią wynik mocno zależy od miejsca, zacienienia, kąta paneli i pogody; zimą kilka słabych dni z rzędu jest ważniejsze niż produkcja w pogodny dzień. Dlatego dla całorocznego kampera policzyłbym osobno co najmniej dwa profile: lato oraz wiosna/jesień, a zimę potraktował jako wariant wymagający zapasowego ładowania z alternatora albo 230 V.

Sprawdziłbym jeszcze cztery rzeczy:

1. rzeczywiste Wh/dobę dla lodówki, ogrzewania, elektroniki i urządzeń 230 V;
2. dopuszczalne napięcie i prąd wejściowy MPPT dla konfiguracji 910 Wp, także Voc przy niskiej temperaturze;
3. zabezpieczenie ładowania LiFePO₄ poniżej 0°C;
4. czy wszystkie źródła ładowania mają profil zgodny z LiFePO₄ i czy BMS wytrzyma ich łączny prąd.

Dopiero po tych danych da się uczciwie powiedzieć, czy 280 Ah jest przewymiarowane, trafione czy za małe. Najważniejsza liczba do dalszej oceny to zmierzone dobowe zużycie w Wh i minimalny poziom naładowania po dwóch–trzech pochmurnych dniach.

Opcjonalnie, jeżeli autor chce porównać warianty lato / okres przejściowy: https://mypowersetup.com/pl/poradnik/pojemnosc-akumulatora-do-kampera/?utm_source=camperteam&utm_medium=community&utm_campaign=pl_technical_help&utm_content=pl-camperteam-lifepo4-use-202606

## Ford Transit 2022 + 40 A DC/DC

Source: https://camperteam.pl/forum/viewtopic.php?t=42375

Known scenario: Ford Transit 2022 with smart alternator, 40 A DC/DC, 2 × 100 Ah LiFePO₄, 165 W PV and 2000 W inverter.

### Polish reply draft

Nie zaczynałbym od wymiany akumulatorów ani DC/DC. Przy tym zestawie najpierw trzeba ustalić, którędy energia rzeczywiście płynie i co rozładowuje bank postojowy.

Dwa akumulatory 100 Ah przy 12,8 V to około 2,56 kWh nominalnie, czyli w przybliżeniu 2,3 kWh użyteczne przy wykorzystaniu 90%. Ładowarka 40 A oddaje do banku mniej więcej 0,55 kW podczas prawidłowej pracy. Uzupełnienie 1,5 kWh wymaga więc około trzech godzin realnego ładowania, a dłużej, jeżeli w czasie jazdy działają odbiorniki albo ładowarka ogranicza prąd.

Zrobiłbym diagnostykę w tej kolejności:

1. Przy zgaszonym silniku zmierzyć prąd spoczynkowy całej zabudowy — osobno z wyłączoną i włączoną przetwornicą. Jej tryb standby przez całą dobę potrafi być istotnym odbiornikiem, ale trzeba zmierzyć konkretny model.
2. Po uruchomieniu silnika zmierzyć napięcie i prąd na wejściu oraz wyjściu DC/DC. W Transicie ze smart alternatorem ważne jest także sterowanie ładowarki (D+, zapłon albo odpowiednia detekcja), bo samo napięcie alternatora nie musi utrzymywać klasycznego profilu.
3. Sprawdzić, czy DC/DC faktycznie osiąga okolice 40 A i jak długo je utrzymuje. Jeżeli włącza się tylko okresowo, przyczyną może być sterowanie, spadek napięcia na przewodach, temperatura albo ograniczenie BMS.
4. Zmierzyć produkcję z 165 W PV w Wh/dobę. Taki panel pomoże przy odbiorach podstawowych, ale nie zbilansuje regularnej pracy dużych urządzeń 230 V.
5. Zweryfikować przekroje, długości przewodów i bezpieczniki. Przetwornica 2000 W przy pełnym obciążeniu pobiera po stronie 12 V ponad 170 A, więc wymaga bardzo krótkiego, właściwie dobranego połączenia, odpowiedniego zabezpieczenia i BMS o wystarczającym prądzie.

Do znalezienia przyczyny wystarczą cztery pomiary: stan SOC rano i wieczorem, prąd spoczynkowy, prąd ładowania DC/DC podczas jazdy oraz dzienna energia z MPPT. Bez nich wymiana elementów byłaby zgadywaniem.

Jeżeli problemem jest rozładowanie podczas postoju, podałbym jeszcze listę odbiorników i czas ich pracy. Jeżeli podczas jazdy — napięcie wejścia/wyjścia DC/DC oraz zmierzony prąd. Wtedy można odróżnić brak energii od usterki sterowania lub instalacji.

Opcjonalny link dopiero po pełnej odpowiedzi, jeśli potrzebne jest policzenie bilansu odbiorników: https://mypowersetup.com/pl/poradnik/jak-dobrac-ladowarke-dc-dc/?utm_source=camperteam&utm_medium=community&utm_campaign=pl_technical_help&utm_content=pl-camperteam-ford-dcdc-202608
