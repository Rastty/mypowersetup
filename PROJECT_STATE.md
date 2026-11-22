# MyPowerSetup — PROJECT_STATE

Updated: **2026-11-22**. Source of truth: current GitHub `Rastty/mypowersetup` `main`, GitHub Actions, approved affiliate source catalogs and verified production evidence. No invented clicks, commissions or profit.

## Objective
Build the strongest trustworthy **caravan/campervan electrical buying advisor** for existing **CZ → SK → PL** before any additional vertical. Simple questions → right battery/PV/inverter/charging sizing → early visible exact eligible local products → tracked affiliate purchase/partial basket → source-backed installation handoff. Do **not** add Solaris or unapproved merchants. Shared lessons go to Prometheus Core without duplicating engines.

## Verified shipped product
- Core existing product: scenario-first CZ/SK/PL buyer path, purchasable/partial baskets, accurate local currencies and source/stock/affiliate gates, source-backed MPPT and EcoFlow 175W / Victron BlueSolar 190Wp PV-string compatibility; covered by [PRs #675–683](https://github.com/Rastty/mypowersetup/pulls?q=is%3Apr+is%3Amerged+675..683).
- [#685](https://github.com/Rastty/mypowersetup/pull/685): manufacturer proof must be exact-SKU to elevate a battery BMS sustained-discharge specification. A merchant's numeric field or `verifiedAt` alone is not proof. [#684](https://github.com/Rastty/mypowersetup/issues/684) remains open for expansion.
- [#686](https://github.com/Rastty/mypowersetup/pull/686): manufacturer-backed conservative **50A recommended sustained** current (not higher transient maximum) for 4 exact Padabo SK/PL Victron SuperPack NG 100Ah offers (12.8V and 25.6V); currency/affiliate/variant/stock exact identity enforced. Source: [Victron SuperPack NG technical data](https://www.victronenergy.com/media/pg/Lithium_SuperPack_NG/en/technical-data.html).
- [#687](https://github.com/Rastty/mypowersetup/pull/687): economy/reserve buying baskets independently check explicit battery BMS current against actual customer requested inverter load, for 12/24V; no title or generic field promoted to manufacturer proof.
- **Latest [#688](https://github.com/Rastty/mypowersetup/pull/688)** merged `0321deeffa07a191eb42c7abb2c209c23f61645a`: manufacturer-backed **Victron Orion-Tr Smart non-isolated 12/12–30 A** LiFePO₄ charging available at already-approved exact **Padabo SK `padabo_sk:26963_28360` and PL `padabo_pl:26963_28360`** URLs. Previously SK feed incorrectly had lead-only chemistry; now exact stock/merchant/name/URL/EUR or PLN/eHub campaign/source evidence are required for promotion. Preserves already-shipped Orion XS 50A sources. Manufacturer: [Victron Orion-Tr Smart non-isolated](https://www.victronenergy.com/dc-dc-converters/orion-tr-smart-non-isolated). Manufacturer-confirmed chemistry is a product capability, not complete approval of installation, alternator or BMS charging limits.

## Tests, deployment and evidence
- PR #688 [Test #45001331920](https://github.com/Rastty/mypowersetup/actions/runs/45001331920) **PASS** including Node regression/CI and mobile smoke.
- Exact merged main `0321deeffa07`: [Test #45001411414](https://github.com/Rastty/mypowersetup/actions/runs/45001411414) **PASS**, [GitHub Pages #45001411759](https://github.com/Rastty/mypowersetup/actions/runs/45001411759) **PASS with deploy**. GitHub Pages deployment is not independently verified production HTTP content readback: external domain access from this agent environment failed.
- Catalog read before #688: approved Padabo SK/PL sources `ok`; exact SK/PL Orion 30A products `available:true`. Independent follow-up stock/source freshness remains mandatory; overnight or subsequent sync may change it.
- No independently observed orders, user click uplift, approved/paid affiliate commissions, or attributable profit. Mark **unknown**, not zero.

## Next priorities by expected business effect
1. **More real buyable complete baskets**: source-verified existing **CZ** high-current LiFePO₄ batteries and high-demand 12/24V battery/MPPT/charging combinations, strict seller SKU evidence. Do not manufacture data or add unsupported brands.
2. **Charging completeness**: source-backed DC–DC and 230V shore matching, correct alternator/starter and lithium charging-profile verification, especially missing CZ options; show partial rather than falsely complete where safety is unverified.
3. **Monetization feedback loop**: consented calculations→recommendations→affiliate outbound clicks, and separately verified approved vs paid commissions, using existing Prometheus instrumentation. Optimize business effort with genuine results only.

**Core handoff:** [Prometheus Core #1726](https://github.com/Rastty/prometheus-growth-os/issues/1726) covers shared SKU-proof/safe buyer handoff patterns; no Core deploy claimed.

**History:** [Previous full state](https://github.com/Rastty/mypowersetup/blob/1053dc5280ce88f700182687cbe2afd5a403bfe2/PROJECT_STATE.md), prior PRs and Actions contain detailed verified checkpoints. Keep this document concise.
