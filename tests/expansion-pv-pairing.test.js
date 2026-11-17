import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { expansionPvPairingNotice } from "../src/expansion-pv-pairing.js";

const markets = [
  ["pt", "/pt/guias/como-escolher-controlador-mppt/"],
  ["ro", "/ro/ghiduri/regulator-mppt-autorulota/"],
  ["si", "/si/vodici/mppt-regulator-avtodom/"],
];

for (const [market, href] of markets) {
  test(`${market}: a matched Wp panel is not represented as a verified MPPT electrical pairing`, async () => {
    const notice = expansionPvPairingNotice(market, [
      { category: "battery" },
      { category: "solar_panel", specs: { powerW: 200 } },
      { category: "controller", specs: { currentA: 30 } },
    ]);
    assert.equal(notice.href, href);
    assert.match(notice.message, /Voc/);
    assert.match(notice.message, /Vmp/);
    assert.match(notice.message, /Isc/);
    assert.match(notice.message, /MPPT/);
    assert.match(notice.powerCheck, /Wp/);
    assert.equal(expansionPvPairingNotice(market, [{ category: "battery" }]), null);
    assert.equal(expansionPvPairingNotice(market, null), null);
    const guide = await readFile(new URL(`..${href}index.html`, import.meta.url), "utf8");
    assert.match(guide, /<link rel="canonical"/);
  });
}

test("only solar component routes get an electrical compatibility warning in all expansion markets", async () => {
  const [browser, styles] = await Promise.all([
    readFile(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);
  assert.match(browser, /renderExpansionProductCollection\(components, componentPriority\)\}\$\{renderPvPairingNotice\(components\)/);
  assert.match(browser, /data-pv-pairing-notice/);
  assert.match(browser, /data-pv-pairing-guide/);
  assert.match(browser, /pairing\.powerCheck/);
  assert.match(styles, /\.pv-pairing-notice/);
  assert.throws(() => expansionPvPairingNotice("cs", []), /MARKET_INVALID/);
});
