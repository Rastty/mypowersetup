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

The public BLUETTI EU affiliate page supports affiliate links but does not expose enough information to prove which exact network/tracking template applies to the user's approved account for `bluettipower.eu`.

Until the exact EU deeplink is verified:

- `productUrl` stays null in onboarding state
- `affiliateUrl` stays null
- BLUETTI Elite 300 does not enter PT/RO public catalogs
- no purchase-ready coverage is claimed from this candidate

## One required external action

In the approved BLUETTI affiliate dashboard, generate a deep link whose landing destination is exactly:

`https://www.bluettipower.eu/products/elite-300-portable-power-station`

If the current BLUETTI programme only allows `bluettipower.com` or another regional storefront, do not reuse that tracking link. Treat EU approval/deeplinking as separate.

## Evidence to capture

Record:

1. affiliate network/platform name
2. advertiser/merchant/program ID when visible
3. exact generated tracking URL
4. final landing URL after the tracking click
5. confirmation that the landing host is `www.bluettipower.eu`
6. date verified

The final landing path must remain:

`/products/elite-300-portable-power-station`

## Activation sequence in repo

Once the exact EU tracking URL is available:

1. add a strict BLUETTI EU affiliate adapter for the verified network format
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

Last verified: 2026-09-07.
