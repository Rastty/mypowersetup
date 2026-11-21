import { mergeExactPvManufacturerSpecs } from "./approved-pv-manufacturer-proof.js?v=20261121-bluesolar-pv1";

// Manufacturer document: EcoFlow 175 W rigid TOPCon EF-SG-M175-01.
// This is electrical model evidence ONLY, not availability, checkout,
// rooftop mounting, wiring, cable sizing, or final installation approval.
// The approved CZ/SK/PL dealer listings explicitly identify the same
// 175 W RIGID TOPCon panel; reject any identity/currency/deeplink drift.
const MANUFACTURER_PDF = "https://websiteoss.ecoflow.com/cms/upload/2024/5/30/EcoFlow%20175W%20Rigid%20Solar%20Panel-Safety%20Instructions%20V1.0_1717050133698.pdf";
const VERIFIED = Object.freeze({
  "svetkaravanu:105298": {
    merchant:"svetkaravanu", name:"Solární panel EcoFlow 175 W",
    url:"https://www.svetkaravanu.cz/solarni-panel-ecoflow-175-w_z105298/",
    currency:"CZK", bid:"38137ac4",
  },
  "padabo_sk:105298": {
    merchant:"padabo_sk", name:"Solárny panel EcoFlow 175 W",
    url:"https://www.padabo.sk/solarny-panel-ecoflow-175-w_z105298/",
    currency:"EUR", bid:"7aed5c13",
  },
  "padabo_pl:105298": {
    merchant:"padabo_pl", name:"Panel słoneczny EcoFlow 175 W",
    url:"https://www.padabo.pl/panel-sloneczny-ecoflow-175-w_z105298/",
    currency:"PLN", bid:"95d61abf",
  },
});
const SPECS = Object.freeze({
  powerW:175,
  pvModel:"EF-SG-M175-01",
  pvVocV:25.5,
  pvIscA:8.3,
  pvVmpV:21.9,
  pvVocTempCoefficientPctPerC:-0.25,
  pvIscTempCoefficientPctPerC:0.045,
  pvElectricalEvidenceUrl:MANUFACTURER_PDF,
});

export function addVerifiedEcoFlowRigid175PvSpecs(product, specs) {
  return mergeExactPvManufacturerSpecs(product,specs,VERIFIED[product?.id],SPECS);
}
