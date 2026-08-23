export const APPLIANCES = [
  {
    id: "fridge",
    name: "Kompresorová chladnička",
    description: "Priemerný chod kompresora, nie 24 h naplno",
    icon: "❄️",
    watts: 45,
    hours: 8,
    quantity: 1,
    ac: false,
    surge: 2.5
  },
  {
    id: "lights",
    name: "LED osvetlenie",
    description: "Niekoľko úsporných svetiel večer",
    icon: "💡",
    watts: 20,
    hours: 5,
    quantity: 1,
    ac: false,
    surge: 1
  },
  {
    id: "phones",
    name: "Telefóny a tablet",
    description: "Dve bežné nabitia denne",
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
    description: "Práca, škola alebo zábava",
    icon: "💻",
    watts: 65,
    hours: 4,
    quantity: 1,
    ac: true,
    surge: 1
  },
  {
    id: "tv",
    name: "Televízor",
    description: "Menší LED televízor",
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
    description: "Krátky, ale vysoký odber",
    icon: "☕",
    watts: 1000,
    hours: 0.15,
    quantity: 1,
    ac: true,
    surge: 1.1
  },
  {
    id: "pump",
    name: "Vodné čerpadlo",
    description: "Sprcha, drez a bežná hygiena",
    icon: "🚿",
    watts: 60,
    hours: 0.5,
    quantity: 1,
    ac: false,
    surge: 2
  },
  {
    id: "cpap",
    name: "CPAP prístroj",
    description: "Celonočná prevádzka bez vyhrievania",
    icon: "🌙",
    watts: 40,
    hours: 8,
    quantity: 1,
    ac: true,
    surge: 1.2
  },
  {
    id: "ebike",
    name: "Nabíjanie elektrobicykla",
    description: "Čiastočné dobitie jednej batérie",
    icon: "🚲",
    watts: 180,
    hours: 3,
    quantity: 1,
    ac: true,
    surge: 1
  },
  {
    id: "tools",
    name: "Elektrické náradie",
    description: "Vŕtačka alebo menší dielenský stroj",
    icon: "🛠️",
    watts: 600,
    hours: 0.5,
    quantity: 1,
    ac: true,
    surge: 2
  },
  {
    id: "custom",
    name: "Vlastný spotrebič",
    description: "Doplňte údaje zo štítku alebo manuálu",
    icon: "＋",
    watts: 100,
    hours: 1,
    quantity: 1,
    ac: false,
    surge: 1,
    custom: true
  }
];

export const SEASONS = {
  summer: { label: "Leto", peakSunHours: 4.5 },
  shoulder: { label: "Jar / jeseň", peakSunHours: 3 },
  winter: { label: "Zima", peakSunHours: 1.5 }
};

export const BATTERIES = {
  lifepo4: { label: "LiFePO₄", usableDepth: 0.8 },
  lead: { label: "AGM / olovo", usableDepth: 0.5 }
};
