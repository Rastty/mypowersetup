# Butler Technik / Awin 31291 — affiliate application packet

Status: **READY_TO_SUBMIT**
Priority: **high — one approval unlocks controller + DC-DC sourcing**
Verified: 2026-09-18

## Programme

- First-party affiliate page: https://www.butlertechnik.com/affiliate-program
- Awin merchant profile: https://ui.awin.com/merchant-profile/31291
- Merchant ID: `31291`
- Existing MyPowerSetup Awin affiliate ID used by the repository: `3044971`

Current public programme evidence:
- 30-day attribution cookie
- current public programme states 2% to 5% commission, with higher-performance bonuses possible
- daily product data feed
- bespoke creatives and product deeplinks
- Victron Energy included explicitly
- RV / motorhome / campervan / caravan / off-grid audiences explicitly welcomed
- worldwide delivery

## Suggested Awin application / publisher message

Hello,

I would like to join the Butler Technik affiliate programme for MyPowerSetup.com.

MyPowerSetup is an independent technical website focused on electrical-system sizing for campervans, motorhomes and caravans. We provide localized calculators and practical guides covering battery capacity, solar panels, MPPT controllers, pure-sine inverters, DC-DC charging and shore charging.

Our recommendations are specification-driven: a product is shown only when its electrical parameters match the user's calculated system requirements. We currently serve several European markets, including Portugal, Romania and Slovenia, as well as Central European markets.

Butler Technik is a strong fit because of your Victron Energy range, worldwide delivery and support for RV / campervan / off-grid customers.

Our immediate product priorities are:
- Victron SmartSolar MPPT 250/60-MC4
- Victron Orion XS 12/12 50A DC-DC charger

We would also like to use your daily product feed and exact product deeplinks where available.

Website: https://mypowersetup.com/

Thank you for considering our application.

MyPowerSetup team

## Exact products staged for activation

### Controller
- Candidate: `butler-victron-scc125060321`
- Product: Victron SmartSolar MPPT 250/60-MC4
- Part number: `SCC125060321`
- Exact retail page: https://www.butlertechnik.com/item/Victron/SmartSolar-MPPT-250-60-MC4/BT2
- Current: 60 A
- System voltages: 12 / 24 / 48 V
- Verified PV capability: 860 W @ 12 V / 1720 W @ 24 V
- Public stock evidence refreshed 2026-09-18: in stock, £275.00 ex VAT

### DC-DC charger
- Candidate: `butler-victron-orion-xs-12-12-50`
- Product: Victron Orion XS 12/12 50A
- Part number: `ORI121217040`
- Exact retail page: https://www.butlertechnik.com/item/Victron/Smart-Buckboost-50A-700W-non-iso-DC-DC-charger/BPV
- Input/output system: 12 V → 12 V
- Current: 50 A
- Power: 700 W
- LiFePO4 compatible
- Smart-alternator compatible
- Public stock evidence refreshed 2026-09-18: in stock, £232.46 ex VAT

## Zero-code activation path

Production sync reads `data/butler-affiliate-activation.json`. No Butler product is published while the committed default is unapproved.

After Awin merchant 31291 is approved:

1. set `approvalConfirmed: true`;
2. set `approvalSource` to a non-secret note identifying where the approval was confirmed;
3. generate and test at least one exact Butler product deeplink using Awin merchant 31291 / affiliate 3044971;
4. set `trackingVerifiedAt` to the verification date (`YYYY-MM-DD`);
5. refresh exact-product stock/price evidence in the same data file if it is older than 14 days;
6. commit the data-only change.

The production adapter builds exact Awin deeplinks only for the two staged Butler URLs. Stock evidence expires fail-closed after 14 days. A product with stale stock, wrong destination, wrong merchant/affiliate ID, mutated electrical specs or an unverified market cannot enter PT/RO/SI catalogs.

## Activation checklist after approval

- [ ] Awin merchant 31291 status is joined/approved
- [ ] non-secret approval evidence recorded
- [ ] actual programme commission group recorded
- [ ] SmartSolar exact deeplink generated and verified
- [ ] Orion XS exact deeplink generated and verified
- [ ] `trackingVerifiedAt` recorded
- [ ] daily product-feed access confirmed
- [x] PT/RO/SI shipping evidence preserved
- [x] data-only activation surface prepared
- [x] exact product stock evidence refreshed 2026-09-18
- [x] PT/RO/SI catalog sync prepared
- [x] PT/RO/SI runtime validation prepared
- [x] market isolation and stale-stock guardrails prepared
- [ ] activation data updated with real approval/tracking evidence
- [ ] post-activation CI green
- [ ] commercial report confirms the intended controller / DC-DC coverage change

## Existing technical readiness

Already implemented in the repository:

- Butler Awin adapter with merchant ID 31291 / affiliate ID 3044971
- exact-product-only allowlist
- deterministic exact Awin deeplink construction
- data-only post-approval activation
- fail-closed approval / tracking / stock evidence gates
- SmartSolar 60A candidate validation
- Orion XS 50A candidate validation
- PT/RO/SI catalog sync wiring
- PT/RO/SI runtime catalog validation
- shipping-market evidence
- onboarding guards and sourcing ranking

After approval, no new affiliate plumbing or source-code edit should be required.
