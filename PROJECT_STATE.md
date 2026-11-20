# MyPowerSetup — project state

Updated: 2026-11-20. Source of truth: `main`, GitHub Actions and public `https://mypowersetup.com/` readback.

## Goal

Grow qualified organic traffic and attributable affiliate profit across the seven live markets without weakening electrical-fit, stock, shipping or merchant-approval safeguards. Use existing approved merchants; Solaris is out of scope by owner decision.

## Verified baseline

- `main` at the start of this cycle: `9a11855b5be369b49025d94b9a5899dcfb6d3271` (2026-11-20).
- GitHub Pages deployment and production audit for that SHA succeeded; local public readback: 171/171 routes, SEO checks clear, all seven catalog URLs available.
- Starting test suite: 1,623 passed. No open PR at cycle start.
- Seven-market commercial report (generated 2026-11-20) ranks missing pure-sine inverter supply in PT, RO and SI as P0. Existing approved AMPUL 24 V candidate remains blocked on continuous-rating, variant stock and target-market checkout verification; no product may be activated on incomplete evidence.

## Current cycle

- Implemented site-specific early display of **individually** verified PT/RO/SI components when neither a complete matched basket nor a fully fitting portable purchase path exists. Missing categories are displayed before any partial purchase links. Stale/unavailable/untracked products and failed sources remain excluded; primary purchase-ready presentation is unchanged. Attribution distinguishes `result-partial` from `result-featured`.
- Release and public verification: **pending** until this change is merged and exact deployed JS/HTML is verified.

## Next priorities

1. Run full regression, merge only after green gates, verify GitHub Pages + exact live bytes and family-touring buyer path across PT/RO/SI.
2. Verify continuous rated power, 24 V variant stock and PT/RO/SI checkout for the existing approved AMPUL inverter. Do not activate without source evidence.
3. Use fresh Search Console intent evidence to pick the next high-intent guide / calculator acquisition improvement; avoid repeating prior speculative SEO edits.

## Measurement

Track consented `product_choice_impression` and `affiliate_click` with `source=result-partial`, alongside existing `result-featured`; compare eligible scenario purchase-click rates after enough traffic. Revenue, clicks and uplift are unknown until measured—never infer them from release success.
