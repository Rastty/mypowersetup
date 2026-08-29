import test from "node:test";
import assert from "node:assert/strict";
import { prepareApplianceInputsForMobile } from "../src/usage-profiles.js";

function fakeInput() {
  return {
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
  };
}

test("appliance numeric fields request mobile-friendly keyboards", () => {
  const hours = fakeInput();
  const watts = fakeInput();
  const quantity = fakeInput();
  const grid = {
    querySelectorAll(selector) {
      if (selector === "[data-hours], [data-watts]") return [hours, watts];
      if (selector === "[data-quantity]") return [quantity];
      return [];
    },
  };

  prepareApplianceInputsForMobile(grid);

  assert.equal(hours.attributes.inputmode, "decimal");
  assert.equal(watts.attributes.inputmode, "decimal");
  assert.equal(quantity.attributes.inputmode, "numeric");
});

test("mobile input enhancement is safe when the appliance grid is missing", () => {
  assert.doesNotThrow(() => prepareApplianceInputsForMobile(null));
});
