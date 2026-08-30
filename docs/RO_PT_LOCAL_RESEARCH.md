# Romania + Portugal localization research

Status: working research for private `/ro/` and `/pt/` markets. These notes are inputs for local copy/content/product decisions, not a public SEO claim set.

## Romania

### Natural terminology / query direction
- Core vehicle terms: `autorulotă`, `rulotă`, `campervan`.
- Battery: `baterie LiFePO4 autorulotă`, `baterie de servicii`, `baterie litiu rulotă`.
- Solar: `panou solar autorulotă`, `sistem fotovoltaic autorulotă`, `panouri solare rulotă`.
- Controller: `controler MPPT`, `regulator MPPT`.
- Inverter: `invertor sinus pur autorulotă`.
- Charging: `încărcător DC-DC`, alternator charging and 230 V / camping charging need a separate local wording review before publication.
- Architecture: `12V sau 24V autorulotă`.

### SERP/content signal
Current visible results are strongly commerce-led. Examples include ZipTip's LiFePO4 camper batteries and Pentrurulote's complete 24 V off-grid kits. They explain components and sell configured systems, but the dominant visible experience is product/category selection rather than a transparent consumption-to-system calculator.

Opportunity: lead with daily Wh, usable battery capacity, solar season, inverter simultaneous load and charging recovery. Product recommendations should be downstream of the calculation rather than the starting point.

### Local content priorities
1. Calculator / daily-consumption sizing for an autorulotă.
2. LiFePO4 vs AGM based on usable Wh, weight and cold-weather charging constraints.
3. Solar sizing by travel season rather than a single W recommendation.
4. 12 V vs 24 V decision guide.
5. DC-DC / alternator charging guide.
6. MPPT sizing and PV voltage/current compatibility.
7. Power station vs fixed electrical system.

### Affiliate/product rule
ALLPOWERS is approved for this market. Surface only exact products with a verified destination and market eligibility. Do not use eMAG as a launch dependency: current publisher registration is blocked by its RO/HU phone-number requirement for this account.

## Portugal

### Natural terminology / query direction
- Core vehicle terms: `autocaravana`, `campervan`, `caravana` where appropriate.
- Battery: `bateria de lítio autocaravana`, `bateria LiFePO4 autocaravana`.
- Solar: `painel solar autocaravana`, `kit solar autocaravana`.
- Controller: `controlador MPPT` / `regulador MPPT`.
- Inverter: `inversor de onda sinusoidal pura` / `inversor autocaravana`.
- Charging: `carregador DC-DC`, alternator charging, `carregador 230 V` / campsite charging.
- Architecture: `12 V ou 24 V autocaravana`.
- Portable power: `estação de energia portátil` should be validated against PT-PT search language before publication.

### SERP/content signal
Portugal has a visibly stronger specialist commerce layer than Romania. Camperformance sells camper-specific LiFePO4 + solar autonomy kits; NP@POWER has Portugal-specific LiFePO4 products; Leroy Merlin and other retailers also expose camper battery products. The opportunity is therefore not "more products" but better system sizing, decision logic and independent explanation.

Opportunity: differentiate on calculator-first guidance, energy vs power, realistic solar-season assumptions, alternator/DC-DC recovery, and fixed-system vs portable-station architecture.

### Local content priorities
1. Calculator / `de quanta bateria e solar preciso?` journey.
2. Solar sizing for Portugal travel seasons.
3. LiFePO4 vs AGM for autocaravanas.
4. 12 V vs 24 V.
5. DC-DC alternator charging.
6. MPPT sizing.
7. Fixed system vs portable power station.

### Affiliate/product rule
ALLPOWERS PT is approved and should be the primary exact-product source. ALLPOWERS International remains an approved fallback only when the PT destination is not eligible. Worten is pending and is not a launch blocker.

## Cross-market product/content principles
- Never recommend a generic landing page when an exact product is required.
- Never claim product shipping/availability without current verified evidence.
- Never force ALLPOWERS into fixed-system categories it does not actually cover.
- Keep calculation assumptions explicit and separate from product claims.
- Private/noindex remains mandatory until local language review, product integrity, analytics parity and 390x844 mobile smoke pass.

## Next implementation slice
- Build full `ui-copy-ro` and `ui-copy-pt` dictionaries from the existing localized calculator architecture.
- Localize appliance presets and result explanations, not only headings.
- Add RO/PT calculator wrappers while preserving the shared engine.
- Add ALLPOWERS routing/validation tests for RO and PT.
- Add first local pillar drafts only after the calculator language is stable.
