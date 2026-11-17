import { projectInverterCalculatorOffers, projectSolarCalculatorOffers } from "./calculator-offer-catalog.js";

// This is a CZ/Solar-import release guard, not a replacement for live stock
// evidence. A merchant feed can return HTTP 200 with a partial category export.
// Do not publish that as a fresh catalog when it erases an independently
// reviewed buyer path. The previous snapshot keeps its ORIGINAL timestamp and
// therefore still expires under the normal 72-hour buyer freshness policy.
export function assertCzBuyerFeedContinuity(previousCatalog, nextCatalog) {
  const previousTime = Date.parse(previousCatalog?.generatedAt);
  const nextTime = Date.parse(nextCatalog?.generatedAt);
  if (!Number.isFinite(previousTime) || !Number.isFinite(nextTime)) return;

  const categories = [
    ["INVERTER", projectInverterCalculatorOffers],
    ["SOLAR", projectSolarCalculatorOffers],
  ];
  for (const [category, project] of categories) {
    const before = project(previousCatalog, previousTime).products.length;
    if (before === 0) continue;
    const after = project(nextCatalog, nextTime).products.length;
    if (after === 0) {
      throw new Error(`CZ_SOLARIMPORT_${category}_BUYER_PATH_LOST: ${before} reviewed offers became 0; inspect the live feed before publishing`);
    }
  }
}
