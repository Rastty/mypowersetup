import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildFridgeGuideAutonomyUrl, applyCalculatorHandoffPrefill } from "../src/calculator-handoff.js";
import { calculateLanding } from "../src/calculator-landing.js";
import { classifyGuideCalculatorLink } from "../src/analytics-links.js";
import { getCalculatorCopy } from "../src/calculator-copy.js";
import { carryCommunityAttributionToUrl } from "../src/community-navigation.js";

const target = "/kalkulacky/vydrz-baterie/";
const fridgeGuide = "pruvodce/spotreba-kompresorove-lednice/index.html";
const otherGuide = "pruvodce/agm-vs-lifepo4/index.html";
const mpptGuide = "pruvodce/victron-mppt-100-20-vs-100-30-vs-100-50/index.html";
const cases = Object.freeze([
  { measuredWh: 268, formWh: 270 },
  { measuredWh: 557, formWh: 560 },
]);

function fakeForm() {
  const values = {
    dailyWh: { value: "600" },
    batteryCapacityAh: { value: "100" },
    systemVoltage: { value: "12" },
    batteryType: { value: "lifepo4" },
  };
  return { values, elements: { namedItem(key) { return values[key] ?? null; } } };
}
const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("fridge measured Wh always round UP to valid editable form values", async () => {
  const html = await read(fridgeGuide);
  for (const { measuredWh, formWh } of cases) {
    const href = buildFridgeGuideAutonomyUrl(formWh);
    assert.equal(href, target + "?mps_from=fridge-guide&dailyWh=" + formWh);
    assert.ok(formWh >= measuredWh && formWh - measuredWh < 10);
    assert.equal(formWh % 10, 0);
    assert.ok(html.includes(href.replace("&", "&amp;")), "guide must render exact validated URL");
    assert.ok(classifyGuideCalculatorLink(href), "recognized calculator destination");
    const form = fakeForm();
    const search = new URL(href, "https://mypowersetup.com").search;
    const prefilled = applyCalculatorHandoffPrefill({
      form, intent: "battery-autonomy", locale: "cs", pathname: target, search,
    });
    assert.equal(prefilled?.from, "fridge-guide");
    assert.deepEqual(prefilled?.values, { dailyWh: String(formWh) });
    assert.equal(form.values.dailyWh.value, String(formWh));
    assert.equal(form.values.batteryCapacityAh.value, "100");
    assert.equal(form.values.systemVoltage.value, "12");
    assert.equal(form.values.batteryType.value, "lifepo4");
    const { result } = calculateLanding("battery-autonomy", Object.fromEntries(
      Object.entries(form.values).map(([key, value]) => [key, value.value])
    ), "cs");
    assert.equal(result.dailyWh, formWh);
    assert.equal(result.batteryCapacityAh, 100);
    assert.equal(result.systemVoltage, 12);
    assert.ok(result.autonomyDays > 0);
  }
  for (const invalid of [268, 557, 600, 0, 100000, 270.5]) {
    assert.equal(buildFridgeGuideAutonomyUrl(invalid), null);
  }
});

test("fridge handoff fails closed for extras, duplicate, tampered and cross-market values", () => {
  const valid = "?mps_from=fridge-guide&dailyWh=560";
  for (const search of [
    valid + "&dailyWh=270", valid + "&batteryType=lead",
    valid + "&systemVoltage=24", valid + "&batteryCapacityAh=200",
    valid + "&utm_source=test", valid + "&mps_from=fridge-guide",
    valid.replace("560", "557"), valid.replace("560", "600"),
    valid.replace("560", "-560"), valid.replace("560", "560.5"),
    valid.replace("560", "999999"),
    valid.replace("fridge-guide", "battery-capacity"),
    "?dailyWh=560",
  ]) {
    const form = fakeForm();
    assert.equal(applyCalculatorHandoffPrefill({
      form, intent: "battery-autonomy", locale: "cs", pathname: target, search,
    }), null, search);
    assert.equal(form.values.dailyWh.value, "600");
    assert.equal(form.values.batteryCapacityAh.value, "100");
    assert.equal(form.values.systemVoltage.value, "12");
    assert.equal(form.values.batteryType.value, "lifepo4");
  }
  for (const [locale, pathname, intent] of [
    ["sk", "/sk/kalkulacky/vydrz-baterie/", "battery-autonomy"],
    ["pl", target, "battery-autonomy"],
    ["hu", target, "battery-autonomy"],
    ["cs", "/kalkulacky/kapacita-baterie/", "battery-capacity"],
    ["cs", "/pruvodce/spotreba-kompresorove-lednice/", "battery-autonomy"],
  ]) {
    const form = fakeForm();
    assert.equal(applyCalculatorHandoffPrefill({ form, intent, locale, pathname, search: valid }), null);
    assert.equal(form.values.dailyWh.value, "600");
  }
  const missing = { elements: { namedItem() { return null; } } };
  assert.equal(applyCalculatorHandoffPrefill({
    form: missing, intent: "battery-autonomy", locale: "cs", pathname: target, search: valid,
  }), null);
});

