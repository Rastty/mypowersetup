# HU Árukereső.hu onboarding

Status: publisher application submitted; integration must remain disabled until Dognet approval and exact campaign assets are available.

## What we need after approval

1. The exact Árukereső.hu campaign link copied from Dognet publisher administration after selecting the dedicated MyPowerSetup Ad Channel.
2. The exact destination mechanism shown for that campaign (`desturl` or `data2`). Do not infer it from another Dognet campaign.
3. The XML feed URL from the Dognet administration.
4. A test click verified in Dognet reporting after the normal reporting delay.

## Required Ad Channel

Create/use a dedicated channel for MyPowerSetup HU and keep its `chan` parameter on every affiliate link. The adapter intentionally rejects a campaign link without `chan`, `a_aid` or `a_bid`.

## Safety rules

- Preserve every parameter supplied by Dognet; do not rewrite or remove campaign parameters.
- Destination must stay on `arukereso.hu` or one of its subdomains and must not be the homepage.
- Only exact products with explicit MPPT evidence, controller current and sufficient technical parameters may enter recommendation matching.
- PWM controllers must never satisfy the HU MPPT launch requirement.
- The XML feed is not trusted merely because a product name contains `controller`; normal MyPowerSetup classification and matching rules still apply.
- A stale or failed Árukereső feed must not be allowed to open the HU launch gate.

## Ready adapter

`src/dognet-affiliate.js` validates the Dognet campaign link and builds an Árukereső deep link only after the campaign-specific destination parameter is explicitly supplied. This keeps the pre-approval implementation useful without guessing campaign tracking behavior.

## External references checked 2026-08-29

- Dognet Árukereső.hu campaign: requires a dedicated Ad Channel and keeping all parameters supplied by the publisher interface; XML feed is available.
- Dognet publisher documentation: standard redirect links use `desturl`, while selected campaigns use `data2`; therefore the exact Árukereső campaign setting must be confirmed after approval rather than guessed.
