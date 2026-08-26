export const APPLIANCES = [
  {
    id: "fridge",
    name: "Lodówka kompresorowa",
    description: "Uśredniony czas pracy sprężarki, nie 24 h z pełną mocą",
    icon: "❄️",
    watts: 45,
    hours: 8,
    quantity: 1,
    ac: false,
    surge: 2.5
  },
  {
    id: "lights",
    name: "Oświetlenie LED",
    description: "Kilka energooszczędnych lamp używanych wieczorem",
    icon: "💡",
    watts: 20,
    hours: 5,
    quantity: 1,
    ac: false,
    surge: 1
  },
  {
    id: "phones",
    name: "Telefony i tablet",
    description: "Dwa standardowe ładowania dziennie",
    icon: "📱",
    watts: 20,
    hours: 3,
    quantity: 1,
    ac: false,
    surge: 1
  },
  {
    id: "laptop",
    name: "Laptop",
    description: "Praca, nauka lub rozrywka",
    icon: "💻",
    watts: 65,
    hours: 4,
    quantity: 1,
    ac: true,
    surge: 1
  },
  {
    id: "tv",
    name: "Telewizor",
    description: "Mniejszy telewizor LED",
    icon: "📺",
    watts: 60,
    hours: 3,
    quantity: 1,
    ac: true,
    surge: 1.2
  },
  {
    id: "coffee",
    name: "Ekspres do kawy",
    description: "Krótki czas pracy, ale wysoki pobór mocy",
    icon: "☕",
    watts: 1000,
    hours: 0.15,
    quantity: 1,
    ac: true,
    surge: 1.1
  },
  {
    id: "pump",
    name: "Pompa wody",
    description: "Prysznic, zlew i codzienna higiena",
    icon: "🚿",
    watts: 60,
    hours: 0.5,
    quantity: 1,
    ac: false,
    surge: 2
  },
  {
    id: "cpap",
    name: "Aparat CPAP",
    description: "Praca przez całą noc bez podgrzewania",
    icon: "🌙",
    watts: 40,
    hours: 8,
    quantity: 1,
    ac: true,
    surge: 1.2
  },
  {
    id: "ebike",
    name: "Ładowanie roweru elektrycznego",
    description: "Częściowe naładowanie jednego akumulatora",
    icon: "🚲",
    watts: 180,
    hours: 3,
    quantity: 1,
    ac: true,
    surge: 1
  },
  {
    id: "tools",
    name: "Elektronarzędzia",
    description: "Wiertarka lub mniejsza maszyna warsztatowa",
    icon: "🛠️",
    watts: 600,
    hours: 0.5,
    quantity: 1,
    ac: true,
    surge: 2
  },
  {
    id: "custom",
    name: "Własne urządzenie",
    description: "Uzupełnij dane z tabliczki znamionowej lub instrukcji",
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
  summer: { label: "Lato", peakSunHours: 4.5 },
  shoulder: { label: "Wiosna / jesień", peakSunHours: 3 },
  winter: { label: "Zima", peakSunHours: 1.5 }
};

export const BATTERIES = {
  lifepo4: { label: "LiFePO₄", usableDepth: 0.8 },
  lead: { label: "AGM / kwasowo-ołowiowy", usableDepth: 0.5 }
};
