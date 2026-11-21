// Portable, privacy-safe shopping-list handoff for existing caravan plans.
// Never copy affiliate URLs, prices, stock promises or identifiers.
const LABELS = {
  cs: { title:"Můj plán elektrické sestavy do karavanu", verified:"Ověřený návrh produktu", missing:"Chybí ověřený produkt", complete:"Pokrytí produktových kategorií: úplné", partial:"Pokrytí produktových kategorií: neúplné", manual:"Nabíjení vyžaduje individuální návrh.", wiring:"Ověřené limity zapojení panelů", evidence:"Výrobní podklady", missingDetail:"Proč nákup není potvrzen", caution:"Ověřte skutečné parametry, jištění, kabeláž, montáž a aktuální dostupnost. Jde o podklad, nikoli elektroprojekt.", button:"Kopírovat nákupní seznam", save:"Uložit odkaz na sestavu", saved:"Odkaz na sestavu zkopírován", copied:"Seznam zkopírován", failed:"Zkopírování se nepodařilo" },
  sk: { title:"Môj nákupný plán elektrickej zostavy do karavanu", verified:"Overený návrh produktu", missing:"Chýba overený produkt", complete:"Pokrytie produktových kategórií: úplné", partial:"Pokrytie produktových kategórií: neúplné", manual:"Nabíjanie vyžaduje individuálny návrh.", wiring:"Overené limity zapojenia panelov", evidence:"Podklady výrobcu", missingDetail:"Prečo nákup nie je potvrdený", caution:"Overte skutočné parametre, istenie, kabeláž, montáž a aktuálnu dostupnosť. Toto nie je elektroprojekt.", button:"Kopírovať nákupný zoznam", save:"Uložiť odkaz na zostavu", saved:"Odkaz na zostavu skopírovaný", copied:"Zoznam skopírovaný", failed:"Kopírovanie zlyhalo" },
  pl: { title:"Moja lista zakupów do instalacji elektrycznej kampera", verified:"Zweryfikowany produkt", missing:"Brak zweryfikowanego produktu", complete:"Pokrycie kategorii: kompletne", partial:"Pokrycie kategorii: niekompletne", manual:"Ładowanie wymaga indywidualnego projektu.", wiring:"Zweryfikowane granice połączenia paneli", evidence:"Dokumentacja producenta", missingDetail:"Dlaczego zakup nie został potwierdzony", caution:"Sprawdź parametry, zabezpieczenia, przewody, montaż i aktualną dostępność. To nie jest projekt elektryczny.", button:"Kopiuj listę zakupów", save:"Zapisz link do zestawu", saved:"Link do zestawu skopiowany", copied:"Lista skopiowana", failed:"Nie udało się skopiować" },
};

// Only refer to the existing calculator's validated, load-bearing share query.
// No price, product ID, checkout URI, affiliate token or stale snapshot is stored.
// DecodeSetupQuery in each Builder validates the sizing payload on reopening.
export function currentCaravanSetupLink(locationLike, locale = "cs") {
  if (!locationLike?.href) return null;
  let url;
  try { url = new URL(locationLike.href); } catch { return null; }
  const path = { cs: "/", sk: "/sk/", pl: "/pl/" }[locale];
  if (!path || url.protocol !== "https:" || url.pathname !== path || !url.searchParams.has("loads")) return null;
  if (url.searchParams.getAll("loads").length !== 1 || !url.searchParams.get("loads")) return null;
  // Preserve all load/sizing inputs already encoded by the canonical Builder,
  // but strip unrelated campaign parameters. Sharing the current form creates
  // a live recalculation rather than a copied static merchant offer.
  const keys = ["loads","customName","customWatts","customAc","customSurge","days",
    "season","battery","voltage","cable","drive","starter","dcdcCable","shore","roofL","roofW"];
  const params = new URLSearchParams();
  for (const key of keys) {
    const values = url.searchParams.getAll(key);
    if (values.length > 1) return null;
    if (values.length === 1) params.set(key, values[0]);
  }
  return `${url.origin}${path}?${params.toString()}#kalkulator`;
}

// Only public manufacturer datasheets, never affiliate tracking/click URLs,
// can travel with the copied wiring review to the customer's installer.
function approvedPublicPvEvidenceUrl(value) {
  if (!value || typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      && !url.search && !url.hash && url.pathname.toLowerCase().endsWith(".pdf")
      && ["www.victronenergy.com", "websiteoss.ecoflow.com"].includes(url.hostname)
      ? url.href : null;
  } catch { return null; }
}

const singleLine = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

