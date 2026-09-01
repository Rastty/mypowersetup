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

const LOCALIZED_INTENT_GUIDANCE = Object.freeze({
  pl: Object.freeze({
    battery_sizing: "Zacznij od dobowego zużycia energii w Wh i oczekiwanej autonomii; na Ah przeliczaj dopiero po ustaleniu napięcia systemu, chemii akumulatora i użytecznej głębokości rozładowania.",
    solar_sizing: "Porównaj dobowe zapotrzebowanie w Wh z uzyskiem solarnym skorygowanym o porę roku; moc znamionowa paneli w Wp nie określa energii dostępnej każdego dnia.",
    lifepo4_migration: "Przed przejściem na LiFePO₄ sprawdź wszystkie źródła ładowania, blokadę ładowania w niskiej temperaturze, limity BMS, przekroje przewodów i zabezpieczenia.",
    dc_dc_charging: "Przed zmianą ładowarki sprawdź pracę inteligentnego alternatora, limit prądu DC/DC, przekroje przewodów i bezpieczniki oraz separację akumulatora rozruchowego od pokładowego.",
    charging_diagnostics: "Najpierw zdiagnozuj cały przepływ energii: pobór spoczynkowy, napięcie i prąd ładowania oraz stan akumulatora; dopiero potem wymieniaj sprawne urządzenia.",
    smart_alternator: "Zmierz napięcie alternatora pod obciążeniem i potwierdź sposób sterowania ładowarką zamiast zakładać, że układ zachowuje się jak klasyczny alternator.",
    mppt_sizing: "Sprawdź Voc i Isc paneli oraz limity wejściowe regulatora, w tym zapas napięcia na mróz; nie dobieraj MPPT wyłącznie z mocy paneli.",
    inverter_sizing: "Dobierz przetwornicę do jednoczesnego obciążenia AC i prądu rozruchowego, a następnie sprawdź wynikowy prąd DC, przekrój przewodów i bezpiecznik.",
    seasonal_consumption: "Rozdziel założenia letnie od wiosenno-jesiennych i zimowych, bo krótszy dzień oraz dłuższa praca oświetlenia i ogrzewania istotnie zmieniają autonomię.",
    system_design: "Zacznij od profilu odbiorników: dobowe Wh, autonomia, akumulator, źródła ładowania, solar, przetwornica, a na końcu przewody i zabezpieczenia.",
    cable_sizing: "Przekrój przewodu dobierz do prądu, długości trasy i dopuszczalnego spadku napięcia; zabezpieczenie ma chronić przewód i uwzględniać wydajność źródła.",
    fuse_sizing: "Umieść zabezpieczenie blisko źródła energii i dobierz je tak, aby chroniło przewód, a nie tylko podłączone urządzenie.",
    solar_expansion: "Przed dołożeniem paneli sprawdź ich zgodność elektryczną oraz limity napięcia i prądu MPPT, zanim połączysz stare moduły z nowymi.",
    series_parallel: "Przed wyborem połączenia szeregowego lub równoległego sprawdź Voc, prąd paneli, niedopasowanie modułów i limity regulatora.",
    offgrid_system_design: "Zacznij od zmierzonego dobowego zużycia w Wh i najgorszego istotnego sezonu, a następnie dobierz magazyn i produkcję do rzeczywistego profilu pracy.",
  }),
});

export function buildCommunityReplyBrief(opportunity, { maxPoints = 4 } = {}) {
  if (!opportunity?.id || !Array.isArray(opportunity.problemIntent)) {
    throw new TypeError("COMMUNITY_REPLY_BRIEF_OPPORTUNITY_REQUIRED");
  }

  const points = [];
  const guidanceByIntent = LOCALIZED_INTENT_GUIDANCE[opportunity.market] || INTENT_GUIDANCE;
  for (const intent of opportunity.problemIntent) {
    const guidance = guidanceByIntent[intent] || INTENT_GUIDANCE[intent];
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
