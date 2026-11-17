import { expansionComponentPlan } from "./expansion-component-plan.js";

const COPY = Object.freeze({
  pt: Object.freeze({
    explanation: (watts, volts) => `Ainda não temos uma oferta verificada para o inversor exigido: pelo menos ${watts} W de potência contínua, entrada ${volts} V DC e onda sinusoidal pura. Não substituas esta exigência por um produto apenas porque está à venda; confirma também o pico de arranque.`,
    action: "Ver como escolher um inversor compatível",
  }),
  ro: Object.freeze({
    explanation: (watts, volts) => `Nu avem încă o ofertă verificată pentru invertorul necesar: minimum ${watts} W putere continuă, intrare ${volts} V DC și undă sinusoidală pură. Nu alege un produs doar pentru că este disponibil; verifică și vârful de pornire.`,
    action: "Vezi cum alegi un invertor compatibil",
  }),
  si: Object.freeze({
    explanation: (watts, volts) => `Za zahtevani inverter še nimamo preverjene ponudbe: najmanj ${watts} W trajne moči, vhod ${volts} V DC in čisti sinus. Ne izberi izdelka samo zato, ker je naprodaj; preveri tudi zagonsko konico.`,
    action: "Kako izbrati ustrezen inverter",
  }),
});

// A genuine supply gap is an educational route, not an invitation to invent an
// affiliate match. A source outage is never evidence that a product is missing.
export function expansionInverterGapAction(market, missing, calculation, sourceGap = false) {
  if (sourceGap || !Array.isArray(missing) || !missing.includes("inverter")
    || !(Number(calculation?.inverterWatts) > 0)) return null;

  const copy = COPY[market];
  if (!copy) throw new Error(`EXPANSION_INVERTER_GAP_MARKET_INVALID:${market || "missing"}`);
  const guide = expansionComponentPlan(market, calculation).items.find((item) => item.topic === "inverter");
  return Object.freeze({
    text: copy.explanation(calculation.inverterWatts, calculation.systemVoltage),
    href: guide.href,
    label: copy.action,
  });
}
