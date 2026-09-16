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

JSON, CSV or TSV are accepted. For compact GA4 exports, one row may represent many events through `Event count`; the report uses that count as the funnel weight rather than incorrectly treating the row as one event.

The preferred flat export contains these columns:

```csv
Event name,Event count,Calculator landing path,Calculator landing locale,Calculator landing intent
calculator_landing_view,40,/kalkulacky/kapacita-baterie/,cs,battery-capacity
calculator_started,25,/kalkulacky/kapacita-baterie/,cs,battery-capacity
```

English and Czech aliases such as `Event name` / `Název události` and `Event count` / `Počet událostí` are recognized. Existing raw JSON event rows with `parameters` remain supported.

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
