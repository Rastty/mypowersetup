import { HU_SYSTEM_GUIDE_ROUTE } from "./system-guide-hu.js";

export function injectHungarianSystemGuideLink(html) {
  if (typeof html !== "string" || !html.includes("</main>")) throw new Error("HU_SYSTEM_GUIDE_LINK_HTML_INVALID");
  if (html.includes(`href="${HU_SYSTEM_GUIDE_ROUTE}"`)) return html;

  const promo = `<section class="related hu-system-guide-promo" aria-label="Teljes elektromos rendszer útmutató">
    <h2>Hogyan áll össze az egész elektromos rendszer?</h2>
    <p>Napelem, MPPT, alternátoros DC–DC töltés, 230 V-os töltő, lakótéri akkumulátor és inverter egyetlen döntési térképen.</p>
    <a href="${HU_SYSTEM_GUIDE_ROUTE}">Teljes lakóautó-kapcsolási útmutató →</a>
  </section>`;
  return html.replace("</main>", `${promo}\n</main>`);
}
