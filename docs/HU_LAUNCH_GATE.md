# Hungarian launch gate

The Hungarian market remains private and noindex until every launch gate passes.

## Automated requirements

- `hu-HU` catalog and EUR pricing,
- every catalog source included in the generated catalog must report `status: "ok"`,
- minimum verified product coverage: 2 batteries, 3 solar panels, 2 MPPT controllers, 3 inverters, 2 DC–DC chargers and 2 shore chargers,
- explicit technical language review,
- explicit mobile purchase-journey review.

As of 29 August 2026, the committed catalog has sufficient coverage in every required category except MPPT controllers: 1 verified controller is available, while the launch gate requires 2. The market must therefore remain private even after language and mobile review until a second technically verified MPPT product is available.

The preferred next merchant path is tracked in issue #114: onboard Árukereső.hu through Dognet and accept only technically verifiable MPPT product pages. Do not lower the gate by counting PWM or generic solar controllers as MPPT.

## Readiness commands

Run the current report without changing files:

```bash
npm run check:hu
```

Require every gate to pass:

```bash
HU_LANGUAGE_REVIEWED=true HU_MOBILE_JOURNEY_REVIEWED=true npm run check:hu -- --require-ready
```

## Release workflow

The release command is fail-closed. It calls the same launch gate before preparing any write. If a source is stale, product coverage is incomplete, or either review flag is missing, publication stops before creating public HU pages.

Dry-run the complete publication plan:

```bash
HU_LANGUAGE_REVIEWED=true HU_MOBILE_JOURNEY_REVIEWED=true npm run publish:hu:check
```

Prepare the public files only after the dry run succeeds:

```bash
HU_LANGUAGE_REVIEWED=true HU_MOBILE_JOURNEY_REVIEWED=true npm run publish:hu
```

A successful publication prepares 15 Hungarian pages (calculator, four trust pages, guide hub and nine guides), removes the private `noindex` directive from those generated pages, adds canonical and public metadata, adds `hu-HU` hreflang to the CZ/SK/PL home pages, and extends `sitemap.xml` idempotently.

The generated changes must still go through the normal pull-request CI before merge. Do not bypass that final review merely because the launch command succeeds.
