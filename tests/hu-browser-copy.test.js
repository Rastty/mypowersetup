import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { HU_UI_COPY } from "../src/ui-copy-hu.js";

test("Hungarian browser renders localized result and product labels from shared copy", async () => {
  const browser = await readFile("src/app-hu-browser.js", "utf8");
  assert.match(browser, /import \{ HU_UI_COPY \} from "\.\/ui-copy-hu\.js"/);
  assert.match(browser, /HU_UI_COPY\.result\.controller/);
  assert.match(browser, /HU_UI_COPY\.products\.categories/);
  assert.doesNotMatch(browser, /MPPT szabályozó/);
  assert.doesNotMatch(browser, /Hordozható erőművek/);
  assert.equal(HU_UI_COPY.products.categories.powerStation, "Hordozható áramforrások");
});

test("Hungarian dynamic appliance controls request mobile-friendly numeric keyboards", async () => {
  const browser = await readFile("src/app-hu-browser.js", "utf8");
  assert.match(browser, /data-watts[^>]+inputmode="numeric"/);
  assert.match(browser, /data-hours[^>]+inputmode="decimal"/);
  assert.match(browser, /data-quantity[^>]+inputmode="numeric"/);
});
