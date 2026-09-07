# BLUETTI Elite 300 EU affiliate activation

## Commercial reason

The Elite 300 is the current preferred pending family-touring route for Portugal and Romania.

Verified current product fit:

- exact retail destination: https://www.bluettipower.eu/products/elite-300-portable-power-station
- 3,014.4 Wh LiFePO4 capacity
- 2,400 W continuous AC output
- 4,800 W surge
- 1,200 W maximum solar input
- 12 V / 30 A RV DC output
- current retail stock: in stock
- current observed price: EUR 1,499
- BLUETTI shipping-country page explicitly includes Portugal and Romania
- Slovenia is not on the current direct-delivery list

This profile passes the current MyPowerSetup `family-touring` portable-power requirement and carries standalone commercial unlock weight 5.

## Activation is intentionally fail-closed

Do not reuse the historical BLUETTI US tracking link for this product.

The owner's BLUETTI affiliate relationship is confirmed through CJ. The repository intentionally does not invent the CJ advertiser/program ID or tracking template because no exact Elite 300 EU deeplink has been captured yet.

Until the exact EU deeplink is verified:

- `productUrl` stays null in onboarding state
- `affiliateUrl` stays null
- BLUETTI Elite 300 does not enter PT/RO public catalogs
- no purchase-ready coverage is claimed from this candidate

## One remaining external action

In the approved BLUETTI CJ dashboard, generate a deep link whose landing destination is exactly:

`https://www.bluettipower.eu/products/elite-300-portable-power-station`

If the current BLUETTI programme only allows `bluettipower.com` or another regional storefront, do not reuse that tracking link. Treat EU approval/deeplinking as separate.

## Evidence to capture

CJ is already recorded as the approved network. Capture only the remaining activation evidence:

1. exact generated CJ tracking URL
2. final landing URL after the tracking click
3. confirmation that the landing host is `www.bluettipower.eu`
4. date verified

Record the CJ advertiser/program ID only if it is explicitly visible in the approved dashboard or tracking URL; do not infer it.

The final landing path must remain:

`/products/elite-300-portable-power-station`

## Activation sequence in repo

Once the exact EU tracking URL is available:

1. add a strict BLUETTI EU CJ adapter for the exact verified deeplink format
2. validate exact Elite 300 destination only
3. add the current live SKU to PT and RO catalog sync
4. require `marketEligible: true`, stock evidence and exact tracking at runtime
5. run commercial scenario tests
6. confirm `family-touring` becomes portable-ready
7. verify PT/RO purchase-ready ratio moves from 14/19 to 19/19 if no other route regression occurs
8. keep SI excluded until BLUETTI explicitly supports direct delivery there

## Current official evidence

- retail/specs: https://www.bluettipower.eu/products/elite-300-portable-power-station
- shipping countries: https://www.bluettipower.eu/pages/shipping-country
- affiliate programme: https://www.bluettipower.eu/pages/affiliate-program

Current affiliate state: CJ approval owner-confirmed; exact Elite 300 EU deeplink pending.

Last verified: 2026-09-07.
