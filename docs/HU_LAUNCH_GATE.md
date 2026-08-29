# Hungarian launch gate

The Hungarian market remains private and noindex until every launch gate passes.

Current automated requirements:

- `hu-HU` catalog and EUR pricing,
- every catalog source included in the generated catalog must report `status: "ok"`,
- minimum verified product coverage: 2 batteries, 3 solar panels, 2 MPPT controllers, 3 inverters, 2 DC–DC chargers and 2 shore chargers,
- explicit technical language review,
- explicit mobile purchase-journey review.

As of 29 August 2026, the committed catalog has sufficient coverage in every required category except MPPT controllers: 1 verified controller is available, while the launch gate requires 2. The market must therefore remain private even after language and mobile review until a second technically verified MPPT product is available.

Run `npm run check:hu` for the current report. Use `npm run check:hu -- --require-ready` when a release process must fail on any remaining blocker.
