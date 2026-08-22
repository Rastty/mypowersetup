const REFERENCE_PANELS = Object.freeze([
  { powerW: 95, lengthM: 0.77, widthM: 0.668 },
  { powerW: 130, lengthM: 1.02, widthM: 0.668 },
  { powerW: 190, lengthM: 1.485, widthM: 0.668 },
]);

export function calculateRoofFit({ solarWatts, availableLengthMeters, availableWidthMeters }) {
  const length = optionalNumber(availableLengthMeters);
  const width = optionalNumber(availableWidthMeters);
  if (length === null && width === null) return { checked: false };
  if (length === null || width === null) throw new Error("ROOF_DIMENSIONS_INCOMPLETE");
  if (!Number.isFinite(length) || !Number.isFinite(width)
    || length < 0.5 || length > 12 || width < 0.5 || width > 4) {
    throw new Error("ROOF_DIMENSIONS_INVALID");
  }

  const requiredWatts = Number(solarWatts);
  if (!Number.isFinite(requiredWatts) || requiredWatts <= 0 || requiredWatts > 5000) {
    throw new Error("ROOF_SOLAR_POWER_INVALID");
  }

  const candidates = REFERENCE_PANELS.map((panel) => {
    const quantity = Math.ceil(requiredWatts / panel.powerW);
    const arrangement = bestArrangement(length, width, panel);
    return {
      panel,
      quantity,
      installedWatts: quantity * panel.powerW,
      panelAreaM2: round2(quantity * panel.lengthM * panel.widthM),
      fits: arrangement.capacity >= quantity,
      arrangement,
    };
  });
  const fitting = candidates.filter((candidate) => candidate.fits);
  const chosen = [...(fitting.length ? fitting : candidates)].sort(compareCandidates)[0];

  return {
    checked: true,
    availableLengthMeters: length,
    availableWidthMeters: width,
    availableAreaM2: round2(length * width),
    fits: chosen.fits,
    requiredQuantity: chosen.quantity,
    referencePanelWatts: chosen.panel.powerW,
    referencePanelLengthMeters: chosen.panel.lengthM,
    referencePanelWidthMeters: chosen.panel.widthM,
    installedWatts: chosen.installedWatts,
    panelAreaM2: chosen.panelAreaM2,
    capacity: chosen.arrangement.capacity,
    rows: chosen.arrangement.rows,
    columns: chosen.arrangement.columns,
    rotated: chosen.arrangement.rotated,
  };
}

function bestArrangement(length, width, panel) {
  const options = [
    arrangement(length, width, panel.lengthM, panel.widthM, false),
    arrangement(length, width, panel.widthM, panel.lengthM, true),
  ];
  return options.sort((a, b) => b.capacity - a.capacity || Number(a.rotated) - Number(b.rotated))[0];
}

function arrangement(length, width, panelLength, panelWidth, rotated) {
  const rows = Math.floor((length + Number.EPSILON) / panelLength);
  const columns = Math.floor((width + Number.EPSILON) / panelWidth);
  return { rows, columns, capacity: rows * columns, rotated };
}

function compareCandidates(a, b) {
  return a.installedWatts - b.installedWatts
    || a.panelAreaM2 - b.panelAreaM2
    || a.quantity - b.quantity;
}

function optionalNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
