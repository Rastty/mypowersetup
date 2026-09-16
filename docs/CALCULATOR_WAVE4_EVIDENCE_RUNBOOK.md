# Calculator Wave 4 evidence runbook

Wave 4 optimizes existing calculator routes from observed search and funnel evidence. It does not create new routes just to increase page count.

## Inputs

### 1. GSC page/query export

JSON array, or an object with `rows` / `data`. Supported row shapes:

```json
{"page":"https://mypowersetup.com/kalkulacky/dc-dc-nabijecka/","query":"dc dc nabijecka karavan","clicks":3,"impressions":120,"position":7.2}
```

or native Search Console-style keys:

```json
{"keys":["https://mypowersetup.com/kalkulacky/dc-dc-nabijecka/","dc dc nabijecka karavan"],"clicks":3,"impressions":120,"ctr":0.025,"position":7.2}
```

Only known calculator roots are accepted: CZ `/kalkulacky/`, SK `/sk/kalkulacky/`, PL `/pl/kalkulatory/`, HU `/hu/kalkulatorok/`.

### 2. GA/event export

JSON array, or an object with `events` / `rows` / `data`. Events use the existing calculator attribution parameters and are summarized through the canonical `buildCalculatorFunnelSummary` logic.

Measured chain:

`calculator_landing_view → calculator_started → calculation_completed → calculator_landing_continue → product_choice_impression → affiliate_click`

### 3. Optional URL inspection/indexing export

JSON array, or an object with `rows` / `data`. Minimal shape:

```json
{"url":"https://mypowersetup.com/kalkulacky/dc-dc-nabijecka/","indexed":true}
```

`coverageState`, `verdict` or `status` are also accepted for common inspection exports.

## Run

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
