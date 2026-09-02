const ROBOTS = "noindex,nofollow,noarchive";

const TRUST_PAGES = Object.freeze([
  { slug: "despre-proiect", title: "Despre MyPowerSetup România", heading: "Despre proiect", intro: "MyPowerSetup pornește de la consumul zilnic și autonomia dorită, nu de la un produs anume.", sections: [["Ce calculăm", "Estimăm energia zilnică, bateria, panourile solare, invertorul și controlerul MPPT."],["Independență", "Rezultatul tehnic este calculat înainte de orice recomandare afiliată."],["Limite", "Dimensionarea este orientativă; cablurile, protecțiile, instalația de 230 V și montajul trebuie verificate pentru configurația reală."]] },
  { slug: "metodologie", title: "Metodologia calculatorului pentru autorulotă", heading: "Metodologie și ipoteze", intro: "Versiunea română folosește același nucleu tehnic și aceleași rezerve de siguranță ca celelalte piețe.", sections: [["Consum zilnic", "Adunăm puterea × orele de utilizare × cantitatea pentru fiecare consumator selectat."],["Baterie", "Capacitatea include zilele de autonomie, o rezervă de 15% și partea utilizabilă specifică tipului de baterie."],["Solar", "Puterea solară ține cont de sezon, eficiență totală de 75% și o rezervă suplimentară de 15%."],["Invertor și MPPT", "Invertorul include rezervă peste sarcina AC și vârfurile de pornire; MPPT pornește de la puterea solară și tensiunea sistemului."]] },
  { slug: "afiliere", title: "Politica de afiliere MyPowerSetup România", heading: "Afiliere și independență", intro: "Unele linkuri pot genera comision, fără să modifice rezultatul tehnic.", sections: [["Calculul primul", "Mai întâi stabilim cerințele electrice."],["Destinație exactă", "Afișăm un produs doar dacă pagina exactă, specificațiile critice și eligibilitatea pentru România sunt verificate."],["Fail closed", "Dacă destinația, specificațiile sau livrarea sunt incerte, produsul nu este recomandat."]] },
  { slug: "confidentialitate", title: "Confidențialitate MyPowerSetup România", heading: "Confidențialitate", intro: "Calculatorul funcționează și fără Google Analytics; analiza se activează doar după consimțământ.", sections: [["Datele calculatorului", "Valorile introduse sunt folosite în browser pentru calcul și nu necesită nume, adresă sau date de plată."],["Analiză opțională", "Cu acordul utilizatorului măsurăm folosirea funcțiilor pentru a îmbunătăți experiența."],["Linkuri externe", "După accesarea unui link afiliat se aplică politicile comerciantului și ale rețelei de afiliere."]] },
]);

const GUIDE_PAGES = Object.freeze([
  { slug: "capacitate-baterie-autorulota", title: "Ce capacitate de baterie are nevoie o autorulotă?", heading: "Dimensionarea bateriei pentru autorulotă", intro: "Pornește de la Wh pe zi și autonomie, apoi transformă rezultatul în Ah la tensiunea sistemului." },
  { slug: "lifepo4-sau-agm-autorulota", title: "LiFePO4 sau AGM pentru autorulotă?", heading: "LiFePO₄ sau AGM", intro: "Compară energia utilizabilă, masa, spațiul și compatibilitatea încărcării, nu doar prețul de cumpărare." },
  { slug: "cate-panouri-solare-autorulota", title: "Câte panouri solare sunt necesare pentru autorulotă?", heading: "De câți Wp ai nevoie?", intro: "Dimensionează solarul din consumul zilnic, sezon și pierderi, nu doar din spațiul liber pe plafon." },
  { slug: "regulator-mppt-autorulota", title: "Cum alegi regulatorul MPPT pentru autorulotă", heading: "Alegerea regulatorului MPPT", intro: "Verifică amperajul, tensiunea PV maximă, configurația panourilor și profilul bateriei." },
  { slug: "invertor-autorulota-putere", title: "Ce putere trebuie să aibă invertorul unei autorulote?", heading: "Dimensionarea invertorului", intro: "Alege puterea continuă după consumatorii AC care pot funcționa simultan și ține cont de vârfurile de pornire." },
  { slug: "incarcator-dc-dc-autorulota", title: "Încărcător DC-DC pentru autorulotă", heading: "Încărcarea din alternator", intro: "DC-DC controlează încărcarea bateriei de serviciu în mers și este important mai ales cu alternatoare inteligente și LiFePO₄." },
  { slug: "incarcator-230v-baterie-autorulota", title: "Încărcător 230 V pentru bateria autorulotei", heading: "Încărcarea de la 230 V", intro: "Curentul și profilul de încărcare trebuie să fie compatibile cu bateria și BMS-ul." },
  { slug: "cabluri-sigurante-12v-autorulota", title: "Cabluri și siguranțe 12 V în autorulotă", heading: "Cabluri și protecții 12/24 V", intro: "Secțiunea cablului depinde de curent, lungimea totală a circuitului și căderea de tensiune admisă." },
  { slug: "consum-frigider-compresor-autorulota", title: "Cât consumă un frigider cu compresor în autorulotă?", heading: "Consum zilnic al frigiderului", intro: "Puterea nominală nu se consumă 24 de ore; ciclul de funcționare și temperatura exterioară contează decisiv." },
  { slug: "sistem-electric-complet-autorulota", title: "Sistem electric complet pentru autorulotă", heading: "Baterie, solar, alternator și 230 V ca un singur sistem", intro: "Toate componentele trebuie dimensionate din același scenariu de consum și aceeași tensiune de sistem." },
  { slug: "statie-portabila-sau-instalatie-fixa-autorulota", title: "Stație portabilă sau instalație fixă în autorulotă?", description: "Compară o stație portabilă cu un sistem electric fix după capacitate, putere, solar, ieșire 12 V, încărcare și posibilitatea de extindere.", heading: "Stație portabilă sau instalație fixă: ce alegi?", intro: "Alegerea corectă pornește de la consumul zilnic, autonomia dorită și modul real de utilizare, nu de la cea mai mare cifră din reclamă." },
]);

