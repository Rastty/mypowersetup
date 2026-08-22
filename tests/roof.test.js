import test from "node:test";
import assert from "node:assert/strict";
import { calculateRoofFit } from "../src/roof.js";

test("leaves roof fit unchecked when both optional dimensions are empty", () => {
  assert.deepEqual(calculateRoofFit({ solarWatts: 300, availableLengthMeters: "", availableWidthMeters: "" }), { checked: false });
});

test("chooses a compact reference layout that reaches the requested solar power", () => {
  const result = calculateRoofFit({ solarWatts: 300, availableLengthMeters: 3, availableWidthMeters: 1.4 });
  assert.equal(result.fits, true);
  assert.equal(result.referencePanelWatts, 190);
  assert.equal(result.requiredQuantity, 2);
  assert.equal(result.installedWatts, 380);
  assert.ok(result.capacity >= result.requiredQuantity);
});

test("uses a smaller reference panel when the free rectangle is short", () => {
  const result = calculateRoofFit({ solarWatts: 130, availableLengthMeters: 1.1, availableWidthMeters: 0.7 });
  assert.equal(result.fits, true);
  assert.equal(result.referencePanelWatts, 130);
  assert.equal(result.requiredQuantity, 1);
});

test("reports a geometric mismatch instead of claiming panels fit", () => {
  const result = calculateRoofFit({ solarWatts: 300, availableLengthMeters: 1, availableWidthMeters: 0.6 });
  assert.equal(result.fits, false);
  assert.equal(result.capacity, 0);
});

test("requires both roof dimensions and rejects implausible ranges", () => {
  assert.throws(
    () => calculateRoofFit({ solarWatts: 300, availableLengthMeters: 3, availableWidthMeters: "" }),
    /ROOF_DIMENSIONS_INCOMPLETE/
  );
  assert.throws(
    () => calculateRoofFit({ solarWatts: 300, availableLengthMeters: 20, availableWidthMeters: 2 }),
    /ROOF_DIMENSIONS_INVALID/
  );
});
