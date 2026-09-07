# Xdatou / GoAffPro — affiliate application packet

Status: **READY_TO_SUBMIT**
Priority: **P0 — large 24 V inverter route for PT/RO/SI**
Verified: 2026-09-07

## Application

First-party affiliate page:
- https://eu.xdatou.com/pages/affiliate-program

Embedded GoAffPro programme endpoint observed from the first-party affiliate page:
- https://xdatou.goaffpro.com/

### Suggested English profile / application text

MyPowerSetup.com is an independent technical website helping van, camper and motorhome owners size their electrical systems correctly.

We provide localized calculators and practical guides for battery capacity, solar panels, MPPT controllers, pure-sine inverters, DC-DC charging and shore charging. Product recommendations are shown only when the product specifications match the user's calculated requirements.

MyPowerSetup currently serves several European markets, including Portugal, Romania and Slovenia. We are interested in promoting Xdatou / DATOUBOSS products that are a precise technical fit for these users.

Our immediate priority is the DATOUBOSS 24V 2000W pure sine wave inverter for higher-power 24V camper scenarios.

Website: https://mypowersetup.com/

## Exact product staged for activation

- Candidate: `xdatou-datouboss-2000w-24v`
- Product: DATOUBOSS 2000W Pure Sine Wave Inverter 24V to 230V
- Exact retail page: https://eu.xdatou.com/collections/xdatou-portable-inverter/products/datouboss-2000w-pure-sine-wave-inverter-24v-car-truck
- System voltage: 24 V
- Continuous power: 2000 W
- Peak power: 4000 W
- Waveform: pure sine
- Commercial fit: coffee-offgrid + high-power-tools scenarios
- Current public-store regions explicitly include Portugal, Romania and Slovenia

## What to capture after approval

Do **not** guess these values. Copy them from the approved GoAffPro account / generated referral link:

1. referral query-parameter name / identifier
   - example shape only: `ref`, `aff`, etc.
   - the actual value must come from the account
2. referral code / affiliate code
   - actual assigned code only

The repository already contains a fail-closed adapter that accepts these values dynamically. It does not hardcode or infer them.

## Activation checklist after approval

- [ ] GoAffPro/Xdatou affiliate account approved
- [ ] actual referral identifier recorded
- [ ] actual referral code recorded
- [ ] exact product deeplink generated and tested
- [ ] PT store region / shipping still valid
- [ ] RO store region / shipping still valid
- [ ] SI store region / shipping still valid
- [ ] `XDATOU_GOAFFPRO.approvalConfirmed` activated with real credentials
- [ ] PT and expansion-EU sync run
- [ ] Xdatou exact product appears only in PT/RO/SI catalogs
- [ ] runtime exact-product/tracking validation passes
- [ ] full CI green
- [ ] commercial opportunity report confirms the intended inverter coverage change

## Existing technical readiness

Already implemented in the repository:

- fail-closed GoAffPro adapter
- exact Xdatou product allowlist
- exact-product affiliate URL validation
- PT/RO/SI catalog sync wiring
- PT/RO/SI runtime catalog validation
- stock and market gating
- integration tests proving no product leaks before approval

After approval, no new catalog plumbing should be required.
