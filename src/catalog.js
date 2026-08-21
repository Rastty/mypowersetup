export const APPLIANCES = [
  {
    id: "fridge",
    name: "Kompresorová lednice",
    description: "Průměrný běh kompresoru, ne 24 h naplno",
    icon: "❄️",
    watts: 45,
    hours: 8,
    quantity: 1,
    ac: false,
    surge: 2.5
  },
  {
    id: "lights",
    name: "LED osvětlení",
    description: "Několik úsporných světel večer",
    icon: "💡",
    watts: 20,
    hours: 5,
    quantity: 1,
    ac: false,
    surge: 1
  },
  {
    id: "phones",
    name: "Telefony a tablet",
    description: "Dvě běžná nabití denně",
    icon: "📱",
    watts: 20,
    hours: 3,
    quantity: 1,
    ac: false,
    surge: 1
  },
  {
    id: "laptop",
    name: "Notebook",
    description: "Práce, škola nebo zábava",
    icon: "💻",
    watts: 65,
    hours: 4,
    quantity: 1,
    ac: true,
    surge: 1
  },
  {
    id: "tv",
    name: "Televize",
    description: "Menší LED televize",
    icon: "📺",
    watts: 60,
    hours: 3,
    quantity: 1,
    ac: true,
    surge: 1.2
  },
  {
    id: "coffee",
    name: "Kávovar",
    description: "Krátký, ale vysoký odběr",
    icon: "☕",
    watts: 1000,
    hours: 0.15,
    quantity: 1,
    ac: true,
    surge: 1.1
  },
  {
    id: "pump",
    name: "Vodní čerpadlo",
    description: "Sprcha, dřez a běžná hygiena",
    icon: "🚿",
    watts: 60,
    hours: 0.5,
    quantity: 1,
    ac: false,
    surge: 2
  },
  {
    id: "cpap",
    name: "CPAP přístroj",
    description: "Celonoční provoz bez vyhřívání",
    icon: "🌙",
    watts: 40,
    hours: 8,
    quantity: 1,
    ac: true,
    surge: 1.2
  },
  {
    id: "ebike",
    name: "Nabíjení elektrokola",
    description: "Částečné dobití jedné baterie",
    icon: "🚲",
    watts: 180,
    hours: 3,
    quantity: 1,
    ac: true,
    surge: 1
  },
  {
    id: "tools",
    name: "Elektrické nářadí",
    description: "Vrtačka nebo menší dílenský stroj",
    icon: "🛠️",
    watts: 600,
    hours: 0.5,
    quantity: 1,
    ac: true,
    surge: 2
  }
];

export const SEASONS = {
  summer: { label: "Léto", peakSunHours: 4.5 },
  shoulder: { label: "Jaro / podzim", peakSunHours: 3 },
  winter: { label: "Zima", peakSunHours: 1.5 }
};

export const BATTERIES = {
  lifepo4: { label: "LiFePO₄", usableDepth: 0.8 },
  lead: { label: "AGM / olovo", usableDepth: 0.5 }
};
