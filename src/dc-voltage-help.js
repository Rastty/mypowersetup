// A sizing warning is a decision point, not a product recommendation.
// Link only to published, localized safety guides; never imply that a
// 24→12 V converter or its protection is present in the verified basket.
const GUIDES = Object.freeze({
  cs: Object.freeze({ href: "/pruvodce/12-v-nebo-24-v-karavan/", label: "Porovnat 12 V a 24 V před nákupem" }),
  sk: Object.freeze({ href: "/sk/sprievodca/12-v-alebo-24-v-karavan/", label: "Porovnať 12 V a 24 V pred nákupom" }),
  pl: Object.freeze({ href: "/pl/poradnik/12-v-czy-24-v-kamper/", label: "Porównaj 12 V i 24 V przed zakupem" }),
  hu: Object.freeze({ href: "/hu/utmutatok/12-v-vagy-24-v-lakoauto/", label: "Hasonlítsd össze a 12 V-os és 24 V-os rendszereket" }),
  pt: Object.freeze({ href: "/pt/guias/sistema-12v-ou-24v-autocaravana/", label: "Comparar 12 V e 24 V antes de comprar" }),
  ro: Object.freeze({ href: "/ro/ghiduri/sistem-12v-sau-24v-autorulota/", label: "Compară 12 V și 24 V înainte de cumpărare" }),
  si: Object.freeze({ href: "/si/vodici/12v-ali-24v-sistem-avtodom/", label: "Primerjaj 12 V in 24 V pred nakupom" }),
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

export function dcVoltageGuide(locale) {
  return GUIDES[locale] || null;
}

export function renderDcLoadVoltageNotice(warning, locale) {
  if (typeof warning !== "string" || !warning.trim()) return "";
  const guide = dcVoltageGuide(locale);
  const action = guide
    ? ` <a href="${guide.href}" data-dc-voltage-guide data-result-guide data-topic="system_voltage">${escapeHtml(guide.label)} →</a>`
    : "";
  return `<p class="dc-voltage-warning" role="note">${escapeHtml(warning)}${action}</p>`;
}
