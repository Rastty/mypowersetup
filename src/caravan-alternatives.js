// One-tap comparison from a purchasable caravan BOM line to vetted SKU
// alternatives that the existing market Builder has already rendered.
const LOCALE_COPY = Object.freeze({
  cs: "Porovnat další ověřené možnosti",
  sk: "Porovnať ďalšie overené možnosti",
  pl: "Porównaj inne zweryfikowane opcje",
});

export function findCaravanAlternatives(root, category) {
  // The source comparison contains only the same recommendation engine's
  // vetted category products. Never open an unverified merchant search.
  if (!/^(battery|solar_panel|controller|inverter|dc_charger|shore_charger)$/.test(category)) return null;
  const group = root.querySelector(`#product-group-${category}`);
  const details = group?.closest(".product-comparison-details");
  if (!group || !details) return null;
  const cards = group.querySelectorAll(".product-card");
  return cards.length > 1 ? { group, details, alternatives: cards.length - 1 } : null;
}

export function mountCaravanAlternativeShortcuts(root = document) {
  const plan = root.querySelector("#caravan-buyer-checklist");
  const productGroups = root.querySelector("#recommendation-groups");
  if (!plan || !productGroups) return;
  const label = LOCALE_COPY[root.documentElement?.lang] || LOCALE_COPY.cs;
  const refresh = () => {
    const rows = plan.querySelectorAll(".caravan-buying-plan-rows > li.is-ready[data-buying-category]");
    for (const row of rows) {
      const category = row.getAttribute("data-buying-category");
      const eligible = findCaravanAlternatives(root, category);
      const existing = row.querySelector("[data-caravan-alternatives]");
      if (!eligible) {
        existing?.remove();
        continue;
      }
      if (existing) continue;
      const button = root.createElement("button");
      button.type = "button";
      button.className = "caravan-alternatives-link";
      button.dataset.caravanAlternatives = category;
      button.textContent = `${label} (${eligible.alternatives})`;
      button.addEventListener("click", () => {
        const current = findCaravanAlternatives(root, category);
        if (!current) return;
        current.details.open = true;
        requestAnimationFrame(() => {
          current.group.scrollIntoView({ behavior: "smooth", block: "start" });
          current.group.setAttribute("tabindex", "-1");
          current.group.focus({ preventScroll: true });
        });
      });
      row.append(button);
    }
  };
  refresh();
  // Listen only to the two top-level result replacements. Avoid observing
  // button insertion itself, which could otherwise cause a mutation loop.
  const observer = new MutationObserver(refresh);
  observer.observe(plan, { childList: true });
  observer.observe(productGroups, { childList: true });
}

if (typeof document !== "undefined") mountCaravanAlternativeShortcuts(document);
