# Expansion native-review handoff

PT, SI and RO are technically prepared but remain private until a real native-language reviewer signs off.

Run `node scripts/check-expansion-native-review.mjs` to print the exact routes, review items and remaining blockers for all three markets. Pass `pt`, `si` or `ro` as the first argument to inspect one market only.

A reviewer must confirm the calculator, guides, trust pages and terminology, resolve any blocking language issues, and provide reviewer name plus review date. Only after those fields are recorded in the corresponding `src/review-evidence-*.js` file may `nativeLanguageReview` and `publicPublicationApproved` be set to true.

After approval, run `npm run publish:expansion:check -- <market>` first. Publication must remain fail-closed if any native-review evidence is missing.
