import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProduct, recommendProducts } from "../src/products.js";

const product = normalizeProduct({
  id: "r1500-lite-localization",
  name: "ALLPOWERS R1500 LITE Stacja Zasilania 1600W 1056Wh Akumulator LiFePO4",
  category: "Stacje zasilania",
  description: "Wejście solarne 650 W. Wyjście 12 V 10 A. Czysta sinusoida.",
  price: "2119 PLN",
  url: "https://allpowers.com.pl/products/allpowers-r1500-lite-stacja-zasilania-1600w-1056wh-akumulator-lifep04",
  available: true,
}, "allpowers_pl");

const setup = {
  dailyWh: 600,
  autonomyDays: 1,
  solarWatts: 300,
  inverterWatts: 1000,
  applianceRows: [{ watts: 60, quantity: 1, ac: false }],
  systemVoltage: 12,
  batteryAh: 100,
  batteryType: "lifepo4",
  controllerAmps: 30,
  charging: { starterVoltage: 12, dcDc: {}, shore: {} },
};

for (const [locale, reasonPattern, verifyPattern, at12VPattern] of [
  ["cs", /Kapacita, AC výstup, FV vstup/, /rozběhový výkon spotřebičů/, /při 12 V$/],
  ["sk", /Kapacita, AC výstup, FV vstup/, /rozbehový výkon spotrebičov/, /pri 12 V$/],
  ["pl", /Pojemność, wyjście AC, wejście PV/, /moc rozruchową urządzeń/, /przy 12 V$/],
  ["hu", /A kapacitás, az AC kimenet, a PV bemenet/, /indítási teljesítményét/, /12 V-on$/],
]) {
  test(`power station recommendation copy is complete for ${locale}`, () => {
    const matches = recommendProducts([product], { ...setup, locale }).power_station;
    assert.equal(matches.length, 1);
    assert.match(matches[0].reason, reasonPattern);
    assert.match(matches[0].verify, verifyPattern);
    assert.match(matches[0].checks.at(-1), at12VPattern);
  });
}
