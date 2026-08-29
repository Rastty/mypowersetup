import { HU_POWER_STATION_GUIDE_ROUTE } from "./power-station-guide-hu.js";
import { HU_SYSTEM_GUIDE_ROUTE } from "./system-guide-hu.js";
import { HU_SYSTEM_VOLTAGE_GUIDE_ROUTE } from "./system-voltage-guide-hu.js";

export function injectHungarianSystemGuideLink(html) {
  if (typeof html !== "string" || !html.includes("</main>")) throw new Error("HU_SYSTEM_GUIDE_LINK_HTML_INVALID");

  const promos = [];
  if (!html.includes(`href="${HU_POWER_STATION_GUIDE_ROUTE}"`)) {
    promos.push(`<section class="related hu-power-station-guide-promo" aria-label="Power station vagy beépített rendszer útmutató">
    <h2>Power station vagy beépített rendszer?</h2>
    <p>Hasonlítsd össze a hordozhatóságot, a fedélzeti 12 V-ot, a menet közbeni töltést, a javíthatóságot és a bővíthetőséget.</p>
    <a href="${HU_POWER_STATION_GUIDE_ROUTE}">Power station döntési útmutató →</a>
  </section>`);
  }
  if (!html.includes(`href="${HU_SYSTEM_GUIDE_ROUTE}"`)) {
    promos.push(`<section class="related hu-system-guide-promo" aria-label="Teljes elektromos rendszer útmutató">
    <h2>Hogyan áll össze az egész elektromos rendszer?</h2>
    <p>Napelem, MPPT, alternátoros DC–DC töltés, 230 V-os töltő, lakótéri akkumulátor és inverter egyetlen döntési térképen.</p>
    <a href="${HU_SYSTEM_GUIDE_ROUTE}">Teljes lakóautó-kapcsolási útmutató →</a>
  </section>`);
  }
  if (!html.includes(`href="${HU_SYSTEM_VOLTAGE_GUIDE_ROUTE}"`)) {
    promos.push(`<section class="related hu-voltage-guide-promo" aria-label="12 vagy 24 voltos rendszer útmutató">
    <h2>12 V vagy 24 V legyen a rendszer?</h2>
    <p>Hasonlítsd össze az áramot, az invertert, az akkumulátorbankot és a teljes eszközlánc kompatibilitását.</p>
    <a href="${HU_SYSTEM_VOLTAGE_GUIDE_ROUTE}">12 V vagy 24 V döntési útmutató →</a>
  </section>`);
  }
  if (!promos.length) return html;
  return html.replace("</main>", `${promos.join("\n")}\n</main>`);
}
