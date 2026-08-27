import test from "node:test";
import assert from "node:assert/strict";

import { APPLIANCES as CZECH_APPLIANCES } from "../src/catalog.js";
import { APPLIANCES as SLOVAK_APPLIANCES } from "../src/catalog-sk.js";
import { APPLIANCES as POLISH_APPLIANCES } from "../src/catalog-pl.js";
import { getUsageProfiles } from "../src/usage-profiles.js";
import { buildPlainLanguageVerdict } from "../src/verdict.js";

test("usage profiles remain localized views of one shared technical definition", () => {
  const catalogs = { cs: CZECH_APPLIANCES, sk: SLOVAK_APPLIANCES, pl: POLISH_APPLIANCES };
  const technicalSignatures = [];

  for (const [locale, appliances] of Object.entries(catalogs)) {
    const profiles = getUsageProfiles(locale);
    assert.equal(profiles.length, 4);
    assert.equal(new Set(profiles.map((profile) => profile.id)).size, 4);
    const applianceIds = new Set(appliances.map((appliance) => appliance.id));
    for (const profile of profiles) {
      assert.ok(profile.label.length > 3);
      assert.ok(profile.description.length > 10);
      assert.ok(["summer", "shoulder", "winter"].includes(profile.season));
      assert.ok(Number(profile.autonomyDays) >= 1);
      for (const id of Object.keys(profile.appliances)) assert.ok(applianceIds.has(id));
    }
    technicalSignatures.push(JSON.stringify(profiles.map(({ label, description, ...profile }) => profile)));
  }

  assert.equal(new Set(technicalSignatures).size, 1);
});

test("plain-language verdict presents the same result in every active language", () => {
  const result = {
    systemVoltage: 12,
    batteryAh: 200,
    batteryLabel: "LiFePO₄",
    solarWatts: 400,
    inverterWatts: 1500,
    controllerAmps: 50,
  };

  assert.equal(
    buildPlainLanguageVerdict(result, "cs"),
    "Pro tento způsob cestování doporučujeme 12V sestavu: baterii 200 Ah LiFePO₄, solár 400 Wp, čistý sinusový měnič 1500 W a MPPT 50 A."
  );
  assert.match(buildPlainLanguageVerdict(result, "sk"), /odporúčame 12V zostavu.*čistý sínusový menič 1500 W a MPPT 50 A/);
  assert.match(buildPlainLanguageVerdict(result, "pl"), /instalację 12 V.*przetwornicę z czystą sinusoidą 1500 W i MPPT 50 A/);
});

test("plain-language verdict clearly says when a separate inverter is unnecessary", () => {
  const result = {
    systemVoltage: 12,
    batteryAh: 100,
    batteryLabel: "LiFePO₄",
    solarWatts: 200,
    inverterWatts: 0,
    controllerAmps: 30,
  };
  assert.match(buildPlainLanguageVerdict(result, "cs"), /bez samostatného 230V měniče/);
  assert.match(buildPlainLanguageVerdict(result, "sk"), /bez samostatného 230V meniča/);
  assert.match(buildPlainLanguageVerdict(result, "pl"), /bez osobnej przetwornicy 230 V/);
});
