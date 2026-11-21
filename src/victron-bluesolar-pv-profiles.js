import { mergeExactPvManufacturerSpecs } from "./approved-pv-manufacturer-proof.js?v=20261121-bluesolar-pv1";

// Exact manufacturer model SPM041903903: 190W, 39-cell BlueSolar Mono,
// 1485 × 668 × 30mm. Independent CZ/SK/PL approved dealer listings show
// this exact model family; never transfer the specifications to the shared
// Victron 30/45/130W variant pages or another 190W manufacturer.
const MANUFACTURER_PDF = "https://www.victronenergy.com/upload/documents/Datasheet-BlueSolar-Monocrystalline-Panels-current-models-EN-.pdf";
const VERIFIED=Object.freeze({
  "svetkaravanu:109069":{
    merchant:"svetkaravanu",currency:"CZK",bid:"38137ac4",
    name:"Solární panel Victron Energy BlueSolar 190 Wp Mono 12 V",
    url:"https://www.svetkaravanu.cz/solarni-panel-victron-energy-bluesolar-190-wp-mono-12-v_z109069/",
  },
  "padabo_sk:109069":{
    merchant:"padabo_sk",currency:"EUR",bid:"7aed5c13",
    name:"Solárny panel Victron Energy BlueSolar 190 Wp Mono 12 V",
    url:"https://www.padabo.sk/solarny-panel-victron-energy-bluesolar-190-wp-mono-12-v_z109069/",
  },
  "padabo_pl:109069":{
    merchant:"padabo_pl",currency:"PLN",bid:"95d61abf",
    name:"Panel słoneczny Victron Energy BlueSolar 190 Wp Mono 12 V",
    url:"https://www.padabo.pl/panel-sloneczny-victron-energy-bluesolar-190-wp-mono-12-v_z109069/",
  },
});
const SPECS=Object.freeze({
  powerW:190,
  pvModel:"SPM041903903",
  pvVocV:25.5,
  pvIscA:9.17,
  pvVmpV:21.8,
  pvVocTempCoefficientPctPerC:-0.35,
  pvIscTempCoefficientPctPerC:0.04,
  pvElectricalEvidenceUrl:MANUFACTURER_PDF,
});

export function addVerifiedVictronBlueSolar190PvSpecs(product,specs) {
  if (specs?.voltageV != null && specs.voltageV !== 12) return specs;
  return mergeExactPvManufacturerSpecs(product,specs,VERIFIED[product?.id],SPECS);
}
