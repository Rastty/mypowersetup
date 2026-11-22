import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  minimumBatteryDischargeAmps, batteryBmsLoadWithinAdvertisedLimit
} from "../src/battery-discharge-safety.js";
import {
  documentedBatteryContinuousBmsAmps, batteryContinuousLimitNotBelowRequirement,
  batteryDischargeEvidenceTier, batteryDischargeBuyerCheck
} from "../src/caravan-bms-buyer-evidence.js";
import { recommendProducts } from "../src/products.js";
import { caravanComponentRequirement } from "../src/caravan-component-requirements.js";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";

const setup = {
  locale: "cs", systemVoltage: 12, batteryType: "lifepo4", batteryAh: 180,
  inverterWatts: 1300, solarWatts: 400, controllerAmps: 40,
  charging: { starterVoltage: 12, dcDc: {}, shore: {} },
};

function battery(id, extra = {}) {
  return {
    id: "solarimport:" + id, merchant: "solarimport", category: "battery",
    categoryPath: "Baterie", available: true, verifiedAt: "2026-11-21",
    name: "LiFePO4 12V 200Ah RV battery " + id,
    priceCzk: 5000, priceCurrency: "CZK",
    productUrl: "https://www.solar-import.cz/off-grid/" + id + "/",
    affiliateUrl: "https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=35cb7fb0&desturl=" + encodeURIComponent("https://www.solar-import.cz/off-grid/" + id + "/"),
    specs: { voltageV: 12, capacityAh: 200, batteryType: "lifepo4" },
    ...extra,
  };
}

test("known continuous BMS data, title-only BMS marketing and unknown evidence are distinct", () => {
  const documented = battery("documented", { specs: { voltageV:12,capacityAh:200,batteryType:"lifepo4",bmsContinuousCurrentA:200 } });
  const named = battery("named", { name: "LiFePO4 12V 200Ah battery built-in 200A BMS" });
  const unknown = battery("unknown", { specs: { voltageV:12,capacityAh:200,batteryType:"lifepo4",currentA:2000 } });
  assert.equal(minimumBatteryDischargeAmps(setup),128);
  assert.equal(documentedBatteryContinuousBmsAmps(documented),null);
  assert.equal(documentedBatteryContinuousBmsAmps({ ...documented, verifiedAt:null }),null);
  assert.equal(documentedBatteryContinuousBmsAmps({ ...documented, specs: { ...documented.specs,bmsContinuousCurrentA:"200" } }),null);
  assert.equal(batteryDischargeEvidenceTier(documented,setup),0);
  assert.equal(batteryDischargeEvidenceTier(named,setup),1);
  assert.equal(batteryDischargeEvidenceTier(unknown,setup),0);
  assert.match(batteryDischargeBuyerCheck(documented,setup,"cs"),/není doložen/);
  assert.match(batteryDischargeBuyerCheck(named,setup,"sk"),/trvalé vybíjanie nie je doložené/);
  assert.match(batteryDischargeBuyerCheck(unknown,setup,"pl"),/Brak potwierdzonego/);
  assert.equal(batteryDischargeBuyerCheck(documented,{...setup,inverterWatts:0},"cs"),null);
});

test("unreviewed numeric feed ratings cannot outrank title-only BMS evidence", () => {
  const documented = battery("documented", { specs: { voltageV:12,capacityAh:200,batteryType:"lifepo4",bmsContinuousCurrentA:200 } });
  const named = battery("named", { name: "LiFePO4 12V 200Ah battery built-in 200A BMS" });
  const unknown = battery("unknown");
  const source={solarimport:{status:"ok"}};
  const selected=recommendProducts([unknown,named,documented],setup,3,source).battery;
  assert.equal(selected[0].product.id,named.id);
  assert.ok(selected[0].checks.some(check=>/BMS/.test(check)));
  assert.ok(selected[1].checks.some(check=>/není doložen/.test(check)));
  assert.ok(selected[2].checks.some(check=>/není doložen/.test(check)));
  assert.deepEqual(recommendProducts([unknown],setup,3,{solarimport:{status:"stale"}}).battery,[]);
});

