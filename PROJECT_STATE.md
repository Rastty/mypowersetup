# MyPowerSetup — project state

Updated: 2026-11-20. Truth: GitHub `main`, Actions/Pages and direct `https://mypowersetup.com/` readback.

## Goal
Grow qualified organic traffic and attributable affiliate profit across seven markets, preserving electrical fit, approved merchants, actual stock, local delivery and exact purchase destinations. Solaris remains excluded by owner decision.

## Completed and publicly verified
- [PR #637](https://github.com/Rastty/mypowersetup/pull/637) (`50bcb948`): PT/RO/SI incomplete-calculator results now show individually verified components early, clearly marked partial with named missing system categories; primary complete-purchase routing unchanged. `result-partial` source attribution added, with stale/unavailable/unapproved offers excluded.
- [PR #638](https://github.com/Rastty/mypowersetup/pull/638) (`31ee3de3`): corrected all 8 Romanian OXE price units from false EUR to merchant-feed RON, with source-level parsing, catalog guard, regression and browser cache-busting.
- [PR #639](https://github.com/Rastty/mypowersetup/pull/639) (`33b1c011`): reconciled Romanian OXE official feed against each exact **live product page**. Stock and publicly displayed sale price must be proven; homepage redirects, unavailable/ambiguous pages and unverified prices cannot be recommended. 8 live pages checked: 6 true product pages, 2 homepage redirects; 2 currently purchasable stations remain (OXE8817 at **1,210.91 RON**, OXE8821 at **2,979.78 RON**).
- GitHub CI **1,632/1,632 local tests passed** for latest code, affiliate-ID and expansion/commercial gates passed; PR and post-merge CI successful. Automated RO/SI and affiliate catalog refresh succeeded and Pages deployed newest catalog to `main` (`b9712873`).
- Exact live RO catalog Git blob `24b996d9` matches GitHub `main`; buyer-path recommendation readback returns only the two in-stock OXE offers, with correct RON amounts. Production audit: **171/171 routes**, 9 module assets, 91 articles, 7 guide hubs, SEO and links: **0 failures**.
- Reusable source-currency and live-offer proof nominated for Prometheus Core review in [issue #2216](https://github.com/Rastty/prometheus-growth-os/issues/2216). Core code not changed.

## Blockers
- Complete PT/RO/SI fixed-system offers still lack approved, purchase-ready pure-sine inverter stock. Existing AMPUL 24V / 2000W candidate lacks independently documented **continuous power**, exact variant inventory and PT/RO/SI checkout/delivery proof; do not activate based on peak rating.
- Search Console via current Windsor connection exposes `klix.cz` only; MyPowerSetup GSC reporting exists in Prometheus Core, but fresh site data were not verified in this run. No claim of CTR/SEO lift or revenue/commissions from releases.

## Next highest-value cycles
1. Close the 24V pure-sine inverter supply gap **only with existing approved merchants**, verified continuous rating, stock, PT/RO/SI shipping and exact affiliate destination.
2. Secure or read current MyPowerSetup GSC query/page evidence via the existing Core workflow, then improve one distinct buyer-intent discovery path; don't repeat speculative edits.
3. Measure consented product impressions and outbound affiliate clicks by `result-partial` vs `result-featured`, and confirmed commissions when real observations exist. Consider source-vs-live stock/price checks for other approved OXE markets if evidence warrants.
