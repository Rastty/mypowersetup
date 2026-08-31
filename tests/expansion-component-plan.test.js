import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { expansionComponentPlan } from "../src/expansion-component-plan.js";

const result = Object.freeze({
  batteryAh: 180,
  batteryWh: 2304,
  batteryLabel: "LiFePO₄",
  solarWatts: 420,
  controllerAmps: 40,
  systemVoltage: 12,
  inverterWatts: 1200,
});

const markets = Object.freeze([
  Object.freeze({ market: "pt", prefix: "/pt/guias/" }),
  Object.freeze({ market: "ro", prefix: "/ro/ghiduri/" }),
  Object.freeze({ market: "si", prefix: "/si/vodici/" }),
]);

for (const { market, prefix } of markets) {
  test(`${market.toUpperCase()} component plan turns every calculated sizing target into a localized buying check`, async () => {
    const plan = expansionComponentPlan(market, result);
    assert.ok(plan.title);
    assert.ok(plan.intro);
    assert.ok(plan.notice);
    assert.deepEqual(plan.items.map((item) => item.topic), ["battery", "solar", "mppt", "inverter"]);
    assert.equal(plan.items.length, 4);
    assert.ok(plan.items.every((item) => item.required));
    assert.ok(plan.items.every((item) => item.href.startsWith(prefix)));

    assert.match(plan.items.find((item) => item.topic === "battery").spec, /180 Ah.*2304 Wh.*LiFePO₄.*12 V/);
    assert.match(plan.items.find((item) => item.topic === "solar").spec, /420 Wp/);
    assert.match(plan.items.find((item) => item.topic === "mppt").spec, /40 A.*12 V/);
    assert.match(plan.items.find((item) => item.topic === "inverter").spec, /1200 W/);

    for (const item of plan.items) {
      const html = await readFile(new URL(`..${item.href}index.html`, import.meta.url), "utf8");
      assert.doesNotMatch(html, /<meta name="robots" content="noindex/);
      assert.ok(html.includes(`<link rel="canonical" href="https://mypowersetup.com${item.href}">`));
    }
  });
}

test("DC-only results explicitly say that a separate inverter is not required", () => {
  for (const { market } of markets) {
    const plan = expansionComponentPlan(market, { ...result, inverterWatts: 0 });
    const inverter = plan.items.find((item) => item.topic === "inverter");
    assert.equal(inverter.required, false);
    assert.doesNotMatch(inverter.spec, /0 W/);
  }
});

test("calculator renders the shopping plan before affiliate products and tracks its guide clicks", async () => {
  const source = await readFile(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");
  assert.ok(source.indexOf("renderComponentPlan(value)") < source.indexOf("<div data-product-recommendations>"));
  assert.match(source, /data-component-plan/);
  assert.match(source, /data-component-item/);
  assert.match(source, /calculator_component_guide_click/);
});
