const INTENT_GUIDANCE = Object.freeze({
  battery_sizing: "Start with daily energy use in Wh and desired autonomy; convert to Ah only after system voltage, battery chemistry and usable depth are clear.",
  solar_sizing: "Compare daily Wh demand with season-adjusted solar yield; nominal panel Wp is not a daily energy guarantee.",
  lifepo4_migration: "Before changing to LiFePO4, verify every charging source, low-temperature charging protection, BMS limits, cabling and fusing.",
  dc_dc_charging: "Check smart-alternator behavior, DC/DC current limit, cable and fuse sizing, and starter/habitation battery isolation before recommending a charger change.",
  charging_diagnostics: "Diagnose the energy path first: resting loads, charging voltage/current and battery state before replacing working hardware.",
  smart_alternator: "Confirm alternator voltage behavior under load and the charger trigger/control method instead of assuming a conventional alternator profile.",
  mppt_sizing: "Check PV Voc, Isc/current and controller input limits, including cold-weather voltage margin, rather than sizing MPPT from panel watts alone.",
  inverter_sizing: "Size the inverter from simultaneous AC load and startup surge, then verify the resulting DC current, cable cross-section and fuse protection.",
  seasonal_consumption: "Keep summer and shoulder/winter assumptions separate because shorter days and longer lighting/heating runtime materially change autonomy.",
  system_design: "Work from the load profile outward: daily Wh, autonomy, battery, charging sources, solar, inverter, then cables and protection.",
  cable_sizing: "Cable size must follow current, run length and acceptable voltage drop; protection should be matched to the conductor and source capability.",
  fuse_sizing: "Place protection close to the energy source and size it to protect the conductor, not merely the connected appliance.",
  solar_expansion: "When adding panels, verify electrical compatibility and MPPT voltage/current limits before combining existing and new modules.",
  series_parallel: "Check panel Voc/current and mismatch effects before choosing series or parallel wiring; controller limits decide what is safe.",
  offgrid_system_design: "Start from measured daily Wh and worst useful season, then size storage and generation around the actual duty cycle.",
});

export function buildCommunityReplyBrief(opportunity, { maxPoints = 4 } = {}) {
  if (!opportunity?.id || !Array.isArray(opportunity.problemIntent)) {
    throw new TypeError("COMMUNITY_REPLY_BRIEF_OPPORTUNITY_REQUIRED");
  }

  const points = [];
  for (const intent of opportunity.problemIntent) {
    const guidance = INTENT_GUIDANCE[intent];
    if (guidance && !points.includes(guidance)) points.push(guidance);
    if (points.length >= maxPoints) break;
  }

  if (!points.length) {
    points.push("Answer the concrete technical question first, state the assumptions, and only then mention a relevant calculator or guide if it materially helps.");
  }

  return Object.freeze({
    opportunityId: opportunity.id,
    community: opportunity.community,
    sourceTitle: opportunity.sourceTitle,
    points: Object.freeze(points),
    supportingRoutes: Object.freeze([...(opportunity.supportingRoutes || [])]),
    linkRule: opportunity.postingRule || "answer_first_no_link_drop",
  });
}