export function formatCaravanShoppingList({ locale = "cs", rows = [], complete = false, manualDesign = false, setupUrl = null } = {}) {
  const l = LABELS[locale] || LABELS.cs;
  const lines = [l.title, complete ? l.complete : l.partial, ""];
  for (const [index,row] of rows.entries()) {
    const label = String(row?.label || row?.category || "").trim();
    if (!label) continue;
    const name = row?.ready ? String(row?.name || "").trim() : "";
    lines.push(`${index+1}. ${label}: ${name ? `${l.verified} — ${name}` : l.missing}`);
    const requirement = singleLine(row?.requirement);
    if (requirement) lines.push(`   ${requirement}`);
    // A copied "missing product" with no reason is useless when a source-
    // reviewed MPPT was withheld because of Voc/Isc/series-parallel limits.
    if (!name) {
      const missing = singleLine(row?.missingDetail);
      if (missing) lines.push(`   ${l.missingDetail}: ${missing}`);
    } else {
      const wiring = singleLine(row?.pvWiringReview);
      if (wiring) {
        lines.push(`   ${l.wiring}: ${wiring}`);
        const manufacturerUrl = approvedPublicPvEvidenceUrl(row?.manufacturerUrl);
        if (manufacturerUrl) lines.push(`   ${l.evidence}: ${manufacturerUrl}`);
      }
    }
  }
  if (manualDesign) lines.push("", l.manual);
  if (setupUrl) lines.push("", locale === "sk" ? "Otvoriť aktuálne prepočítanú zostavu:" : locale === "pl" ? "Otwórz zestaw z aktualnymi produktami:" : "Otevřít sestavu s aktuálními produkty:", setupUrl);
  lines.push("", l.caution, "MyPowerSetup — mypowersetup.com");
  return lines.join("\n");
}

function currentPlanData(section) {
  const rows = [...section.querySelectorAll(".caravan-buying-plan-rows > li[data-buying-category]")].map(item => {
    const ready = item.classList.contains("is-ready") && Boolean(item.querySelector("a[data-affiliate-click]"));
    const visibleDetail = item.querySelector(".caravan-buying-plan-item span")?.textContent;
    return {
      category: item.getAttribute("data-buying-category"),
      label: item.querySelector(".caravan-buying-plan-item strong")?.textContent,
      name: ready ? visibleDetail : "",
      requirement: item.querySelector(".caravan-item-requirement")?.textContent,
      missingDetail: ready ? null : visibleDetail,
      pvWiringReview: ready ? item.querySelector("[data-pv-wiring-review]")?.firstChild?.textContent : null,
      manufacturerUrl: ready ? item.querySelector("[data-manufacturer-pv-proof]")?.href : null,
      ready,
    };
  });
  return {
    rows,
    complete: section.dataset.buyingPlanState === "complete",
    manualDesign: Boolean(section.querySelector(".caravan-buying-plan-manual")),
  };
}

async function copyText(value) {
  if (globalThis.navigator?.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(value); return; } catch {}
  }
  const input=document.createElement("textarea");
  input.value=value; input.readOnly=true; input.style.position="fixed"; input.style.opacity="0";
  document.body.append(input); input.select();
  try {
    if (!document.execCommand("copy")) throw new Error("COPY_UNAVAILABLE");
  } finally { input.remove(); }
}

function mountCopyButton(target, locale) {
  const section = target.querySelector(".caravan-buying-plan");
  if (!section || section.querySelector("[data-caravan-copy-plan]")) return;
  const l = LABELS[locale] || LABELS.cs;
  const button=document.createElement("button");
  button.type="button";
  button.className="button button-secondary caravan-buying-plan-copy";
  button.dataset.caravanCopyPlan="";
  button.textContent=l.button;
  const status=document.createElement("span");
  status.className="caravan-buying-plan-copy-status";
  status.setAttribute("role","status");
  button.addEventListener("click", async () => {
    button.disabled=true;
    const data=currentPlanData(section); // always read the current rendered plan
    const setupUrl=currentCaravanSetupLink(globalThis.location,locale);
    try {
      await copyText(formatCaravanShoppingList({locale,...data,setupUrl}));
      status.textContent=l.copied;
    } catch { status.textContent=l.failed; }
    finally { button.disabled=false; }
  });
  const saveButton=document.createElement("button");
  saveButton.type="button";
  saveButton.className="button button-secondary caravan-buying-plan-save";
  saveButton.dataset.caravanSaveSetup="";
  saveButton.textContent=l.save;
  saveButton.addEventListener("click", async () => {
    const url=currentCaravanSetupLink(globalThis.location,locale);
    if (!url) { status.textContent=l.failed; return; }
    saveButton.disabled=true;
    try { await copyText(url); status.textContent=l.saved; }
    catch { status.textContent=l.failed; }
    finally { saveButton.disabled=false; }
  });
  const actions=document.createElement("div");
  actions.className="caravan-buying-plan-export-actions";
  actions.append(button,saveButton);
  section.append(actions,status);
}

export function mountCaravanPlanExport(root=document) {
  const target=root.querySelector("#caravan-buyer-checklist");
  if (!target) return;
  const locale=root.documentElement?.lang || "cs";
  const refresh=()=>mountCopyButton(target,locale);
  refresh();
  new MutationObserver(refresh).observe(target,{childList:true});
}

if (typeof document !== "undefined") mountCaravanPlanExport(document);
