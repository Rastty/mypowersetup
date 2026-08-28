import test from "node:test";
import assert from "node:assert/strict";
import { APPLIANCES as CZECH, SEASONS as CZECH_SEASONS, BATTERIES as CZECH_BATTERIES } from "../src/catalog.js";
import { APPLIANCES as SLOVAK, SEASONS as SLOVAK_SEASONS, BATTERIES as SLOVAK_BATTERIES } from "../src/catalog-sk.js";
import { APPLIANCES as POLISH, SEASONS as POLISH_SEASONS, BATTERIES as POLISH_BATTERIES } from "../src/catalog-pl.js";
import { APPLIANCES as HUNGARIAN, SEASONS as HUNGARIAN_SEASONS, BATTERIES as HUNGARIAN_BATTERIES } from "../src/catalog-hu.js";

const technicalFields = ["id", "icon", "watts", "hours", "quantity", "ac", "surge", "custom"];

test("localized appliance catalogs keep identical technical inputs", () => {
  for (const localized of [SLOVAK, POLISH, HUNGARIAN]) {
    assert.equal(localized.length, CZECH.length);
    assert.deepEqual(
      localized.map((item) => Object.fromEntries(technicalFields.map((field) => [field, item[field]]))),
      CZECH.map((item) => Object.fromEntries(technicalFields.map((field) => [field, item[field]])))
    );
  }
});

test("localized season and battery assumptions stay identical", () => {
  for (const seasons of [SLOVAK_SEASONS, POLISH_SEASONS, HUNGARIAN_SEASONS]) {
    assert.deepEqual(
      Object.fromEntries(Object.entries(seasons).map(([id, value]) => [id, value.peakSunHours])),
      Object.fromEntries(Object.entries(CZECH_SEASONS).map(([id, value]) => [id, value.peakSunHours]))
    );
  }
  for (const batteries of [SLOVAK_BATTERIES, POLISH_BATTERIES, HUNGARIAN_BATTERIES]) {
    assert.deepEqual(
      Object.fromEntries(Object.entries(batteries).map(([id, value]) => [id, value.usableDepth])),
      Object.fromEntries(Object.entries(CZECH_BATTERIES).map(([id, value]) => [id, value.usableDepth]))
    );
  }
});

test("Hungarian catalog exposes complete localized labels", () => {
  assert.match(HUNGARIAN.find((item) => item.id === "fridge").name, /hűtőszekrény/);
  assert.match(HUNGARIAN.find((item) => item.id === "custom").description, /adattábla/);
  assert.equal(HUNGARIAN_SEASONS.shoulder.label, "Tavasz / ősz");
  assert.equal(HUNGARIAN_BATTERIES.lead.label, "AGM / ólom-savas");
});

test("Polish catalog exposes complete localized labels", () => {
  assert.match(POLISH.find((item) => item.id === "fridge").name, /Lodówka/);
  assert.match(POLISH.find((item) => item.id === "custom").description, /tabliczki znamionowej/);
  assert.equal(POLISH_SEASONS.shoulder.label, "Wiosna / jesień");
  assert.equal(POLISH_BATTERIES.lead.label, "AGM / kwasowo-ołowiowy");
});
