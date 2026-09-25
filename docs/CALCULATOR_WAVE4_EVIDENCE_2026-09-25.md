# Calculator Wave 4 — live evidence snapshot, 25 September 2026

## Result

The read-only Search Console recheck confirms that the discovery intervention worked.

- 17 September baseline: **1 / 18** calculator URLs indexed.
- 25 September live inspection: **16 / 19** indexed.
- Search window: **26 August–22 September 2026**.
- Current calculator-cluster search volume is still small: **9 impressions / 1 click** in the page totals.
- GA4 route-level evidence is still unavailable because the credential used by the bounded probe does not carry `analytics.readonly`.

## Remaining indexing gaps

1. `/kalkulacky/vydrz-baterie/` — **URL is unknown to Google**. This route was published only on 24 September; observe before intervening again.
2. `/kalkulacky/mppt-regulator/` — **Discovered - currently not indexed**. Wave 9 strengthens direct contextual links from the solar guide and solar-result flow.
3. `/pl/kalkulatory/` — **Crawled - currently not indexed**. Wave 9 adds a contextual link from the Polish guide hub and additional unique decision value on the calculator hub itself.

No title, meta description or H1 changes are justified yet. The strongest current search signal is the Czech cable-size calculator with 8 impressions at average position 13.75, still below the configured 20-impression CTR action threshold.

## Measurement rule

Re-run live URL Inspection after recrawl. Keep the new battery-autonomy route in observation because it is too new to diagnose. Search-copy optimization remains gated on sufficient query evidence; funnel optimization remains gated on a valid read-only GA4 credential that carries `analytics.readonly`.
