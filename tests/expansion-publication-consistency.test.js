import test from "node:test";
import assert from "node:assert/strict";
import { assessPortugalPublication } from "../src/publication-evidence-pt.js";
import { assessSloveniaPublication } from "../src/publication-evidence-si.js";
import { assessRomaniaPublication } from "../src/publication-evidence-ro.js";

const CASES = [
  ["Portugal", () => assessPortugalPublication({ mobileSmokePassed: true })],
  ["Slovenia", () => assessSloveniaPublication()],
  ["Romania", () => assessRomaniaPublication()],
];

for (const [name, assess] of CASES) {
  test(`${name} has exactly native-language review left before publication`, () => {
    const report = assess();
    assert.equal(report.publicationReady, false);
    assert.deepEqual(report.blockers, ["nativeLanguageReview"]);
    const completed = Object.values(report.checks).filter(Boolean).length;
    assert.equal(completed, 7);
    assert.equal(Object.keys(report.checks).length, 8);
  });
}

test("native review cannot be implied by technical readiness", () => {
  assert.equal(assessPortugalPublication({ mobileSmokePassed: true }).publicationReady, false);
  assert.equal(assessSloveniaPublication().publicationReady, false);
  assert.equal(assessRomaniaPublication().publicationReady, false);
});