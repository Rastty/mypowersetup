# AMPUL expansion activation runbook

Status: **affiliate approved / eHub tracking verified / technical-rating and market eligibility still fail-closed**

## Why this route matters

AMPUL is already an approved eHub merchant in MyPowerSetup. Two exact products are relevant to PT/RO/SI:

- 24 V → 230 V AC, **2000 W advertised maximum** pure-sine inverter — a possible solution for the 24 V inverter gap, **only if its continuous-duty rating proves adequate**.
- 12/24 V input → 14.6 V, 30 A LiFePO4 DC-DC charger — technically fits the 12 V service-battery charging path.

No new affiliate application is required.

## Verified now

- eHub tracking IDs already work for exact AMPUL product destinations.
- AMPUL states that it ships to 32 European countries.
- Romanian and Slovenian storefronts are publicly available.
- The 30 A DC-DC charger is currently present in the approved AMPUL feed as available.
- The 24 V / 2000 W inverter variant is present in the approved feed, but variant-specific availability is not explicit enough to treat it as in stock.
- On **2026-11-17** the [official AMPUL inverter product page](https://ampul.eu/en/inverters-and-ac-dc-converters/5577-7391-voltage-converter-from-dc-to-230v-ac-50hz-2000w) described **2000 W as maximum power**. This does **not** verify 2000 W continuously. The 24 V variant's exact continuous rating remains unknown.
- On **2026-11-17** the [official AMPUL DC-DC page](https://ampul.eu/en/battery-chargers/6195-dc-dc-lifepo4-battery-charger-146v-30a-400w-ip68) said **IP68 in the title but IP65 in its specifications**. The protection class is therefore unverified; do not claim either value.

## Still required before public activation

1. Obtain an explicit, date-stamped *continuous-duty* wattage rating for the **24 V** inverter (manufacturer datasheet or exact-variant product documentation). Its **2000 W maximum** must never be entered as rated continuous power without independent proof. Store `products["ampul-eu-inverter-24v-2000w"].continuousRating` in `data/ampul-expansion-market-verification.json` with `continuousPowerW` (integer up to 2000), `evidenceUrl` (HTTPS), and `verifiedAt` (`YYYY-MM-DD`). The value becomes the public recommendation `specs.powerW` and `specs.continuousPowerW`.
2. Verify checkout/shipping eligibility individually for Portugal, Romania and Slovenia with dated evidence in each exact product-market record.
3. Verify current stock of the **24 V** inverter variant specifically; do not substitute general 12 V or family stock.
4. Resolve the DC-DC product's **IP68/IP65** contradiction before advertising any ingress-protection rating. Technical recommendation currently relies on its other electrical specs, not on an IP rating.
5. Keep the existing eHub deeplink exact; do not replace it with an untracked AMPUL URL.
6. Run commercial coverage and recommendation tests before ingesting either product into PT/RO/SI public catalogs.

## Ownership

This verification is **system-owned**. It does not require a new affiliate application from the user.

## Fail-closed rule

General “ships to Europe” language, a localized storefront, product existence, or an inverter's *peak/maximum* wattage alone is not sufficient to mark PT/RO/SI as recommendation-eligible. Missing or malformed continuous-power proof keeps the inverter blocked even if stock and shipping records are marked verified.
