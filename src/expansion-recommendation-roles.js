const RESERVE_VALUE = Object.freeze({
  battery: (item) => Number(item.specs?.capacityAh),
  solar_panel: (item) => Number(item.quantity) * Number(item.powerW),
  controller: (item) => Number(item.specs?.currentA),
  inverter: (item) => Number(item.specs?.powerW),
  dc_charger: (item) => Number(item.specs?.currentA),
  shore_charger: (item) => Number(item.specs?.currentA),
  power_station: (item) => Number(item.capacityWh),
});

export function decorateExpansionRecommendations(recommendations) {
  return Object.values(recommendations || {}).flatMap((items) => decorateCategory(items || []));
}

function decorateCategory(items) {
  if (!items.length) return [];
  const badges = items.map(() => []);
  badges[0].push("recommended");

  const priced = items
    .map((item, index) => ({ index, price: Number(item.price) }))
    .filter(({ price }) => Number.isFinite(price));
  if (priced.length > 1) {
    const budget = priced.reduce((best, candidate) => candidate.price < best.price ? candidate : best);
    badges[budget.index].push("budget");
  }

  const reserveValue = RESERVE_VALUE[items[0].category];
  if (reserveValue && items.length > 1) {
    const baseline = reserveValue(items[0]);
    const reserve = items
      .map((item, index) => ({ index, value: reserveValue(item) }))
      .filter(({ value }) => Number.isFinite(value))
      .reduce((best, candidate) => !best || candidate.value > best.value ? candidate : best, null);
    if (reserve && Number.isFinite(baseline) && reserve.index !== 0 && reserve.value > baseline) badges[reserve.index].push("reserve");
  }

  return items.map((item, index) => ({
    ...item,
    recommendationBadges: Object.freeze(badges[index].length ? badges[index] : ["alternative"]),
  }));
}
