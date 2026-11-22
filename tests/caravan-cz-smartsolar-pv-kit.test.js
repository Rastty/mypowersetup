import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { addVerifiedSmartSolarChargingProfiles } from "../src/victron-smartsolar-charging-profiles.js";
import { refreshCatalogProduct, recommendProducts } from "../src/products.js";
import { assessRecommendationCoverage } from "../src/recommendation-coverage.js";
import { buildProductPackages } from "../src/packages.js";
import { buildCaravanBuyerChecklist } from "../src/caravan-buyer-checklist.js";
import { purchaseReadyCaravanPackages } from "../src/caravan-package-readiness.js";
import { reviewCaravanPvString } from "../src/caravan-pv-string-review.js";

const MANUAL = "https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_100-30__100-50/en/configuration-and-settings.html";
const MODELS = [
  { id: "svetkaravanu:24828", amps: 30, price: 3519, name: "MPPT solární regulátor Victron SmartSolar 100/30" },
  { id: "svetkaravanu:101985", amps: 50, price: 5069, name: "MPPT solární regulátor Victron Energy SmartSolar 100/50" },
];
const batteryIds = { 12: "svetkaravanu:107356_32721", 24: "svetkaravanu:107358" };
const catalog = async () => JSON.parse(await readFile(new URL("../data/products.json", import.meta.url), "utf8"));
const setup = (voltage, amps) => ({
  locale: "cs", systemVoltage: voltage, batteryAh: 100, batteryType: "lifepo4",
  solarWatts: amps === 30 ? 380 : 570, controllerAmps: amps, inverterWatts: 0,
  charging: { dcDc: { suggestedCurrentAmps: 0 }, shore: { suggestedCurrentAmps: 0 } },
});

test("the exact two stocked CZ SmartSolar dealer offers inherit real LiFePO4 and PV limits", async () => {
  const c = await catalog();
  assert.equal(c.sources.svetkaravanu?.status, "ok");
  for (const model of MODELS) {
    const raw = c.products.find(p => p.id === model.id);
    assert.ok(raw, model.id);
    assert.equal(raw.category, "controller");
    assert.equal(raw.merchant, "svetkaravanu");
    assert.equal(raw.name, model.name);
    assert.equal(raw.available, true);
    assert.equal(raw.priceCurrency, "CZK");
    assert.equal(raw.priceCzk, model.price);
    assert.match(raw.affiliateUrl, /a_aid=f34c86c8&a_bid=38137ac4&desturl=/);
    const checked = refreshCatalogProduct(raw);
    const watts = model.amps === 30 ? { 12: 440, 24: 880 } : { 12: 700, 24: 1400 };
    assert.equal(checked.specs.currentA, model.amps);
    assert.equal(checked.specs.maxPvVocV, 100);
    assert.equal(checked.specs.maxPvIscA, model.amps === 30 ? 35 : 60);
    assert.deepEqual(checked.specs.systemVoltagesV, [12, 24]);
    assert.deepEqual(checked.specs.maxPvWattsBySystemVoltage, watts);
    assert.deepEqual(checked.specs.chargingBatteryTypes, ["lifepo4", "lead"]);
    assert.equal(checked.specs.chargingProfileEvidenceUrl, MANUAL);
  }
});

