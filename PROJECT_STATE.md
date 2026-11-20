# MyPowerSetup — project state

Updated: 2026-11-20. Truth: GitHub `main`, Actions/Pages and direct `https://mypowersetup.com/` readback.

## Goal
Grow qualified organic traffic and attributable affiliate profit across seven markets, preserving electrical fit, approved merchants, actual stock, local delivery and exact purchase destinations. Solaris remains excluded by owner decision.

## Completed and publicly verified
- [PR #637](https://github.com/Rastty/mypowersetup/pull/637) (`50bcb948`): PT/RO/SI incomplete-calculator results now show individually verified components early, clearly marked partial with named missing system categories; primary complete-purchase routing unchanged. `result-partial` source attribution added, with stale/unavailable/unapproved offers excluded.
- [PR #638](https://github.com/Rastty/mypowersetup/pull/638) (`31ee3de3`): corrected all 8 Romanian OXE price units from false EUR to merchant-feed RON, with source-level parsing, catalog guard, regression and browser cache-busting.
- [PR #639](https://github.com/Rastty/mypowersetup/pull/639) (`33b1c011`): reconciled Romanian OXE official feed against each exact **live product page**. Stock and publicly displayed sale price must be proven; homepage redirects, unavailable/ambiguous pages and unverified prices cannot be recommended. 8 live pages checked: 6 true product pages, 2 homepage redirects; 2 currently purchasable stations remain (OXE8817 at **1,210.91 RON**, OXE8821 at **2,979.78 RON**).
- [PR #640](https://github.com/Rastty/mypowersetup/pull/640) (`26098da3`): shared RO/SK/PL/HU/SI live purchase-table verification for every OXE station (including technically incomplete feed rows). Exact product URL, localized in-stock status and public sale price are required; homepage redirects, conflicting stock and unverified prices fail closed. Six concurrent requests per market maximum; 12-second page timeouts. Immediate SK/PL/HU/SI snapshots published, no new merchants or Solaris.
- **Verified result after #640:** 1,635/1,635 tests passed locally; PR and post-merge CI, automatic RO/SI and SK/PL/HU/CZ catalog refresh, IndexNow and Pages succeeded. On 2026-11-20 the deployed SK/PL/HU/SI/RO catalog Git blobs exactly match GitHub `main` after refresh (`3f959dd8`). SK: 0 live-buyable OXE stations (2 previous invalid destinations removed); PL: 2 (S400 **1,128.35 PLN** vs stale 2,428.38; S400+panel **2,776.61 PLN** vs stale 4,045.41); HU: 5; SI: S2400 **1,245.96 EUR**; RO: 2. Public audit: **171/171 routes**, 9 JS modules, 91 articles, 7 guide hubs and SEO: **0 failures**.
- Reusable source-currency and localized live-offer proof handed to Prometheus Core for review in [issue #2216](https://github.com/Rastty/prometheus-growth-os/issues/2216). No Core code or cross-project deployment claimed.

## Blockers
- Complete PT/RO/SI fixed-system offers still lack approved, purchase-ready pure-sine inverter stock. Existing AMPUL 24V / 2000W candidate lacks independently documented **continuous power**, exact variant inventory and PT/RO/SI checkout/delivery proof; do not activate based on peak rating.
- Search Console via current Windsor connection exposes `klix.cz` only; MyPowerSetup GSC reporting exists in Prometheus Core, but fresh site data were not verified in this run. No claim of CTR/SEO lift or revenue/commissions from releases.

## Next highest-value cycles
1. Acquire new qualified traffic: identify one non-duplicate buyer-intent topic from verifiable public demand and existing article inventory, then build or deepen its localized calculator → live-offer path. Existing traffic is near zero; do not fabricate GSC lift.
2. Remove the remaining PT/RO/SI 24V pure-sine inverter supply blocker **only from approved merchants** after continuous (not peak) W rating, exact variant stock, delivery and affiliate checkout are proven. Owner evidence required if public sources are insufficient.
3. As traffic accrues, compare consented `result-partial`/featured offer impressions, outbound clicks and actually approved commissions; expand source-vs-live reconciliation to other merchants only where buyer-route evidence shows a defect.
