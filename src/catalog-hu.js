export const APPLIANCES = [
  {
    id: "fridge",
    name: "Kompresszoros hűtőszekrény",
    description: "A kompresszor átlagos működési ideje, nem 24 óra teljes teljesítménnyel",
    icon: "❄️",
    watts: 45,
    hours: 8,
    quantity: 1,
    ac: false,
    surge: 2.5
  },
  {
    id: "lights",
    name: "LED-világítás",
    description: "Több energiatakarékos lámpa esti használatra",
    icon: "💡",
    watts: 20,
    hours: 5,
    quantity: 1,
    ac: false,
    surge: 1
  },
  {
    id: "phones",
    name: "Telefonok és táblagép",
    description: "Napi két szokásos töltés",
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
    description: "Munka, tanulás vagy szórakozás",
    icon: "💻",
    watts: 65,
    hours: 4,
    quantity: 1,
    ac: true,
    surge: 1
  },
  {
    id: "tv",
    name: "Televízió",
    description: "Kisebb LED-televízió",
    icon: "📺",
    watts: 60,
    hours: 3,
    quantity: 1,
    ac: true,
    surge: 1.2
  },
  {
    id: "coffee",
    name: "Kávéfőző",
    description: "Rövid működési idő, de nagy teljesítményfelvétel",
    icon: "☕",
    watts: 1000,
    hours: 0.15,
    quantity: 1,
    ac: true,
    surge: 1.1
  },
  {
    id: "pump",
    name: "Vízszivattyú",
    description: "Zuhany, mosogató és napi higiénia",
    icon: "🚿",
    watts: 60,
    hours: 0.5,
    quantity: 1,
    ac: false,
    surge: 2
  },
  {
    id: "cpap",
    name: "CPAP-készülék",
    description: "Egész éjszakai működés párásítófűtés nélkül",
    icon: "🌙",
    watts: 40,
    hours: 8,
    quantity: 1,
    ac: true,
    surge: 1.2
  },
  {
    id: "ebike",
    name: "Elektromos kerékpár töltése",
    description: "Egy akkumulátor részleges feltöltése",
    icon: "🚲",
    watts: 180,
    hours: 3,
    quantity: 1,
    ac: true,
    surge: 1
  },
  {
    id: "tools",
    name: "Elektromos szerszámok",
    description: "Fúrógép vagy kisebb műhelygép",
    icon: "🛠️",
    watts: 600,
    hours: 0.5,
    quantity: 1,
    ac: true,
    surge: 2
  },
  {
    id: "custom",
    name: "Egyéni készülék",
    description: "Add meg az adattábla vagy a használati útmutató adatait",
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
  summer: { label: "Nyár", peakSunHours: 4.5 },
  shoulder: { label: "Tavasz / ősz", peakSunHours: 3 },
  winter: { label: "Tél", peakSunHours: 1.5 }
};

export const BATTERIES = {
  lifepo4: { label: "LiFePO₄", usableDepth: 0.8 },
  lead: { label: "AGM / ólom-savas", usableDepth: 0.5 }
};