test("CZ 12V and 24V setups show real buyable battery + BlueSolar panels + matched SmartSolar MPPT", async () => {
  const c = await catalog();
  for (const voltage of [12, 24]) {
    for (const model of MODELS) {
      const parts = [
        c.products.find(p => p.id === batteryIds[voltage]),
        c.products.find(p => p.id === "svetkaravanu:109069"),
        c.products.find(p => p.id === model.id),
      ];
      assert.ok(parts.every(Boolean), "all approved actual stock SKUs exist");
      assert.ok(parts.every(p => p.available === true && p.priceCurrency === "CZK"));
      const result = setup(voltage, model.amps);
      const rec = recommendProducts(parts, result, 3, c.sources);
      for (const category of ["battery", "solar_panel", "controller"]) {
        assert.equal(rec[category].length, 1, voltage + "V " + model.id + " " + category);
      }
      const coverage = assessRecommendationCoverage(rec, result, "cs");
      assert.equal(coverage.complete, true);
      const packs = buildProductPackages(rec, result);
      assert.equal(packs[0]?.id, "recommended");
      const buyer = buildCaravanBuyerChecklist({
        coverage, packages: packs, recommendations: rec, setup: result, locale: "cs"
      });
      assert.equal(buyer.complete, true, voltage + "V " + model.id + " " + JSON.stringify(buyer.rows));
      assert.equal(buyer.readyCount, 3);
      const panel = buyer.rows.find(r => r.category === "solar_panel");
      const controller = buyer.rows.find(r => r.category === "controller");
      assert.equal(panel.quantity, model.amps === 30 ? 2 : 3);
      assert.equal(controller.product.id, model.id);
      assert.equal(controller.pvWiringReview?.status, "within_reviewed_limits");
      assert.equal(reviewCaravanPvString(panel, controller.product, voltage)?.status, "within_reviewed_limits");
      assert.equal(purchaseReadyCaravanPackages(packs, buyer)[0]?.id, "recommended");
      assert.deepEqual(recommendProducts(parts, result, 3, {
        svetkaravanu: {status:"stale"}
      }).controller, []);
    }
  }
});

test("an unknown, unavailable, mispriced or tampered CZ MPPT cannot inherit Victron manufacturer proof", async () => {
  const c = await catalog();
  for (const model of MODELS) {
    const raw = c.products.find(p => p.id === model.id);
    const forged = [
      {...raw, id:raw.id+"-different"},
      {...raw, merchant:"unapproved"},
      {...raw, name:raw.name+" lookalike"},
      {...raw, productUrl:raw.productUrl+"other"},
      {...raw, available:false},
      {...raw, available:null},
      {...raw, staleSource:true},
      {...raw, priceCzk:0},
      {...raw, priceCzk:null},
      {...raw, priceCurrency:"EUR"},
      {...raw, affiliateUrl:raw.affiliateUrl.replace("f34c86c8","wrong")},
      {...raw, affiliateUrl:raw.affiliateUrl.replace("38137ac4","wrong")},
      {...raw, affiliateUrl:raw.affiliateUrl.replace("desturl=","wrongdest=")},
      {...raw, affiliateUrl:raw.affiliateUrl+"&redirect=https://attacker.invalid"},
      {...raw, category:"inverter"},
      {...raw, specs:{...raw.specs,currentA:model.amps+10}},
      {...raw, specs:{...raw.specs,maxPvVocV:150}},
      {...raw, specs:{...raw.specs,maxPvIscA:5}},
      {...raw, specs:{...raw.specs,systemVoltagesV:[48]}},
      {...raw, specs:{...raw.specs,maxPvWattsBySystemVoltage:{12:9999}}},
    ];
    for (const altered of forged) {
      assert.equal(
        addVerifiedSmartSolarChargingProfiles(altered, altered.specs).chargingProfileEvidenceUrl,
        undefined, model.id + " " + altered.name
      );
    }
  }
});

test("served CZ SK PL imports cache-bust the MPPT proof and PV wiring review chain", async () => {
  const read = async path => readFile(new URL("../"+path, import.meta.url), "utf8");
  const products = await read("src/products.js");
  const checklist = await read("src/caravan-buyer-checklist.js");
  const readiness = await read("src/caravan-package-readiness.js");
  assert.ok(products.includes("victron-smartsolar-charging-profiles.js?v=20261122-mppt-cz1"));
  for (const module of [checklist, readiness]) assert.ok(module.includes("caravan-pv-string-review.js?v=20261122-mppt-cz1"));
  for(const [locale,appName,htmlPath] of [
    ["cs","app.js","index.html"],
    ["sk","app-sk.js","sk/index.html"],
    ["pl","app-pl.js","pl/index.html"],
  ]) {
    const app=await read("src/"+appName);
    const html=await read(htmlPath);
    assert.ok(html.includes(appName+"?v=20261122-shore-mca1-result-scroll1-cz-mca1-superpack-cz1-orion-cz1-mppt-cz1"),locale);
    assert.ok(app.includes("products.js?v=20261122-mppt-cz1"),locale);
    assert.ok(app.includes("caravan-buyer-checklist.js?v=20261122-mppt-cz1"),locale);
    assert.ok(app.includes("caravan-package-readiness.js?v=20261122-mppt-cz1"),locale);
  }
});
