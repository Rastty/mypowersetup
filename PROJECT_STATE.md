# MyPowerSetup — project state

Updated: 2026-11-20. Source of truth: GitHub `main`, successful Actions/Pages runs, and public `https://mypowersetup.com/` readback.

## Goal
Grow qualified organic traffic and attributable affiliate profit in seven markets without weakening electrical fit, stock, delivery or approved-merchant safeguards. Solaris remains excluded by owner decision.

## Completed and verified
- PT/RO/SI incomplete-system monetization, [PR #637](https://github.com/Rastty/mypowersetup/pull/637), merge `50bcb948`: individually verified approved components now appear directly in results where no full basket/portable route fits. Missing component categories are named; partial offers are never represented as complete systems. `result-partial` attribution is distinct and excludes stale/unavailable/untracked offers. Public HTML and browser JS byte parity verified.
- Romanian OXE price-currency fix, [PR #638](https://github.com/Rastty/mypowersetup/pull/638), merge `31ee3de3`: official OXE RO feed supplies RON; all 8 local power-station offers and the parser now use RON, not mislabeled EUR. RO validator rejects priced OXE offers with wrong currency. Feed price/unit parity confirmed for all 8; other merchant currencies, affiliate deeplinks and availability safeguards preserved.
- Regression: **1,629/1,629 tests passed** for the second release; affiliate IDs and PT/RO/SI release gates passed. GitHub PR and post-merge CI, Pages build/deploy succeeded.
- GitHub Actions refreshed affiliate catalogs onto `main` (`43fc5fc29`) and redeployed Pages successfully. Production RO catalog SHA-1 equals the current GitHub blob (`9124d64f`); all 8 OXE prices remain RON. Public audit: **171/171 routes**, 9 JS/module assets, 91 article pages, 7 guide hubs and SEO all pass with **zero failures**.
- Reusable source-currency validation finding nominated for Prometheus Core review: [issue #2216](https://github.com/Rastty/prometheus-growth-os/issues/2216). No Core implementation or cross-site deployment claimed.

## Blockers
- High-value PT/RO/SI complete fixed-system offers lack a verified suitable pure-sine inverter. Existing approved AMPUL 24 V / 2000 W candidate lacks **documented continuous output**, exact variant stock and PT/RO/SI checkout/delivery proof. Maximum/peak rating is insufficient; do not activate speculatively.
- No evidence yet of an increase in affiliate clicks, approved commissions or revenue from either release. Do not treat impressions or technical releases as realized profit.

## Next priorities (value first)
1. Obtain source-proven, purchase-ready inverter fit from an **existing approved merchant**; only then close the PT/RO/SI system basket gap. Keep AMPUL gated until continuous power, variant stock and local checkout are all verified.
2. Use fresh GSC buyer-intent query/page data to target one incremental high-value acquisition route; avoid duplicate speculative SEO edits or changes already done by other workers.
3. Compare consented `product_choice_impression` and `affiliate_click` events for `result-partial` vs `result-featured`; measure actual click-through and approved/paid commissions when sufficient observations exist.
