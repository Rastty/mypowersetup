# CamperTeam — Ford Transit + DC/DC, follow-up 23.10.2026

- Thread: https://camperteam.pl/forum/viewtopic.php?t=42375
- Last observed update: 2026-10-23 (Roberto; indexed page 3/3)
- Evidence: https://ww.camperteam.pl/forum/printview.php?start=30&t=42375
- Reviewed: 2026-11-17
- Status: **candidate for a single helpful manual reply**, not posted.

## Why this is an actual problem, not a backlink opportunity

The author reports that alternator → DC/DC → habitation LiFePO4 charging remains unreliable after reworking the electrical connection. He added two 220 W solar panels and a dedicated 40 A MPPT. Summer solar now makes the system livable, but winter production may not cover consumption. This is still a real, current diagnostic problem, not a request for an inverter or a generic shopping link.

### Proposed reply in Polish — no link

> Roberto, dobrze, że dołożony solar zapewnił zapas latem, ale on nie rozwiązuje przyczyny problemu z ładowaniem podczas jazdy. Zanim wymienisz kolejne urządzenie, spróbowałbym ustalić, **w którym miejscu toru ładowania znika energia**.
>
> Przy pracującym silniku i wyłączonym ładowaniu z PV warto zebrać jednocześnie (z odczytów urządzeń lub przez osobę, która bezpiecznie wykona pomiary):
>
> 1. napięcie na wejściu DC/DC **pod obciążeniem** i prąd pobierany z instalacji auta,
> 2. napięcie oraz rzeczywisty prąd na wyjściu DC/DC do akumulatora pokładowego,
> 3. status wykrywania pracy silnika / D+ i ewentualny powód ograniczenia ładowania w aplikacji lub logu ładowarki,
> 4. SOC, temperaturę i ewentualny limit ładowania zgłaszany przez BMS LiFePO4.
>
> Samo napięcie alternatora mierzone bez obciążenia może wyglądać prawidłowo, a na wejściu ładowarki pod obciążeniem może być już inaczej (spadek na przewodach, zabezpieczeniach lub połączeniach). Również „40 A” na obudowie jest wartością maksymalną, nie gwarantowanym prądem w każdych warunkach. Warto porównać odczyty z instrukcją **dokładnego modelu ładowarki**, zwłaszcza z zasadą detekcji inteligentnego alternatora i limitem prądu wejściowego.
>
> Jeśli podasz te cztery zestawy danych oraz dokładny model DC/DC, będzie łatwiej odróżnić problem z wejściem, sterowaniem ładowarki, limitem BMS czy instalacją. Nie zmieniałbym na ślepo połączeń energobloku ani nie obchodził zabezpieczeń — przy takich prądach to praca do wykonania z dokumentacją przez elektryka od zabudów.

## Before the owner manually replies

1. Open the **latest** thread page and check whether anyone has resolved the issue since 2026-10-23. If yes, change the registry status to `monitor`; do not send the draft.
2. Use only one personally owned, transparent account. Do not imply that MyPowerSetup diagnosed this vehicle or that Petr has personally measured it.
3. Keep the first reply **without any MyPowerSetup or affiliate link**. If the author later asks about how much DC/DC current to buy for the measured daily energy shortfall, a conditional follow-up may reference `/pl/kalkulatory/ladowarka-dc-dc/`; the calculator is for **sizing**, not electrical fault diagnosis.
4. If posted, record `publishedPostUrl`, `repliedAt`, and `status: replied` in `data/traffic-distribution.json`. Never post an automated duplicate.

## SEO/product learning from the question

- Intent: `ładowarka DC-DC nie ładuje kamper`, `mały prąd ładowania podczas jazdy`, `inteligentny alternator Ford Transit`, `DC/DC zimą vs fotowoltaika`.
- Do not publish a new generic DC/DC selection guide just for this thread. The existing Polish guide and calculator already explain sizing; the *new* need is fault localization with actual input/output measurements.
- Keep the winter solar workaround separate from the fault diagnosis. Daily winter yield must not be inferred from 440 Wp panel nameplate alone.
