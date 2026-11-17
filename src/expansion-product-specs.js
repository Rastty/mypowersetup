function positiveFinite(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

// Display only the electrical limits actually present in a verified offer.
// Recommendation DTOs can be partial; a missing value is never a product claim.
export function expansionPowerStationSpecs(item) {
  if (item?.category !== "power_station") return "";
  const specs = item.specs || {};
  const fields = [
    [positiveFinite(item.capacityWh ?? specs.capacityWh), value => `${value} Wh`],
    [positiveFinite(item.powerW ?? specs.powerW), value => `${value} W`],
    [positiveFinite(item.solarInputW ?? specs.solarInputW), value => `PV ${value} W`],
    [positiveFinite(item.dcOutputA ?? specs.dcOutputA), value => `12 V ${value} A`],
  ];
  return fields.filter(([value]) => value !== null).map(([value, format]) => format(value)).join(" · ");
}
