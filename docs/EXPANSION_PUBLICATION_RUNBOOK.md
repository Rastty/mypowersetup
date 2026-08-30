# PT / SI / RO publication runbook

This runbook is the final path from native review to public launch. It must remain fail-closed.

## Before publication

For each market (`pt`, `si`, `ro`):

1. Obtain genuine native-speaker review using `docs/NATIVE_REVIEWER_HANDOFF_TEMPLATE.md`.
2. Apply every blocking language/terminology correction.
3. Record reviewer name, review date and all completed review flags in `src/review-evidence-<market>.js`.
4. Set `nativeLanguageReview: true` and `publicPublicationApproved: true` only when all required review evidence is genuinely complete.
5. Run the native review status check.
6. Run the fail-closed publication check.

## Publication sequence

Publish one market at a time, in this order unless there is a concrete reason to change it:

1. Portugal (`pt`) — strongest commercial setup because dedicated ALLPOWERS PT exact-product support is already wired.
2. Slovenia (`si`) — technically ready with EU exact-product support, pending native approval.
3. Romania (`ro`) — technically ready, but affiliate coverage is intentionally conservative/fail-closed.

For a market that has passed native review:

```bash
npm run check:native-review -- <market>
npm run publish:expansion:check -- --market <market>
npm run publish:expansion -- --market <market>
npm run check:public:hreflang
npm run indexnow:check
npm run smoke:public:mobile
```

The publication command removes private noindex only for the approved market, adds canonicals/hreflang, updates sitemap routes and cross-links expansion home alternates.

## Post-publication verification

After each market goes public, verify before publishing the next one:

- home and guide hub return public indexable HTML;
- no `noindex,nofollow,noarchive` remains on published routes;
- canonical points to the exact public URL;
- reciprocal hreflang exists on CZ/SK/PL/HU and already-published expansion homes;
- all expected market routes are present in `sitemap.xml`;
- IndexNow dry-run includes the newly public market only after sitemap publication;
- 390x844 mobile journey passes;
- calculator completes successfully;
- affiliate links remain exact-product and fail closed where market eligibility is not verified;
- analytics parity remains intact.

If any verification fails, stop the next market launch and fix the defect first.

## Non-negotiable safety rule

Automated language QA is not native approval. Do not fabricate reviewer evidence or bypass the publication gate to accelerate launch.