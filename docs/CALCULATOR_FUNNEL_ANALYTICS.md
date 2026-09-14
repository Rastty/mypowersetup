# Calculator SEO funnel analytics

## Purpose

Measure whether crawlable calculator landings create commercial value, not just page views. The attribution path is consent-safe and uses the existing Google Analytics + `sessionStorage` pattern. No PII and no new external tracker are introduced.

## Funnel contract

| Step | Event | Required landing dimensions | Extra parameters |
| --- | --- | --- | --- |
| Landing viewed | `calculator_landing_view` | `landing_path`, `landing_intent`, `landing_locale`, `source_context=seo_landing` | — |
| User starts calculation | `calculator_started` | same | `source=seo_landing_submit` |
| Calculation succeeds | `calculation_completed` | same | `source=seo_landing` |
| User continues | `calculator_landing_continue` | same | `destination_type=builder|guide`, `destination_path` |
| Product becomes visible | `product_choice_impression` | `calculator_landing_path`, `calculator_landing_intent`, `calculator_landing_locale`, `calculator_source_context` | existing product / merchant / category / role dimensions |
| Affiliate click | `affiliate_click` | same downstream calculator dimensions | existing product / merchant / category / role dimensions |

`product_choices_rendered` receives the same downstream calculator attribution and can be used as an aggregate recommendation-impression step.

## Attribution rules

- Calculator attribution is written only after analytics consent has been granted.
- Storage remains the existing same-origin `sessionStorage` approach.
- TTL is 30 minutes, matching the guide attribution window.
- Route + intent + locale combinations are allow-listed. Corrupt, expired, mismatched or cross-market values fail closed.
- Current CZ calculator routes are the only valid landing sources for this wave.
- Existing guide attribution is preserved independently. The early / late / inline guide CTA position from the former PR #402 is now retained downstream without adding another storage mechanism.

## Route / locale funnel review

Export GA events with the event name plus calculator landing dimensions into JSON and run:

```bash
npm run report:calculator:funnel -- path/to/events.json
```

Accepted input is either an array of events or `{ "events": [...] }`. Event dimensions can be top-level or under `parameters`.

The report groups by locale + intent + landing route and prints:

- views
- starts
- completed calculations
- builder / guide continuations
- product impressions
- affiliate clicks
- view → affiliate click rate

For SEO review, join the output to GSC by date + landing page. Prioritize pages with impressions but weak view→start, start→complete, complete→continue or view→click conversion instead of expanding page count blindly.

## Primary interpretation

A calculator landing is commercially proven only when it can be followed beyond the calculation into a recommendation impression or affiliate click. Search traffic without downstream progression is an optimization signal, not success by itself.
