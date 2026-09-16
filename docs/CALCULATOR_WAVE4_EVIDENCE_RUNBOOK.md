# Calculator Wave 4 evidence runbook

Wave 4 optimizes existing calculator routes from observed search and funnel evidence. It does not create new routes just to increase page count.

## Inputs

The report accepts JSON, CSV or TSV. UTF-8 BOM, quoted delimiters, Czech/English export headers, decimal comma and percent values are normalized automatically. There is no need to hand-convert a normal export into the internal JSON shape.

### 1. GSC page/query export

Direct Search Console CSV/TSV exports are supported. Common English and Czech headers are recognized, including:

- `Top pages` / `Page` / `Nejvýznamnější stránky`
- `Top queries` / `Query` / `Dotazy`
- `Clicks` / `Prokliky`
- `Impressions` / `Zobrazení`
- `CTR`
- `Position` / `Pozice`

Example direct CSV:

```csv
Nejvýznamnější stránky,Prokliky,Zobrazení,CTR,Pozice
https://mypowersetup.com/kalkulacky/dc-dc-nabijecka/,3,120,2.5%,7.2
```

JSON arrays, objects with `rows` / `data`, and native Search Console API rows are still accepted:

```json
{"page":"https://mypowersetup.com/kalkulacky/dc-dc-nabijecka/","query":"dc dc nabijecka karavan","clicks":3,"impressions":120,"position":7.2}
```

```json
{"keys":["https://mypowersetup.com/kalkulacky/dc-dc-nabijecka/","dc dc nabijecka karavan"],"clicks":3,"impressions":120,"ctr":0.025,"position":7.2}
```

Only known calculator roots are accepted: CZ `/kalkulacky/`, SK `/sk/kalkulacky/`, PL `/pl/kalkulatory/`, HU `/hu/kalkulatorok/`.

### 2. GA4/event export

JSON, CSV or TSV are accepted. For conversion rates, export `Total users` together with `Event count` whenever possible. A person can recalculate more than once, so raw event counts can overstate later funnel steps. The report therefore uses `Total users` as the funnel weight when present and falls back to `Event count` when it is not available.

All calculator funnel events use one canonical event-parameter contract end to end, including product impressions and affiliate clicks:

- `calculator_landing_path`
- `calculator_landing_locale`
- `calculator_landing_intent`
- `calculator_source_context`

Register/export those same dimensions in GA4. Historical raw events using the former `landing_path`, `landing_locale` and `landing_intent` keys remain readable by the repo report for backward compatibility, but new production events must use the canonical `calculator_*` names.

The preferred flat export contains these columns:

```csv
Event name,Event count,Total users,Calculator landing path,Calculator landing locale,Calculator landing intent
calculator_landing_view,50,40,/kalkulacky/kapacita-baterie/,cs,battery-capacity
calculator_started,25,25,/kalkulacky/kapacita-baterie/,cs,battery-capacity
calculation_completed,40,20,/kalkulacky/kapacita-baterie/,cs,battery-capacity
```

The example deliberately shows why user counts matter: 40 completion events came from 20 users, so the funnel should use 20 completions rather than treating repeated recalculations as 40 separate people.

English and Czech aliases such as `Event name` / `Název události`, `Event count` / `Počet událostí`, and `Total users` / `Celkový počet uživatelů` are recognized. Camel-case keys such as `eventCount`, `totalUsers` and `calculatorLandingPath` are normalized too. Existing raw JSON event rows with `parameters` remain supported.

Measured chain:

`calculator_landing_view → calculator_started → calculation_completed → calculator_landing_continue → product_choice_impression → affiliate_click`

### 3. Optional URL inspection/indexing export

JSON, CSV or TSV are accepted. Minimal JSON shape:

```json
{"url":"https://mypowersetup.com/kalkulacky/dc-dc-nabijecka/","indexed":true}
```

`coverageState`, `verdict`, `status` / `stav` are also accepted for common inspection exports.

## Run

No-cleanup CSV example:

```bash
npm run report:calculator:growth -- gsc-pages.csv ga4-calculator-events.csv indexing.csv
```

JSON remains valid:

```bash
npm run report:calculator:growth -- gsc.json events.json indexing.json
```

The indexing file is optional.

## Decision rules

The report only raises an action after minimum evidence is present. Low-volume routes remain `insufficient` / `observe` rather than generating speculative work.

Opportunity types:

- `indexing` — indexing evidence says the URL is not indexed.
- `search_ctr` — meaningful search impressions, position within the first 20 results, CTR below the evidence threshold.
- `calculator_start` — enough landing views but weak calculator starts.
- `calculator_completion` — enough starts but weak completion.
- `builder_continuation` — enough completed calculations but weak next-step continuation.
- `affiliate_click` — enough product impressions but weak merchant click-through.

Technical eligibility, local merchant rules and no-cross-market product guardrails remain unchanged. GSC is the search/indexing source of truth; public SERP sampling is only a smoke signal.

## Measurement window

Record the source date range with every exported evidence file. After an optimization, keep the same route and event definitions and compare a sufficiently similar post-change window before deciding whether to keep or revert the change.
