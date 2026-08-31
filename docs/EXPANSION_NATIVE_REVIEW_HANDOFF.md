# Expansion language-review handoff

PT, SI and RO are public. Their publication evidence records a complete, transparent AI editorial language review; it does not claim human native-speaker approval.

Run `node scripts/check-expansion-native-review.mjs` to print the exact routes, review items and evidence for all three markets. Pass `pt`, `si` or `ro` as the first argument to inspect one market only.

The accepted reviewer must confirm the calculator, guides, trust pages and terminology, resolve blocking language issues, and provide reviewer identity/type plus review date. The current policy accepts either a human native speaker or an explicitly labeled `ai_editorial_review`; the corresponding `src/review-evidence-*.js` file must never imply a human review that did not happen.

Before republishing generated expansion pages, run `npm run publish:expansion:check -- --market pt` (replace `pt` with `si` or `ro`). Publication remains fail-closed if the review checklist or explicit `publicPublicationApproved` evidence is incomplete.
