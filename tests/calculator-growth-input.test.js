import test from "node:test";
import assert from "node:assert/strict";
import { buildCalculatorFunnelSummary } from "../src/calculator-funnel-report.js";
import { detectDelimiter, normalizeGa4CalculatorEventRows, normalizeGscExportRows, normalizeIndexingExportRows, parseDelimitedText, parseLocalizedNumber } from "../src/calculator-growth-input.js";

test("normalizes Czech Search Console page export without manual cleanup", () => {
  const csv = [
    "Nejvýznamnější stránky,Prokliky,Zobrazení,CTR,Pozice",
    '"https://mypowersetup.com/kalkulacky/dc-dc-nabijecka/",3,120,2.5%,7.2',
  ].join("\n");
  const rows = normalizeGscExportRows(parseDelimitedText(csv));

  assert.deepEqual(rows, [{
    page: "https://mypowersetup.com/kalkulacky/dc-dc-nabijecka/",
    clicks: 3,
    impressions: 120,
    ctr: 0.025,
    position: 7.2,
  }]);
});

test("normalizes English GSC page/query TSV export", () => {
  const tsv = [
    "Top pages\tTop queries\tClicks\tImpressions\tCTR\tPosition",
    "https://mypowersetup.com/pl/kalkulatory/pojemnosc-akumulatora/\takumulator kamper kalkulator\t4\t200\t2%\t8.5",
  ].join("\n");

  assert.equal(detectDelimiter(tsv), "\t");
  assert.deepEqual(normalizeGscExportRows(parseDelimitedText(tsv)), [{
    page: "https://mypowersetup.com/pl/kalkulatory/pojemnosc-akumulatora/",
    query: "akumulator kamper kalkulator",
    clicks: 4,
    impressions: 200,
    ctr: 0.02,
    position: 8.5,
  }]);
});

test("handles semicolon exports, quoted delimiters and decimal comma", () => {
  const csv = [
    "Nejvýznamnější stránky;Prokliky;Zobrazení;CTR;Pozice",
    '"https://mypowersetup.com/kalkulacky/solarni-panely/?ref=a;b";0;"1 234";"0,5%";"9,7"',
  ].join("\n");
  const [row] = normalizeGscExportRows(parseDelimitedText(csv));

  assert.equal(row.impressions, 1234);
  assert.equal(row.ctr, 0.005);
  assert.equal(row.position, 9.7);
  assert.match(row.page, /ref=a;b/);
  assert.equal(parseLocalizedNumber("1.234,56"), 1234.56);
});

test("uses aggregate GA4 event counts as funnel weights", () => {
  const csv = [
    "Event name,Event count,Calculator landing path,Calculator landing locale,Calculator landing intent",
    "calculator_landing_view,40,/kalkulacky/kapacita-baterie/,cs,battery-capacity",
    "calculator_started,25,/kalkulacky/kapacita-baterie/,cs,battery-capacity",
    "calculation_completed,20,/kalkulacky/kapacita-baterie/,cs,battery-capacity",
    "calculator_landing_continue,8,/kalkulacky/kapacita-baterie/,cs,battery-capacity",
    "product_choice_impression,12,/kalkulacky/kapacita-baterie/,cs,battery-capacity",
    "affiliate_click,3,/kalkulacky/kapacita-baterie/,cs,battery-capacity",
  ].join("\n");
  const events = normalizeGa4CalculatorEventRows(parseDelimitedText(csv));
  const [row] = buildCalculatorFunnelSummary(events);

  assert.equal(row.views, 40);
  assert.equal(row.starts, 25);
  assert.equal(row.completes, 20);
  assert.equal(row.continues, 8);
  assert.equal(row.impressions, 12);
  assert.equal(row.clicks, 3);
  assert.equal(row.startRate, 0.625);
  assert.equal(row.completionRate, 0.8);
  assert.equal(row.continuationRate, 0.4);
  assert.equal(row.productClickRate, 0.25);
});

test("missing and malformed aggregate GA4 counts fail closed instead of fabricating affiliate clicks", () => {
  const base = {
    "Event name": "affiliate_click",
    "Calculator landing path": "/kalkulacky/kapacita-baterie/",
    "Calculator landing locale": "cs",
    "Calculator landing intent": "battery-capacity",
  };
  for (const value of [undefined, "", "n/a", "not available", "-1", "1.5", "Infinity", "1,,2"]) {
    assert.throws(() => normalizeGa4CalculatorEventRows([{ ...base, "Event count": value }]), /GA4_EVENT_COUNT_INVALID/);
  }
  assert.throws(() => normalizeGa4CalculatorEventRows([{ ...base, "Event count": "2", "Total users": "unknown" }]), /GA4_TOTAL_USERS_INVALID/);
  for (const value of ["0", "1,234", "1.234", "1 234", 1234]) {
    const [event] = normalizeGa4CalculatorEventRows([{ ...base, "Event count": value }]);
    assert.equal(event.event_count, value === "0" ? 0 : value === "1,234" || value === "1.234" || value === "1 234" ? 1234 : Number(value));
  }
  // Raw per-event GA4 payloads are still individual events, not aggregate exports.
  assert.deepEqual(normalizeGa4CalculatorEventRows([{ event_name: "affiliate_click", parameters: { source: "calculator" } }]),
    [{ event_name: "affiliate_click", parameters: { source: "calculator" } }]);
});

test("preserves explicit zero GA4 counts", () => {
  const [event] = normalizeGa4CalculatorEventRows([{
    "Event name": "affiliate_click",
    "Event count": "0",
    "Calculator landing path": "/kalkulacky/kapacita-baterie/",
    "Calculator landing locale": "cs",
    "Calculator landing intent": "battery-capacity",
  }]);
  assert.equal(event.event_count, 0);
});

test("normalizes Czech URL inspection status", () => {
  const csv = [
    "URL,Stav",
    "https://mypowersetup.com/kalkulacky/solarni-panely/,URL není na Googlu",
    "https://mypowersetup.com/kalkulacky/kapacita-baterie/,URL je na Googlu",
  ].join("\n");
  const rows = normalizeIndexingExportRows(parseDelimitedText(csv));

  assert.equal(rows[0].indexed, false);
  assert.equal(rows[1].indexed, true);
});


test("GA4 event counts, not unique users, drive affiliate click and impression denominators", () => {
  const base = {
    "Calculator landing path": "/kalkulacky/kapacita-baterie/",
    "Calculator landing locale": "cs",
    "Calculator landing intent": "battery-capacity",
  };
  const events = normalizeGa4CalculatorEventRows([
    { ...base, "Event name": "product_choice_impression", "Event count": "12", "Total users": "4" },
    { ...base, "Event name": "affiliate_click", "Event count": "5", "Total users": "2" },
  ]);
  assert.equal(events[0].funnel_count, 4);
  assert.equal(events[1].funnel_count, 2);
  assert.equal(events[1].total_users, 2, "unique-user evidence remains available separately");
  const [summary] = buildCalculatorFunnelSummary(events);
  assert.equal(summary.impressions, 4);
  assert.equal(summary.clicks, 2);
  assert.equal(summary.impressionEvents, 12);
  assert.equal(summary.clickEvents, 5);
  assert.equal(summary.productClickRate, 0.5, "existing unique-user rate is unchanged");
});