test("under-rated advertised and explicit continuous discharge are rejected independently, not guessed from Ah or generic amps",()=>{
  const tooSmallName=battery("weak", {name:"LiFePO4 12V 200Ah battery with 100A BMS"});
  const tooSmallSpec=battery("weak-spec", {specs:{voltageV:12,capacityAh:200,batteryType:"lifepo4",bmsContinuousCurrentA:100}});
  const inflatedGeneric=battery("generic",{specs:{voltageV:12,capacityAh:200,batteryType:"lifepo4",currentA:1000}});
  assert.equal(batteryBmsLoadWithinAdvertisedLimit(tooSmallName,setup),false);
  assert.equal(batteryBmsLoadWithinAdvertisedLimit(tooSmallSpec,setup),true);
  assert.equal(batteryContinuousLimitNotBelowRequirement(tooSmallSpec,setup),false);
  assert.deepEqual(recommendProducts([tooSmallName,tooSmallSpec],setup,10,{solarimport:{status:"ok"}}).battery,[]);
  assert.equal(batteryDischargeEvidenceTier(inflatedGeneric,setup),0);
  assert.equal(documentedBatteryContinuousBmsAmps({...tooSmallSpec,verifiedAt:"2026-11-21"}),null);
  assert.equal(documentedBatteryContinuousBmsAmps({...tooSmallSpec,id:"__proto__"}),null);
  assert.equal(batteryBmsLoadWithinAdvertisedLimit(inflatedGeneric,setup),true);
  assert.equal(batteryBmsLoadWithinAdvertisedLimit(tooSmallName,{...setup,inverterWatts:0}),true);
});

test("CZ SK PL buying plans expose real continuous BMS current requirement before purchase, without assuming completeness", async()=>{
  const expected=[
    ["cs",/trvalý vybíjecí proud BMS nejméně 128 A/,/Požadavek výpočtu/],
    ["sk",/trvalý vybíjací prúd BMS aspoň 128 A/,/Požiadavka výpočtu/],
    ["pl",/ciągły prąd rozładowania BMS co najmniej 128 A/,/Wymagania obliczeń/],
  ];
  const selected=battery("documented", { specs:{voltageV:12,capacityAh:200,batteryType:"lifepo4",bmsContinuousCurrentA:200} });
  for(const [locale,bmsText,prefix] of expected) {
    const requirement=caravanComponentRequirement({...setup,locale},"battery",locale);
    assert.match(requirement,bmsText);
    assert.match(requirement,prefix);
    assert.match(requirement,/200|180/);
    assert.doesNotMatch(caravanComponentRequirement({...setup,inverterWatts:0},"battery",locale),/BMS/);
    const recommendations={battery:recommendProducts([selected],{...setup,locale},3,{solarimport:{status:"ok"}}).battery};
    const plan=buildCaravanBuyerChecklist({coverage:{required:["battery"]},recommendations,setup:{...setup,locale},locale});
    assert.equal(plan.readyCount,1,locale);
    assert.match(plan.rows[0].requirement,bmsText,locale);
    assert.equal(plan.rows[0].product.id,selected.id,locale);
  }
  for(const [html,entry] of [["index.html","app.js"],["sk/index.html","app-sk.js"],["pl/index.html","app-pl.js"]]) {
    const page=await readFile(new URL("../"+html,import.meta.url),"utf8");
    const app=await readFile(new URL("../src/"+entry,import.meta.url),"utf8");
    assert.ok(page.includes(html === "index.html" ? "20261122-shore-mca1" : "20261122-shore-mca1"),html);
    assert.match(app,/caravan-buyer-checklist\.js\?v=20261122-bms-alternatives1/,entry);
    assert.ok(app.includes("products.js?v=" + (html === "index.html" ? "20261122-orion-cz1" : "20261122-orion-cz1")),entry);
  }
});
