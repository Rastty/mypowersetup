# Butler Technik / Awin 31291 — affiliate application packet

Status: **READY_TO_SUBMIT**
Priority: **high — one approval unlocks controller + DC-DC sourcing**
Verified: 2026-09-07

## Programme

- First-party affiliate page: https://www.butlertechnik.com/affiliate-program
- Awin merchant profile: https://ui.awin.com/merchant-profile/31291
- Merchant ID: `31291`
- Existing MyPowerSetup Awin affiliate ID used by the repository: `3044971`

Current public programme evidence:
- 30-day attribution cookie
- base commission from 2%, with higher rates/bonuses possible
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
- Candidate: `butler-victron-smartsolar-250-60-mc4`
- Product: Victron SmartSolar MPPT 250/60-MC4
- Exact retail page: https://www.butlertechnik.com/item/Victron/SmartSolar-MPPT-250-60-MC4/BT2
- Current: 60 A
- System voltages: 12 / 24 / 48 V
- Verified PV capability: 860 W @ 12 V / 1720 W @ 24 V
- Current stock evidence: in stock

### DC-DC charger
- Candidate: `butler-victron-orion-xs-12-12-50`
- Product: Victron Orion XS 12/12 50A
- Exact retail page: https://www.butlertechnik.com/item/Victron/Smart-Buckboost-50A-700W-non-iso-DC-DC-charger/BPV
- Input/output system: 12 V → 12 V
- Current: 50 A
- Power: 700 W
- LiFePO4 compatible
- Smart-alternator compatible
- Current stock evidence: in stock

## What to capture after approval

- [ ] Awin merchant 31291 status is joined/approved
- [ ] actual programme commission group recorded
- [ ] SmartSolar exact deeplink generated and verified
- [ ] Orion XS exact deeplink generated and verified
- [ ] daily product-feed access confirmed
- [ ] PT shipping eligibility confirmed
- [ ] RO shipping eligibility confirmed
- [ ] SI shipping eligibility confirmed
- [ ] existing fail-closed Butler adapter activated
- [ ] exact products synced into target catalogs
- [ ] full CI green
- [ ] commercial report re-generated

## Existing technical readiness

Already implemented in the repository:

- Butler Awin adapter with merchant ID 31291 / affiliate ID 3044971
- exact-product-only allowlist
- fail-closed approval flag
- SmartSolar 60A candidate validation
- Orion XS 50A candidate validation
- shipping-market evidence
- onboarding guards
- sourcing ranking
- exact deeplink construction after approval

No new affiliate plumbing should be required after programme approval.
