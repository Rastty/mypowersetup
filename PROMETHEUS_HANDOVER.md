# Prometheus handover

This repository participates in the repo-driven Prometheus portfolio loop.

When work produces a capability that is genuinely reusable across projects, record it here with:
- capability / problem solved
- why it is reusable rather than project-specific
- exact source files / tests / evidence
- expected benefit for other projects
- constraints, risks and assumptions
- recommended adoption path

Do not copy secrets, credentials, affiliate tracking URLs or production-only state. A handover is evidence for Prometheus Core review, not automatic authority to mutate another project.

## Open handovers

### Do not award a lowest-price badge with incomplete comparison evidence

- **Capability / problem solved:** PT/RO/SI buyer cards previously awarded the `budget` (lowest-price) badge when at least two offers had comparable prices, even if a third displayed option had an unknown price or an ambiguous currency. A buyer could be told one offer was cheapest without knowing the price of every alternative.
- **Why reusable:** any multi-offer affiliate comparison has this same incomplete-evidence trap; the price ranking claim should be narrower than the visible candidate set unless all shown offers have comparable amounts and currencies.
- **Source / evidence:** `src/expansion-recommendation-roles.js`, `tests/expansion-recommendation-roles.test.js`, `tests/expansion-line-price.test.js`. The badge now requires positive, calculable line totals and one nonempty matching currency for **every** displayed option; sizing and product eligibility stay unchanged. Local full suite: 1,438 tests passing on 2026-11-13. Deployment and real click/conversion impact remain unverified until CI and public readback complete.
- **Expected benefit:** fewer unsupported "cheapest" claims on mixed-price product lists, while keeping compatible offers and their affiliate routes available.
- **Constraints:** applies only within one displayed category and its calculated required quantities; does not imply a marketwide cheapest price, checkout totals, delivery costs, or current stock. Never treat a missing merchant price as zero.
- **Adoption path:** Core Owner can assess whether existing offer-comparison contracts already enforce complete candidate-price evidence; if not, port this narrow badge guard to another multi-offer site (for example Klix), with that site's real currencies and unit/basket semantics. Do not copy merchant URLs or treat this as measured revenue uplift.

### Localize merchant-specific purchase CTAs

- **Capability / problem solved:** converts generic affiliate buttons into localized, action-specific copy that names the destination merchant, while leaving technical ranking and affiliate URL generation untouched.
- **Why reusable:** any multilingual recommendation site benefits from telling users both what will happen (check the current price) and where they will go before an external click.
- **Source / evidence:** `src/purchase-cta.js`, its integrations in the four mature-market applications, and `tests/purchase-cta.test.js`. Both package links and individual product cards use the same copy contract.
- **Expected benefit:** clearer click intent, higher user trust, and a cleaner merchant-level CTA experiment without changing recommendation eligibility or order.
- **Constraints:** pass an already approved display label, escape the returned string at the rendering boundary, retain `rel="sponsored noopener"`, and never use CTA copy to imply a discount, stock state, or price freshness that has not been verified.
- **Adoption path:** extract the small locale map into the portfolio UI core, supply each project's approved merchant display label, and preserve the existing click analytics dimensions for source, role, merchant, product, and category.

### Rank affiliate supply by standalone purchase-ready gain

- **Capability / problem solved:** separates a category's theoretical maximum coverage gain from the scenarios that one newly sourced category can make purchase-ready on its own. This prevents affiliate teams from prioritizing a product that still leaves every affected journey blocked by another missing component.
- **Why reusable:** any calculator or recommendation project with weighted scenarios and multi-item bundles needs to distinguish isolated gaps from co-dependent gaps.
- **Source / evidence:** `src/commercial-opportunity-backlog.js`, `scripts/write-commercial-opportunity-report.mjs`, `data/commercial-opportunity-report.json`, and `tests/commercial-opportunity-backlog.test.js`. The report schema is version 4 and exposes both `maxPurchaseReadyGain` and `standalonePurchaseReadyGain` with their scenario IDs and weights.
- **Expected benefit:** directs merchant onboarding toward supply that can create a complete commercial journey immediately while retaining the longer-term maximum opportunity for coordinated sourcing.
- **Constraints:** the metric is only as representative as the scenario set and weights; it must not bypass technical fit, exact destination, market eligibility, stock, or affiliate approval gates.
- **Adoption path:** reuse the standalone-unlock calculation after the target project's own scenario assessment, validate it against at least one co-dependent gap, and keep both maximum and standalone metrics visible rather than replacing one with the other.
