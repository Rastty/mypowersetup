const PROFILE_DEFINITIONS = [
  {
    id: "weekend",
    autonomyDays: "2",
    season: "summer",
    appliances: {
      fridge: { hours: 8, quantity: 1 },
      lights: { hours: 5, quantity: 1 },
      phones: { hours: 3, quantity: 1 },
      pump: { hours: 0.5, quantity: 1 },
    },
  },
  {
    id: "family",
    autonomyDays: "2",
    season: "summer",
    appliances: {
      fridge: { hours: 10, quantity: 1 },
      lights: { hours: 5, quantity: 1 },
      phones: { hours: 4, quantity: 2 },
      tv: { hours: 2, quantity: 1 },
      pump: { hours: 0.75, quantity: 1 },
    },
  },
  {
    id: "work",
    autonomyDays: "2",
    season: "shoulder",
    appliances: {
      fridge: { hours: 8, quantity: 1 },
      lights: { hours: 4, quantity: 1 },
      phones: { hours: 3, quantity: 1 },
      laptop: { hours: 8, quantity: 1 },
      pump: { hours: 0.5, quantity: 1 },
    },
  },
  {
    id: "comfort",
    autonomyDays: "3",
    season: "shoulder",
    appliances: {
      fridge: { hours: 10, quantity: 1 },
      lights: { hours: 5, quantity: 1 },
      phones: { hours: 4, quantity: 2 },
      laptop: { hours: 4, quantity: 1 },
      tv: { hours: 3, quantity: 1 },
      coffee: { hours: 0.2, quantity: 1 },
      pump: { hours: 0.75, quantity: 1 },
    },
  },
];

const PROFILE_TEXT = {
  cs: {
    eyebrow: "Rychlý start",
    title: "Nevíte přesnou spotřebu? Začněte typickým profilem",
    note: "Profil pouze předvyplní spotřebiče a podmínky. Všechny hodnoty můžete hned upravit podle štítků a svého používání.",
    profiles: {
      weekend: ["Víkend", "Lednice, světla, telefony a voda"],
      family: ["Rodinná dovolená", "Běžný provoz včetně televize"],
      work: ["Práce z karavanu", "Celodenní notebook a základní provoz"],
      comfort: ["Vyšší komfort", "Více spotřebičů a třídenní rezerva"],
    },
  },
  sk: {
    eyebrow: "Rýchly štart",
    title: "Neviete presnú spotrebu? Začnite typickým profilom",
    note: "Profil iba predvyplní spotrebiče a podmienky. Všetky hodnoty môžete hneď upraviť podľa štítkov a svojho používania.",
    profiles: {
      weekend: ["Víkend", "Chladnička, svetlá, telefóny a voda"],
      family: ["Rodinná dovolenka", "Bežná prevádzka vrátane televízora"],
      work: ["Práca z karavanu", "Celodenný notebook a základná prevádzka"],
      comfort: ["Vyšší komfort", "Viac spotrebičov a trojdňová rezerva"],
    },
  },
  pl: {
    eyebrow: "Szybki start",
    title: "Nie znasz dokładnego zużycia? Zacznij od typowego profilu",
    note: "Profil tylko wstępnie uzupełnia urządzenia i warunki. Wszystkie wartości możesz od razu zmienić zgodnie z tabliczkami znamionowymi i sposobem użytkowania.",
    profiles: {
      weekend: ["Weekend", "Lodówka, światła, telefony i woda"],
      family: ["Rodzinny urlop", "Typowe użytkowanie z telewizorem"],
      work: ["Praca z kampera", "Laptop przez cały dzień i podstawowe odbiorniki"],
      comfort: ["Większy komfort", "Więcej urządzeń i trzy dni zapasu"],
    },
  },
  hu: {
    eyebrow: "Gyors kezdés",
    title: "Nem ismered a pontos fogyasztást? Indulj egy tipikus profilból",
    note: "A profil csak előre kitölti a fogyasztókat és a feltételeket. Minden értéket azonnal módosíthatsz az adattáblák és a használati szokásaid alapján.",
    profiles: {
      weekend: ["Hétvége", "Hűtőszekrény, világítás, telefonok és víz"],
      family: ["Családi nyaralás", "Átlagos használat televízióval"],
      work: ["Munka a lakóautóból", "Egész napos laptophasználat és alapfogyasztók"],
      comfort: ["Nagyobb kényelem", "Több fogyasztó és háromnapos tartalék"],
    },
  },
};

export function getUsageProfiles(locale = "cs") {
  const text = PROFILE_TEXT[locale] || PROFILE_TEXT.cs;
  return PROFILE_DEFINITIONS.map((profile) => ({
    ...profile,
    label: text.profiles[profile.id][0],
    description: text.profiles[profile.id][1],
  }));
}

export function mountUsageProfiles({ locale = "cs", form, applianceGrid, appliances, onChange, onSelect }) {
  const target = document.querySelector("#usage-profiles");
  if (!target) return;
  const text = PROFILE_TEXT[locale] || PROFILE_TEXT.cs;
  const profiles = getUsageProfiles(locale);

  target.innerHTML = `
    <div class="usage-profile-heading">
      <span class="step-kicker">${text.eyebrow}</span>
      <strong>${text.title}</strong>
      <p>${text.note}</p>
    </div>
    <div class="usage-profile-grid">
      ${profiles.map((profile) => `
        <button type="button" class="usage-profile" data-usage-profile="${profile.id}" aria-pressed="false">
          <strong>${profile.label}</strong>
          <small>${profile.description}</small>
        </button>
      `).join("")}
    </div>`;

  target.addEventListener("click", (event) => {
    const button = event.target.closest("[data-usage-profile]");
    if (!button) return;
    const profile = profiles.find((item) => item.id === button.dataset.usageProfile);
    if (!profile) return;
    applyUsageProfile(profile, { form, applianceGrid, appliances });
    target.querySelectorAll("[data-usage-profile]").forEach((peer) => {
      const selected = peer === button;
      peer.classList.toggle("is-selected", selected);
      peer.setAttribute("aria-pressed", String(selected));
    });
    onChange?.();
    onSelect?.(profile.id);
  });
}

export function applyUsageProfile(profile, { form, applianceGrid, appliances }) {
  for (const appliance of appliances) {
    const card = applianceGrid.querySelector(`[data-appliance-card="${appliance.id}"]`);
    if (!card) continue;
    const preset = profile.appliances[appliance.id];
    const checkbox = card.querySelector('input[type="checkbox"][name="appliance"]');
    checkbox.checked = Boolean(preset);
    card.classList.toggle("is-selected", Boolean(preset));
    const hours = card.querySelector("[data-hours]");
    const quantity = card.querySelector("[data-quantity]");
    if (hours) hours.value = preset?.hours ?? appliance.hours;
    if (quantity) quantity.value = preset?.quantity ?? appliance.quantity;
  }

  selectRadio(form, "autonomyDays", profile.autonomyDays);
  selectRadio(form, "season", profile.season);
}

function selectRadio(form, name, value) {
  form.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.checked = input.value === value;
    input.closest(".choice-card")?.classList.toggle("is-selected", input.checked);
  });
}
