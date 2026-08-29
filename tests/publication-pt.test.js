import test from "node:test";
import assert from "node:assert/strict";
import { assessPortugalPublication, requirePortugalPublication } from "../src/publication-evidence-pt.js";

test("Portugal publication remains blocked without mobile and native review evidence", () => {
  const report = assessPortugalPublication();
  assert.equal(report.publicationReady, false);
  assert.deepEqual(report.blockers, ["mobile390x844", "nativeLanguageReview"]);
});

test("mobile smoke alone cannot publish Portugal", () => {
  const report = assessPortugalPublication({ mobileSmokePassed: true });
  assert.equal(report.publicationReady, false);
  assert.deepEqual(report.blockers, ["nativeLanguageReview"]);
  assert.throws(() => requirePortugalPublication({ mobileSmokePassed: true }), /PT_PUBLICATION_BLOCKED:nativeLanguageReview/);
});

test("publication only opens when both final evidence flags are explicit", () => {
  const report = requirePortugalPublication({ mobileSmokePassed: true, nativeLanguageReview: true });
  assert.equal(report.publicationReady, true);
  assert.deepEqual(report.blockers, []);
});
