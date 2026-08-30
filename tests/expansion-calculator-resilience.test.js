import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");

test("expansion calculator core does not statically depend on recommendation modules", () => {
  assert.match(source, /^import \{ calculateSetup \} from "\.\/engine\.js";/m);
  assert.doesNotMatch(source, /^import .*recommendations\.js";/m);
});

test("market recommendations are lazy-loaded after calculation", () => {
  for (const market of ["pt", "si", "ro"]) {
    assert.match(source, new RegExp(`await import\\(\\"\\./${market}-recommendations\\.js\\"\\)`));
  }
  assert.match(source, /renderResult\(calculation\);[\s\S]*showStep\(3\);[\s\S]*renderPortugalProducts\(calculation\)/);
});
