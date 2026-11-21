// Portable, privacy-safe shopping-list handoff for existing caravan plans.
// Never copy affiliate URLs, prices, stock promises or identifiers.
const LABELS = {
  cs: { title:"Můj plán elektrické sestavy do karavanu", verified:"Ověřený návrh produktu", missing:"Chybí ověřený produkt", complete:"Pokrytí produktových kategorií: úplné", partial:"Pokrytí produktových kategorií: neúplné", manual:"Nabíjení vyžaduje individuální návrh.", caution:"Ověřte skutečné parametry, jištění, kabeláž, montáž a aktuální dostupnost. Jde o podklad, nikoli elektroprojekt.", button:"Kopírovat nákupní seznam", copied:"Seznam zkopírován", failed:"Zkopírování se nepodařilo" },
  sk: { title:"Môj nákupný plán elektrickej zostavy do karavanu", verified:"Overený návrh produktu", missing:"Chýba overený produkt", complete:"Pokrytie produktových kategórií: úplné", partial:"Pokrytie produktových kategórií: neúplné", manual:"Nabíjanie vyžaduje individuálny návrh.", caution:"Overte skutočné parametre, istenie, kabeláž, montáž a aktuálnu dostupnosť. Toto nie je elektroprojekt.", button:"Kopírovať nákupný zoznam", copied:"Zoznam skopírovaný", failed:"Kopírovanie zlyhalo" },
  pl: { title:"Moja lista zakupów do instalacji elektrycznej kampera", verified:"Zweryfikowany produkt", missing:"Brak zweryfikowanego produktu", complete:"Pokrycie kategorii: kompletne", partial:"Pokrycie kategorii: niekompletne", manual:"Ładowanie wymaga indywidualnego projektu.", caution:"Sprawdź parametry, zabezpieczenia, przewody, montaż i aktualną dostępność. To nie jest projekt elektryczny.", button:"Kopiuj listę zakupów", copied:"Lista skopiowana", failed:"Nie udało się skopiować" },
};

export function formatCaravanShoppingList({ locale = "cs", rows = [], complete = false, manualDesign = false } = {}) {
  const l = LABELS[locale] || LABELS.cs;
  const lines = [l.title, complete ? l.complete : l.partial, ""];
  for (const [index,row] of rows.entries()) {
    const label = String(row?.label || row?.category || "").trim();
    if (!label) continue;
    const name = row?.ready ? String(row?.name || "").trim() : "";
    lines.push(`${index+1}. ${label}: ${name ? `${l.verified} — ${name}` : l.missing}`);
  }
  if (manualDesign) lines.push("", l.manual);
  lines.push("", l.caution, "MyPowerSetup — mypowersetup.com");
  return lines.join("\n");
}

function currentPlanData(section) {
  const rows = [...section.querySelectorAll(".caravan-buying-plan-rows > li[data-buying-category]")].map(item => ({
    category: item.getAttribute("data-buying-category"),
    label: item.querySelector(".caravan-buying-plan-item strong")?.textContent,
    name: item.querySelector(".caravan-buying-plan-item span")?.textContent,
    ready: item.classList.contains("is-ready") && Boolean(item.querySelector("a[data-affiliate-click]")),
  }));
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
    try {
      await copyText(formatCaravanShoppingList({locale,...data}));
      status.textContent=l.copied;
    } catch { status.textContent=l.failed; }
    finally { button.disabled=false; }
  });
  section.append(button,status);
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