test("real community guide click carries its bounded attribution without discarding safe Wh", () => {
  const referrerSearch = "?utm_source=reddit&utm_medium=community&utm_campaign=cz_technical_help&utm_content=fridge-help-01";
  const guideUrl = "https://mypowersetup.com/pruvodce/spotreba-kompresorove-lednice/" + referrerSearch;
  for (const wh of [270, 560]) {
    const plain = buildFridgeGuideAutonomyUrl(wh);
    const carried = carryCommunityAttributionToUrl(plain, { search: referrerSearch, pageUrl: guideUrl });
    const url = new URL(carried, "https://mypowersetup.com");
    assert.equal(url.pathname, target);
    assert.equal(url.searchParams.get("mps_from"), "fridge-guide");
    assert.equal(url.searchParams.get("dailyWh"), String(wh));
    assert.equal(url.searchParams.get("utm_source"), "reddit");
    assert.equal(url.searchParams.get("utm_medium"), "community");
    assert.equal(url.searchParams.get("utm_campaign"), "cz_technical_help");
    assert.equal(url.searchParams.get("utm_content"), "fridge-help-01");
    const form = fakeForm();
    const filled = applyCalculatorHandoffPrefill({
      form, intent: "battery-autonomy", locale: "cs", pathname: target, search: url.search,
    });
    assert.equal(filled?.from, "fridge-guide");
    assert.equal(form.values.dailyWh.value, String(wh));
    assert.equal(form.values.batteryCapacityAh.value, "100");
    assert.equal(form.values.systemVoltage.value, "12");
    assert.equal(form.values.batteryType.value, "lifepo4");
  }
  const valid = "?mps_from=fridge-guide&dailyWh=270" + referrerSearch.replace("?", "&");
  for (const broken of [
    valid + "&utm_source=facebook", valid + "&systemVoltage=24",
    valid.replace("utm_medium=community", "utm_medium=cpc"),
    valid.replace("utm_campaign=cz_technical_help", "utm_campaign=../evil"),
    valid.replace("utm_content=fridge-help-01", "utm_content=space%20invalid"),
    valid.replace("&utm_content=fridge-help-01", ""),
  ]) {
    const form = fakeForm();
    const outcome = applyCalculatorHandoffPrefill({
      form, intent: "battery-autonomy", locale: "cs", pathname: target, search: broken,
    });
    assert.equal(outcome, null, broken);
    assert.equal(form.values.dailyWh.value, "600");
  }
});

test("guide prefill notice and versioned browser are truthful without auto-submit", async () => {
  const [browser, html] = await Promise.all([
    read("src/calculator-landing-browser.js"), read("kalkulacky/vydrz-baterie/index.html"),
  ]);
  const copy = getCalculatorCopy("cs");
  assert.match(browser, /prefill\.from === "fridge-guide" \? copy\.guidePrefillNote : copy\.prefillNote/);
  assert.ok(copy.guidePrefillNote.includes("lednice"));
  assert.ok(copy.guidePrefillNote.includes("kapacitu"));
  assert.match(html, /src="\/src\/calculator-landing-browser\.js\?v=20261109-fridge-community1"/);
  assert.match(browser, /calculator-handoff\.js\?v=20261109-fridge-community1/);
  assert.match(browser, /calculator-copy\.js\?v=20261110-mppt-specialist1/);
  assert.match(html, /<link rel="canonical" href="https:\/\/mypowersetup\.com\/kalkulacky\/vydrz-baterie\/">/);
  assert.match(browser, /form\.addEventListener\("submit"/);
});

test("contextual internal links lead readers to the correct calculator and remain indexable", async () => {
  const [fridge, agm, victron, sitemap] = await Promise.all([
    read(fridgeGuide), read(otherGuide), read(mpptGuide), read("sitemap.xml"),
  ]);
  assert.equal((fridge.match(/href="\/kalkulacky\/vydrz-baterie\/\?mps_from=fridge-guide/g) || []).length, 2);
  assert.equal((agm.match(/href="\/kalkulacky\/vydrz-baterie\/"/g) || []).length, 1);
  assert.match(fridge, /268\/557 Wh/);
  assert.match(fridge, /zaokrouhlili nahoru/);
  assert.match(agm, /stávajících 100 Ah vydrží/);
  const cta = victron.match(/<section class="cta">[\s\S]*?<\/section>/)?.[0];
  assert.ok(cta?.includes('href="/kalkulacky/mppt-regulator/"'));
  assert.ok(cta?.includes('href="/#kalkulator"'));
  assert.match(cta, /Voc při mrazu/);
  for (const [path, html] of [
    ["/pruvodce/spotreba-kompresorove-lednice/", fridge],
    ["/pruvodce/agm-vs-lifepo4/", agm],
    ["/pruvodce/victron-mppt-100-20-vs-100-30-vs-100-50/", victron],
  ]) {
    const modified = html.match(/"dateModified":"(\d{4}-\d{2}-\d{2})"/)?.[1];
    assert.ok(modified && modified >= "2026-11-09", path + ": dateModified must not regress");
    const loc = "<loc>https://mypowersetup.com" + path + "</loc><lastmod>" + modified + "</lastmod>";
    assert.equal(sitemap.split(loc).length - 1, 1, path + " sitemap must update exactly once");
  }
  assert.ok(fridge.includes('"https://mypowersetup.com/pruvodce/spotreba-kompresorove-lednice/"'));
  assert.ok(agm.includes('"https://mypowersetup.com/pruvodce/agm-vs-lifepo4/"'));
});