const GUIDE_SECTIONS = Object.freeze([
  ["De la consum la cerință", "Calculează energia în Wh/zi înainte de a alege componente."],
  ["Rezervă și condiții reale", "Păstrează marjă pentru pierderi, temperatură, sezon și variații de utilizare."],
  ["Verificare înainte de cumpărare", "Confirmă tensiunile, curenții, limitele BMS, Voc/Isc, cablurile și protecțiile din documentația produsului."],
]);

export const RO_PRIVATE_CONTENT = Object.freeze({ trust: TRUST_PAGES, guides: GUIDE_PAGES });

export function getRomaniaPrivatePage(pathname) {
  const path = String(pathname || "").replace(/^\/ro\/?/, "").replace(/\/$/, "");
  const trust = TRUST_PAGES.find((page) => page.slug === path);
  if (trust) return { ...trust, type: "trust" };
  if (path === "ghiduri") return { type: "hub", title: "Ghiduri pentru sistemul electric al autorulotei", heading: "Ghiduri pentru autorulotă", intro: "Baterie, solar, MPPT, invertor și încărcare explicate pornind de la consumul real." };
  const slug = path.startsWith("ghiduri/") ? path.slice("ghiduri/".length) : null;
  const guide = GUIDE_PAGES.find((page) => page.slug === slug);
  return guide ? { ...guide, type: "guide", sections: GUIDE_SECTIONS } : null;
}

export function renderRomaniaPrivateContentPage(pathname) {
  const page = getRomaniaPrivatePage(pathname);
  if (!page) return null;
  const links = GUIDE_PAGES.map((guide) => `<li><a href="/ro/ghiduri/${guide.slug}/">${escapeHtml(guide.title)}</a></li>`).join("");
  const sections = page.type === "hub" ? `<ul>${links}</ul>` : (page.sections || []).map(([title, body]) => `<section><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></section>`).join("");
  const related = page.type === "guide" ? `<aside class="related"><h2>Alte ghiduri</h2><ul>${links}</ul></aside>` : "";
  const topCta = page.type === "guide" ? `<p class="cta"><a class="button button-primary" href="/ro/#calculator-preview">Calculează și vezi produse compatibile</a></p>` : "";
  const bottomCta = page.type === "guide" ? `<aside class="cta"><h2 data-guide-conversion-cta>Calculează și vezi produse compatibile</h2><p>Rezultatul este gratuit și fără înregistrare. La final afișăm doar produse ale căror limite tehnice și destinație exactă le-am verificat.</p><a class="button button-primary" href="/ro/#calculator-preview">Deschide calculatorul și vezi produsele</a></aside>` : "";
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="${ROBOTS}"><meta name="description" content="${escapeHtml(page.intro)}"><link rel="stylesheet" href="/styles.css"><title>${escapeHtml(page.title)}</title></head><body><header class="site-header"><a class="brand" href="/ro/">ϟ MyPowerSetup</a></header><main class="content-page"><p class="eyebrow">Versiune privată în validare pentru România</p><h1>${escapeHtml(page.heading)}</h1><p>${escapeHtml(page.intro)}</p>${topCta}${sections}${bottomCta}${related}</main><footer class="expansion-footer"><nav><a href="/ro/ghiduri/">Ghiduri</a><a href="/ro/metodologie/">Metodologie</a><a href="/ro/despre-proiect/">Despre proiect</a><a href="/ro/afiliere/">Afiliere</a><a href="/ro/confidentialitate/">Confidențialitate</a></nav></footer><script type="module" src="/src/analytics.js"></script></body></html>`;
}

function escapeHtml(value) { return String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]); }
