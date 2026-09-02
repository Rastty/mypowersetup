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

### Rank affiliate supply by standalone purchase-ready gain

- **Capability / problem solved:** separates a category's theoretical maximum coverage gain from the scenarios that one newly sourced category can make purchase-ready on its own. This prevents affiliate teams from prioritizing a product that still leaves every affected journey blocked by another missing component.
- **Why reusable:** any calculator or recommendation project with weighted scenarios and multi-item bundles needs to distinguish isolated gaps from co-dependent gaps.
- **Source / evidence:** `src/commercial-opportunity-backlog.js`, `scripts/write-commercial-opportunity-report.mjs`, `data/commercial-opportunity-report.json`, and `tests/commercial-opportunity-backlog.test.js`. The report schema is version 4 and exposes both `maxPurchaseReadyGain` and `standalonePurchaseReadyGain` with their scenario IDs and weights.
- **Expected benefit:** directs merchant onboarding toward supply that can create a complete commercial journey immediately while retaining the longer-term maximum opportunity for coordinated sourcing.
- **Constraints:** the metric is only as representative as the scenario set and weights; it must not bypass technical fit, exact destination, market eligibility, stock, or affiliate approval gates.
- **Adoption path:** reuse the standalone-unlock calculation after the target project's own scenario assessment, validate it against at least one co-dependent gap, and keep both maximum and standalone metrics visible rather than replacing one with the other.
