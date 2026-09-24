# MyPowerSetup — calculator landing SEO strategy

Updated: 14 September 2026

## Goal

Build a scalable organic-acquisition layer around the existing MyPowerSetup calculation engine. The aim is not to create a collection of duplicate calculators. One shared calculation core should power multiple search-intent landing pages that answer a narrow question immediately, then route the user into the complete decision + shopping flow.

Core funnel:

**SERP query → focused calculator landing page → useful instant result → full MyPowerSetup calculation → recommended setup → local compatible products → affiliate click**

This is a growth requirement for MyPowerSetup, not an optional content experiment.

## Why this matters

Users rarely search first for a generic "camper electrical system calculator". They search for a specific problem: battery capacity, solar wattage, inverter size, MPPT size, DC–DC charger size, cable section, fuse sizing, autonomy or 12V vs 24V. Each high-intent problem should have a dedicated indexable entry point.

The landing page must provide genuine standalone value. It must not be a thin doorway page, keyword swap, or duplicated full calculator. The calculation logic remains centralized and tested in the shared engine.

## Priority calculator landing pages

Launch the first wave in the CZ golden master and then localize by actual search intent for SK, PL and HU.

1. Battery capacity calculator — battery Ah / Wh required for camper use.
2. Solar sizing calculator — required Wp from consumption, season and charging assumptions.
3. Inverter sizing calculator — continuous and surge requirement from AC loads.
4. MPPT sizing calculator — controller current / voltage envelope from solar array and battery voltage.
5. DC–DC charger calculator — appropriate charger current from driving profile and battery/system constraints.
6. 12V cable size / voltage-drop calculator — current, distance, allowed voltage drop → minimum conductor size.
7. Fuse / protection planning calculator — conservative planning output with the existing safety guardrails; never present an installation approval or replace manufacturer requirements.
8. Battery autonomy calculator — how many off-grid days a given battery/load profile provides.
9. 12V vs 24V decision tool — explain when each architecture makes sense using the same system assumptions.
10. Complete camper electrical system calculator — the canonical full-system builder and conversion destination.

Additional pages may be created only after query data proves demand or they fill a clear funnel gap.

## Search-intent architecture

Each page targets one primary intent and a small group of close variants. Do not make separate pages for trivial keyword permutations.

Example CZ intents:

- `kalkulacka kapacity baterie do karavanu`
- `jak velkou baterii do karavanu`
- `kolik W solaru na karavan`
- `kalkulacka solaru karavan`
- `jak silny menic do karavanu`
- `jak velky MPPT regulator`
- `jak silnou DC DC nabijecku`
- `prurez kabelu 12V kalkulacka`
- `jak dlouho vydrzi baterie v karavanu`

SK / PL / HU pages must be based on native-market keyword research and natural terminology, not literal URL/text translation.

## Page requirements

Every calculator landing page must contain:

- a unique title/H1 and concise answer-first introduction matching the exact intent,
- an interactive mini-calculator or focused subset of the shared engine above the fold or very early on mobile,
- editable assumptions and transparent formulas/guardrails,
- a useful result without requiring email, login or affiliate click,
- a prominent continuation CTA into the full MyPowerSetup builder with relevant values prefilled where technically safe,
- contextual explanation, examples and FAQ only where they add user value,
- local currency / terminology / relevant products for the market,
- internal links to the corresponding deep guide and the canonical full calculator,
- structured data only where valid and supported by visible content,
- analytics events for landing → calculation start → calculation complete → product impression → affiliate click.

## Guide + calculator pairing

Existing buyer-intent guides are not replaced. They become the explanatory half of a two-page cluster:

**Guide / education page ↔ focused calculator landing page → full decision engine → products**

Example:

`/pruvodce/kapacita-baterie-do-karavanu/` explains sizing, chemistry, margins and mistakes.

`/kalkulacky/kapacita-baterie-do-karavanu/` lets the user calculate the answer immediately.

Both link prominently to each other and to the complete builder. Avoid keyword cannibalization by keeping the intents explicit: guide = explanation; calculator = interactive answer.

## URL / canonical model

Recommended CZ hub:

`/kalkulacky/`

Example detail:

`/kalkulacky/kapacita-baterie-do-karavanu/`

Localized markets should use the established locale architecture and localized slugs where appropriate. Each localized page needs correct canonical, hreflang, sitemap inclusion and internal navigation. Do not canonicalize localized calculator pages back to CZ when they contain genuine localized value.

## Shared-engine rule

Do not fork calculation formulas per SEO page.

Focused calculators must import/use the same tested domain functions as the complete builder. A page may expose only the inputs needed for its intent, but the result must be derived from the canonical engine or a shared low-level calculation module.

Bug fixes and formula changes must therefore propagate to all calculator landing pages through shared code.

## Local-commerce differentiation

The SEO landing is only the acquisition layer. MyPowerSetup should outperform generic global calculators after the calculation by connecting the result to the local market:

- local language and units,
- locally available products,
- local price/currency,
- market-correct merchants and affiliate programs,
- no cross-market product leakage,
- Budget / Recommended / Reserve decision paths only when coverage is complete and technically valid.

## Rollout

### Phase 1 — CZ proof

Ship the calculator hub plus the first five highest-value pages: battery, solar, inverter, cable size and battery autonomy. Connect them to existing guides and the full builder. Verify indexability, mobile UX and event tracking.

### Execution status — 24 September 2026

The CZ cluster now publishes ten crawlable URLs including the hub. The Phase 1 battery-autonomy intent is live at `/kalkulacky/vydrz-baterie/` and uses the canonical battery assumptions in reverse rather than a separate formula.

Current CZ calculator intents:

- battery capacity,
- battery autonomy / runtime,
- solar sizing,
- inverter sizing,
- MPPT sizing,
- DC–DC charger sizing,
- 12/24 V cable sizing,
- fuse / DC protection planning,
- 12 V vs 24 V decision,
- calculator hub / full-builder handoff.

Battery autonomy is deliberately CZ-only until Search Console evidence justifies localization. SK/PL/HU must not receive a cloned route solely for parity.

## Phase 2 — complete CZ cluster

Add MPPT, DC–DC, protection planning and 12V vs 24V. Improve snippets/titles/FAQ based on Search Console query data rather than guesses.

### Phase 3 — SK / PL / HU localization

Localize the winning page types using native search intent and market-specific product paths. Do not blindly clone weak CZ pages.

### Phase 4 — exploitation

Use GSC to find impressions in positions roughly 4–20, expand only pages with query evidence, strengthen internal links, improve SERP CTR and connect commercial queries more directly to purchase-ready recommendations.

## Guardrails

- No mass generation of thin calculator pages.
- No separate URL for synonyms that should resolve to one intent.
- No fake precision in electrical safety outputs.
- No product recommendation before technical eligibility.
- No stale/unavailable product presented as purchase-ready.
- No cross-market merchant leakage.
- No localization by machine translation alone for money pages.
- Page count is not a KPI.

## Success metrics

Track by market and calculator type:

- impressions and organic clicks,
- indexed calculator pages and query coverage,
- SERP CTR,
- calculator start and completion rate,
- focused-calculator → full-builder continuation rate,
- product recommendation coverage,
- affiliate click-through rate,
- revenue / confirmed transaction where network data allows,
- cannibalization between guide and calculator URLs.

The north-star growth chain remains:

**high-intent organic query → useful calculation → confident decision → local compatible product → measurable commercial outcome**
