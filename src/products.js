import { calculatePowerStationProfile } from "./power-station.js";

const MERCHANTS = {
  reslshop: {
    hostname: "www.reslshop.cz",
    affiliateBaseUrl: "https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=c38e2d15",
    destinationParam: "desturl",
    currency: "CZK"
  },
  svetkaravanu: {
    hostname: "www.svetkaravanu.cz",
    affiliateBaseUrl: "https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=38137ac4",
    destinationParam: "desturl",
    currency: "CZK"
  },
  solarimport: {
    hostname: "www.solar-import.cz",
    affiliateBaseUrl: "https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=35cb7fb0",
    destinationParam: "desturl",
    currency: "CZK"
  },
  batterycz: {
    hostname: "www.battery.cz",
    affiliateBaseUrl: "https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=7095cb16",
    destinationParam: "desturl",
    currency: "CZK"
  },
  padabo: {
    hostname: "www.padabo.sk",
    affiliateBaseUrl: null,
    destinationParam: "desturl",
    currency: "EUR"
  },
  bluetti: {
    hostname: "www.bluettipower.com",
    affiliateBaseUrl: "https://www.dpbolvw.net/click-101869970-17110660",
    destinationParam: "url"
  },
  allpowers_pl: {
    hostname: "allpowers.com.pl",
    affiliateBaseUrl: "https://www.awin1.com/cread.php?awinmid=121776&awinaffid=3044971",
    destinationParam: "ued",
    productPathPrefix: "/products/",
    currency: "PLN"
  },
  allpowers_eu: {
    hostname: "iallpowers.eu",
    affiliateBaseUrl: "https://www.awin1.com/cread.php?awinmid=38934&awinaffid=3044971",
    destinationParam: "ued",
    productPathPrefix: "/products/",
    currency: "EUR"
  },
  powerqueen_us: {
    hostname: "ipowerqueen.com",
    affiliateBaseUrl: "https://www.awin1.com/cread.php?awinmid=97025&awinaffid=3044971",
    destinationParam: "ued",
    productPathPrefix: "/products/",
    currency: "USD"
  },
  powerqueen_eu: {
    hostname: "www.ipowerqueen.de",
    affiliateBaseUrl: "https://www.awin1.com/cread.php?awinmid=97025&awinaffid=3044971",
    destinationParam: "ued",
    productPathPrefix: "/en/products/",
    currency: "EUR"
  },
  ampul_cz: {
    hostname: "ampul.eu",
    affiliateBaseUrl: "https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=ddb5edae",
    destinationParam: "desturl",
    productPathPrefix: "/cs/",
    currency: "CZK"
  },
  ampul_sk: {
    hostname: "ampul.eu",
    affiliateBaseUrl: "https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=ddb5edae",
    destinationParam: "desturl",
    productPathPrefix: "/sk/",
    currency: "EUR"
  },
  ampul_pl: {
    hostname: "ampul.eu",
    affiliateBaseUrl: "https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=ddb5edae",
    destinationParam: "desturl",
    productPathPrefix: "/pl/",
    currency: "EUR"
  },
  ampul_hu: {
    hostname: "ampul.eu",
    affiliateBaseUrl: "https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=ddb5edae",
    destinationParam: "desturl",
    productPathPrefix: "/hu/",
    currency: "EUR"
  }
};

// Ampul's localized Google feeds currently repeat the 12 V title for every
// variant of product 5577. The product pages identify these exact combination
// IDs and their real DC input voltage; keeping the mapping here prevents a
// 24–84 V variant from ever being presented as a 12 V inverter.
const AMPUL_VERIFIED_INVERTER_VARIANTS = {
  "5577-7391": 12,
  "5577-7392": 24,
  "5577-7393": 36,
  "5577-7394": 48,
  "5577-7395": 60,
  "5577-7396": 72,
  "5577-7397": 84
};

const PRODUCT_TEXT = {
  cs: {
    batteryReason: (setup) => `Kapacita splňuje požadovaných ${setup.batteryAh} Ah`,
    panelReason: (product, setup) => `${product.recommendedQuantity} ks pokryjí požadovaných ${setup.solarWatts} Wp`,
    inverterReason: (setup) => `Trvalý výkon splňuje požadovaných ${setup.inverterWatts} W`,
    controllerReason: (setup) => `Proud splňuje požadovaných ${setup.controllerAmps} A`,
    dcChargerReason: (setup) => `Výstup pokrývá doporučených ${setup.charging.dcDc.suggestedCurrentAmps} A při jízdě`,
    shoreChargerReason: (setup) => `Výstup pokrývá doporučených ${setup.charging.shore.suggestedCurrentAmps} A z 230 V`,
    powerStationReason: () => "Kapacita, AC výstup, FV vstup a 12 V výstup splňují vypočtený profil",
    powerStationAt12V: "při 12 V",
    systemVoltage: "napětí sestavy",
    requirement: "Požadavek sestavy",
    batteryLead: "Olověná technologie",
    controllerFor: "Pro návrh panelů",
    chargerInput: "Vstup",
    lifepo4Profile: "Profil pro LiFePO₄",
    verify: {
      battery: "Ověřte rozměry, BMS, nabíjecí proud a svorky.",
      solar_panel: "Ověřte rozměry, Voc, Isc a způsob zapojení panelů.",
      inverter: "Ověřte špičkový výkon, čistý sinus, kabeláž a vlastní spotřebu.",
      controller: "Ověřte maximální Voc, Isc, FV výkon a profil baterie v datasheetu.",
      dc_charger: "Ověřte vstupní i výstupní napětí, podporu chytrého alternátoru, BMS, kabeláž, jištění a chlazení.",
      shore_charger: "Ověřte napětí, chemii baterie, nabíjecí profil, BMS, kabeláž a jištění.",
      power_station: "Ověřte rozběhový výkon spotřebičů, rozsah Voc panelů, konektory, souběžný provoz výstupů a aktuální dostupnost."
    }
  },
  sk: {
    batteryReason: (setup) => `Kapacita spĺňa požadovaných ${setup.batteryAh} Ah`,
    panelReason: (product, setup) => `${product.recommendedQuantity} ks pokryje požadovaných ${setup.solarWatts} Wp`,
    inverterReason: (setup) => `Trvalý výkon spĺňa požadovaných ${setup.inverterWatts} W`,
    controllerReason: (setup) => `Prúd spĺňa požadovaných ${setup.controllerAmps} A`,
    dcChargerReason: (setup) => `Výstup pokrýva odporúčaných ${setup.charging.dcDc.suggestedCurrentAmps} A počas jazdy`,
    shoreChargerReason: (setup) => `Výstup pokrýva odporúčaných ${setup.charging.shore.suggestedCurrentAmps} A z 230 V`,
    powerStationReason: () => "Kapacita, AC výstup, FV vstup a 12 V výstup spĺňajú vypočítaný profil",
    powerStationAt12V: "pri 12 V",
    systemVoltage: "napätie zostavy",
    requirement: "Požiadavka zostavy",
    batteryLead: "Olovená technológia",
    controllerFor: "Pre návrh panelov",
    chargerInput: "Vstup",
    lifepo4Profile: "Profil pre LiFePO₄",
    verify: {
      battery: "Overte rozmery, BMS, nabíjací prúd a svorky.",
      solar_panel: "Overte rozmery, Voc, Isc a spôsob zapojenia panelov.",
      inverter: "Overte špičkový výkon, čistý sínus, kabeláž a vlastnú spotrebu.",
      controller: "Overte maximálne Voc, Isc, FV výkon a profil batérie v datasheete.",
      dc_charger: "Overte vstupné aj výstupné napätie, podporu inteligentného alternátora, BMS, kabeláž, istenie a chladenie.",
      shore_charger: "Overte napätie, chémiu batérie, nabíjací profil, BMS, kabeláž a istenie.",
      power_station: "Overte rozbehový výkon spotrebičov, rozsah Voc panelov, konektory, súbežnú prevádzku výstupov a aktuálnu dostupnosť."
    }
  },
  pl: {
    batteryReason: (setup) => `Pojemność spełnia wymagane ${setup.batteryAh} Ah`,
    panelReason: (product, setup) => `${product.recommendedQuantity} szt. pokrywa wymagane ${setup.solarWatts} Wp`,
    inverterReason: (setup) => `Moc ciągła spełnia wymagane ${setup.inverterWatts} W`,
    controllerReason: (setup) => `Prąd spełnia wymagane ${setup.controllerAmps} A`,
    dcChargerReason: (setup) => `Wyjście pokrywa zalecane ${setup.charging.dcDc.suggestedCurrentAmps} A podczas jazdy`,
    shoreChargerReason: (setup) => `Wyjście pokrywa zalecane ${setup.charging.shore.suggestedCurrentAmps} A z 230 V`,
    powerStationReason: (profile) => `Pojemność, wyjście AC, wejście PV i wyjście 12 V spełniają obliczony profil`,
    powerStationAt12V: "przy 12 V",
    systemVoltage: "napięcie instalacji",
    requirement: "Wymaganie instalacji",
    batteryLead: "Technologia ołowiowa",
    controllerFor: "Dla projektu paneli",
    chargerInput: "Wejście",
    lifepo4Profile: "Profil dla LiFePO₄",
    verify: {
      battery: "Sprawdź wymiary, BMS, prąd ładowania i zaciski.",
      solar_panel: "Sprawdź wymiary, Voc, Isc i sposób połączenia paneli.",
      inverter: "Sprawdź moc szczytową, czystą sinusoidę, okablowanie i pobór własny.",
      controller: "Sprawdź maksymalne Voc, Isc, moc PV i profil akumulatora w dokumentacji.",
      dc_charger: "Sprawdź napięcie wejściowe i wyjściowe, obsługę inteligentnego alternatora, BMS, przewody, zabezpieczenia i chłodzenie.",
      shore_charger: "Sprawdź napięcie, chemię akumulatora, profil ładowania, BMS, przewody i zabezpieczenia.",
      power_station: "Sprawdź moc rozruchową urządzeń, zakres Voc paneli, złącza, równoczesną pracę wyjść oraz aktualną dostępność."
    }
  },
  hu: {
    batteryReason: (setup) => `A kapacitás eléri a szükséges ${setup.batteryAh} Ah értéket`,
    panelReason: (product, setup) => `${product.recommendedQuantity} db lefedi a szükséges ${setup.solarWatts} Wp teljesítményt`,
    inverterReason: (setup) => `A folyamatos teljesítmény eléri a szükséges ${setup.inverterWatts} W értéket`,
    controllerReason: (setup) => `Az áramerősség eléri a szükséges ${setup.controllerAmps} A értéket`,
    dcChargerReason: (setup) => `A kimenet menet közben biztosítja az ajánlott ${setup.charging.dcDc.suggestedCurrentAmps} A-t`,
    shoreChargerReason: (setup) => `A kimenet 230 V-os hálózatról biztosítja az ajánlott ${setup.charging.shore.suggestedCurrentAmps} A-t`,
    powerStationReason: () => "A kapacitás, az AC kimenet, a PV bemenet és a 12 V-os kimenet megfelel a számított profilnak",
    powerStationAt12V: "12 V-on",
    systemVoltage: "rendszerfeszültség",
    requirement: "A rendszer követelménye",
    batteryLead: "Ólomsavas technológia",
    controllerFor: "A napelemtervhez",
    chargerInput: "Bemenet",
    lifepo4Profile: "LiFePO₄ töltési profil",
    verify: {
      battery: "Ellenőrizd a méreteket, a BMS-t, a töltőáramot és a csatlakozókat.",
      solar_panel: "Ellenőrizd a méreteket, a Voc és Isc értékeket, valamint a napelemek kapcsolását.",
      inverter: "Ellenőrizd a csúcsteljesítményt, a tiszta szinuszt, a kábelezést és a saját fogyasztást.",
      controller: "Ellenőrizd a legnagyobb Voc és Isc értéket, a PV-teljesítményt és az akkumulátorprofilt az adatlapon.",
      dc_charger: "Ellenőrizd a bemeneti és kimeneti feszültséget, az intelligens generátor támogatását, a BMS-t, a kábelezést, a védelmet és a hűtést.",
      shore_charger: "Ellenőrizd a feszültséget, az akkumulátor kémiáját, a töltési profilt, a BMS-t, a kábelezést és a védelmet.",
      power_station: "Ellenőrizd a fogyasztók indítási teljesítményét, a napelemek Voc tartományát, a csatlakozókat, a kimenetek egyidejű használatát és az aktuális elérhetőséget."
    }
  }
};

export function configureMerchantAffiliate(merchantKey, affiliateBaseUrl) {
  const merchant = MERCHANTS[merchantKey];
  if (!merchant) throw new Error(`Neznámý obchod: ${merchantKey}`);
  const url = new URL(affiliateBaseUrl);
  if (url.protocol !== "https:" || url.hostname !== "ehub.sk") {
    throw new Error("Affiliate odkaz musí být platná HTTPS adresa na eHub.sk.");
  }
  merchant.affiliateBaseUrl = url.toString();
}

export function normalizeProduct(raw, merchantKey) {
  const merchant = MERCHANTS[merchantKey];
  if (!merchant) throw new Error(`Neznámý obchod: ${merchantKey}`);

  const productUrl = validateProductUrl(raw.url, merchant.hostname, merchant.productPathPrefix);
  let name = cleanText(raw.name);
  const categoryPath = cleanText(raw.category);
  const description = cleanText(raw.description);
  const fallbackText = [categoryPath, description].filter(Boolean).join(" ");
  const specs = extractSpecs(name, fallbackText);
  const ampulVariantVoltage = merchantKey.startsWith("ampul_")
    ? AMPUL_VERIFIED_INVERTER_VARIANTS[String(raw.id || "").trim()]
    : null;
  if (ampulVariantVoltage) {
    specs.voltageV = ampulVariantVoltage;
    specs.pureSine = true;
    name = name.replace(/-\s*12\s*V\s*DC\s*$/i, `- ${ampulVariantVoltage} V DC`);
  }
  if (/solární regulátory|solárne regulátory|napelemes töltésszabályozók|töltésszabályozók/i.test(categoryPath)) {
    specs.currentA = extractControllerCurrent(name, description);
  }

  return {
    id: `${merchantKey}:${String(raw.id || productUrl.pathname).trim()}`,
    merchant: merchantKey,
    name,
    description,
    categoryPath,
    category: classifyProduct({ name, categoryPath, specs }),
    brand: cleanText(raw.brand),
    priceCzk: parsePrice(raw.price),
    priceCurrency: parseCurrency(raw.price) || merchant.currency || null,
    available: normalizeAvailability(raw.available),
    productUrl: productUrl.toString(),
    affiliateUrl: buildAffiliateUrl(merchantKey, productUrl.toString()),
    imageUrl: normalizeImageUrl(raw.imageUrl),
    specs
  };
}

export function buildAffiliateUrl(merchantKey, productUrl) {
  const merchant = MERCHANTS[merchantKey];
  if (!merchant) throw new Error(`Neznámý obchod: ${merchantKey}`);
  if (!merchant.affiliateBaseUrl) {
    throw new Error(`Affiliate program pro ${merchantKey} ještě není nakonfigurován.`);
  }
  const destination = validateProductUrl(productUrl, merchant.hostname, merchant.productPathPrefix);
  const affiliateUrl = new URL(merchant.affiliateBaseUrl);
  affiliateUrl.searchParams.set(merchant.destinationParam || "desturl", destination.toString());
  return affiliateUrl.toString();
}

export function extractSpecs(primaryText = "", fallbackText = "") {
  const primary = cleanText(primaryText);
  const fallback = cleanText(fallbackText);
  return {
    voltageV: extractNominalVoltage(primary) ?? extractNominalVoltage(fallback),
    capacityAh: matchNumber(primary, /(\d+(?:[.,]\d+)?)\s*ah\b/i)
      ?? matchNumber(fallback, /(\d+(?:[.,]\d+)?)\s*ah\b/i),
    capacityWh: matchNumber(primary, /(\d+(?:[ \u00a0]\d{3})*(?:[.,]\d+)?)\s*wh\b/i)
      ?? matchNumber(fallback, /(\d+(?:[ \u00a0]\d{3})*(?:[.,]\d+)?)\s*wh\b/i),
    powerW: extractContinuousPower(primary) ?? extractContinuousPower(fallback),
    currentA: matchNumber(primary, /(\d+(?:[.,]\d+)?)\s*a\b/i)
      ?? matchNumber(fallback, /(\d+(?:[.,]\d+)?)\s*a\b/i),
    chargingVoltagesV: extractChargingVoltages(primary),
    chargingInputVoltagesV: extractChargingInputVoltages(primary),
    chargingBatteryTypes: extractChargingBatteryTypes(primary, fallback),
    batteryType: /lifepo4|lithium(?:-ion)?|lítium/i.test(`${primary} ${fallback}`)
      ? "lifepo4"
      : /\bagm\b|olov|gelov|\bgel\b/i.test(`${primary} ${fallback}`)
        ? "lead"
        : null,
    pureSine: /modifikovan[^\s]* (?:sinus|sínus)[^\s]*|módosított szinusz/i.test(`${primary} ${fallback}`)
      ? false
      : /čist[^\s]* (?:sinus|sínus)[^\s]*|czyst[^\s]* sinus[^\s]*|tiszta szinusz|pure sine|(?:sinusov|sínusov)[^\s]* (?:měnič|menič)|sinepower/i.test(`${primary} ${fallback}`)
        ? true
        : null,
    solarInputW: matchNumber(`${primary} ${fallback}`, /(?:wejście|wkład)\s+(?:fotowoltaiczne|solar(?:ne|ny))[^\d]{0,20}(\d+(?:[.,]\d+)?)\s*w\b/i),
    dcOutputA: matchNumber(`${primary} ${fallback}`, /(?:wyjście|gniazdo)[^\n]{0,40}12\s*v[^\d]{0,12}(\d+(?:[.,]\d+)?)\s*a\b/i)
  };
}

export function classifyProduct({ name = "", categoryPath = "", specs = {} } = {}) {
  const accessory = /\b(pouzdro|puzdro|obal|box|držák|držiak|rámeček|rámček|kabel|kábel|konektor|svorka|displej|ukazatel|modul|adaptér|průchodka|priechodka|spojler|ventil|etui|obudowa|uchwyt|rama|przewód|złącze|zacisk|wyświetlacz|wskaźnik|przelotka|wentyl|tok|keret|csatlakozó|kapocs|kijelző|jelző|átvezető|ventilátor)\b/i;
  const multiComponentBundle = /\b(set|sestava|zostava|kit)\b/i.test(name);
  const chargerPath = /nabíječky|nabíjačky|ładowarki|töltők/i.test(categoryPath);
  const chargerAccessory = /\b(usb|startér|štartér|powerbank|čidlo|snímač|ovládání|ovládanie|kabel|kábel|zástrčka|pohotovostní|indító|érzékelő|vezérlő|csatlakozó)\b/i.test(name);
  const explicitDcCharger = /\bdc\s*[-–]?\s*dc\b|posilovač nabíjení|posilňovač nabíjania|charge booster|nabíjecí booster|nabíjací booster|f\.?\s*alternátor|\b(?:z|zo|od)\s*(?:12|24|36|48)\s*v(?:\s*\/\s*(?:12|24|36|48)\s*v?)?\s*(?:na|do)\s*\d+(?:[.,]\d+)?\s*v\b|\b(?:12|24|36|48)\s*v(?:\s*\/\s*(?:12|24|36|48)\s*v?)?\s*[-–]?(?:ról|ről|tól|től)\s*\d+(?:[.,]\d+)?\s*v(?:\s*[-–]?(?:ra|re|ig))?/i.test(name);
  const explicitBatteryCharger = /nabíječ(?:ka|ky)|nabíjač(?:ka|ky)|ładowark\w*|battery charger|akkumulátor\s*töltő|akkumulátortöltő|\btöltő\b/i.test(name);

  if (/(?:stacja zasilania|power station)/i.test(`${name} ${categoryPath}`) && specs.capacityWh > 0 && specs.powerW > 0) {
    return "power_station";
  }

  if (explicitDcCharger && explicitBatteryCharger && !chargerAccessory && specs.currentA > 0 && specs.chargingVoltagesV?.length) {
    return "dc_charger";
  }
  if (chargerPath && explicitBatteryCharger && !explicitDcCharger && !chargerAccessory && !/solár|solar|integrovanou nabíječ|integrovanou nabíjač/i.test(name) && specs.currentA > 0 && specs.chargingVoltagesV?.length) {
    return "shore_charger";
  }
  if (multiComponentBundle) return "other";

  const isBattery =
    /\b(bateri\w*|batéri\w*|akumulátor|akumulator|lifepo4|lithium|litow\w*|agm)\b/i.test(name) &&
    !/vodovod|sprch|spotřební baterie|vodovodná batéria|príslušenstvo k batériám|příslušenství k bateriím/i.test(`${name} ${categoryPath}`) &&
    !/autobaterie|motobaterie|osobní auta|nákladní vozy|vše pro motorky|startovací baterie|startovací zdroje|akumulatory samochodowe|akumulatory motocyklowe|rozruchow\w*|packy pro ups|lifepo4 články|testery baterií|měření napětí|nabíječky|nabíjačky|nabíječe|ładowarki|töltők/i.test(categoryPath) &&
    !accessory.test(name) &&
    specs.capacityAh > 0;
  if (isBattery) return "battery";

  const isSolarPanel =
    (/\b(solární|solárny|fotovoltaický|fotovoltický)\s+(?:skládací\s+|skladací\s+|přenosný\s+|prenosný\s+)?panel\b/i.test(name)
      || /\b(?:portable\s+|foldable\s+|flexible\s+|monocrystalline\s+)?solar\s+panel\b/i.test(name)
      || /\bpanel(?:e)?\s+(?:słoneczn\w*|fotowoltaiczn\w*)\b|\b(?:słoneczn\w*|fotowoltaiczn\w*)\s+panel(?:e)?\b|\bnapelem(?:panel)?\b|\bfotovoltaikus\s+panel\b/i.test(name)) &&
    !accessory.test(name) &&
    specs.powerW > 0;
  if (isSolarPanel) return "solar_panel";

  const isInverter =
    /měniče napětí|meniče napätia|przetwornice napięcia|przekształtniki napięcia|feszültség\s*átalakítók/i.test(categoryPath) &&
    /(měnič|menič|invertor|inverter|przetwornic\w*|feszültség\s*átalakító|feszültségátalakító)/i.test(name) &&
    !accessory.test(name) &&
    (/\b230\s*v\s*ac\b/i.test(name) || specs.pureSine === true) &&
    specs.powerW > 0;
  if (isInverter) return "inverter";

  const isController =
    /solární regulátory|solárne regulátory|regulatory (?:solarne|ładowania)|napelemes töltésszabályozók|töltésszabályozók|battery charge controllers/i.test(categoryPath) &&
    /\bmppt\b/i.test(name) &&
    !accessory.test(name) &&
    specs.currentA > 0;
  if (isController) return "controller";

  return "other";
}

export function recommendProducts(products, setup, limitPerCategory = 3) {
  const candidates = products
    .map(refreshCatalogProduct)
    .filter((product) => product.available !== false)
    .map((product) => scoreProduct(product, setup))
    .filter(Boolean);

  return ["battery", "solar_panel", "inverter", "controller", "dc_charger", "shore_charger", "power_station"].reduce((result, category) => {
    const ranked = candidates
      .filter((candidate) => candidate.product.category === category)
      .sort((a, b) => b.score - a.score || a.product.priceCzk - b.product.priceCzk);
    result[category] = uniqueProductPages(ranked).slice(0, limitPerCategory);
    return result;
  }, {});
}

// Older generated catalogs may contain specs produced by an earlier parser.
// Refresh them from the stored source text so parser fixes take effect immediately,
// without waiting for the next successful merchant feed download.
export function refreshCatalogProduct(product) {
  const fallbackText = [product.categoryPath, product.description].filter(Boolean).join(" ");
  const extractedSpecs = extractSpecs(product.name, fallbackText);
  const specs = Object.fromEntries(
    Object.entries(extractedSpecs).map(([key, value]) => [key, value ?? product.specs?.[key] ?? null])
  );
  if (/solární regulátory|solárne regulátory|regulatory (?:solarne|ładowania)|napelemes töltésszabályozók|töltésszabályozók|battery charge controllers/i.test(product.categoryPath)) {
    specs.currentA = extractControllerCurrent(product.name, product.description);
  }
  return {
    ...product,
    specs,
    category: classifyProduct({ name: product.name, categoryPath: product.categoryPath, specs })
  };
}

function scoreProduct(product, setup) {
  const { specs } = product;
  if (!product.category || product.category === "other") return null;

  let fit = null;
  if (product.category === "battery") {
    if (!specs.voltageV) return null;
    if (specs.voltageV !== setup.systemVoltage) return null;
    if (!specs.capacityAh || specs.capacityAh < setup.batteryAh) return null;
    if (!specs.batteryType || specs.batteryType !== setup.batteryType) return null;
    fit = specs.capacityAh / setup.batteryAh;
  }
  if (product.category === "solar_panel") {
    if (!specs.powerW) return null;
    const quantity = Math.max(1, Math.ceil(setup.solarWatts / specs.powerW));
    if (quantity > 4) return null;
    fit = (specs.powerW * quantity) / setup.solarWatts;
    product = { ...product, recommendedQuantity: quantity };
  }
  if (product.category === "inverter") {
    if (!specs.voltageV) return null;
    if (specs.voltageV !== setup.systemVoltage) return null;
    if (!hasPureSineEvidence(product)) return null;
    if (!setup.inverterWatts || !specs.powerW || specs.powerW < setup.inverterWatts) return null;
    fit = specs.powerW / setup.inverterWatts;
  }
  if (product.category === "controller") {
    if (!/\bmppt\b/i.test(product.name)) return null;
    if (!specs.currentA || specs.currentA < setup.controllerAmps) return null;
    fit = specs.currentA / setup.controllerAmps;
  }
  if (product.category === "dc_charger" || product.category === "shore_charger") {
    const option = product.category === "dc_charger" ? setup.charging?.dcDc : setup.charging?.shore;
    if (!option?.suggestedCurrentAmps) return null;
    if (!specs.chargingVoltagesV?.includes(setup.systemVoltage)) return null;
    if (product.category === "dc_charger" && !specs.chargingInputVoltagesV?.includes(setup.charging.starterVoltage)) return null;
    if (!specs.chargingBatteryTypes?.includes(setup.batteryType)) return null;
    if (!specs.currentA || specs.currentA < option.suggestedCurrentAmps) return null;
    fit = specs.currentA / option.suggestedCurrentAmps;
  }
  if (product.category === "power_station") {
    const profile = calculatePowerStationProfile(setup);
    if (profile.profile === "individual") return null;
    if (!specs.capacityWh || specs.capacityWh < profile.capacityWh) return null;
    if (profile.acOutputWatts > 0 && (!specs.powerW || specs.powerW < profile.acOutputWatts)) return null;
    if (profile.solarInputWatts > 0 && (!specs.solarInputW || specs.solarInputW < profile.solarInputWatts)) return null;
    if (profile.dcOutputAmpsAt12V > 0 && (!specs.dcOutputA || specs.dcOutputA < profile.dcOutputAmpsAt12V)) return null;
    const ratios = [
      specs.capacityWh / profile.capacityWh,
      ...(profile.acOutputWatts > 0 ? [specs.powerW / profile.acOutputWatts] : []),
      ...(profile.solarInputWatts > 0 ? [specs.solarInputW / profile.solarInputWatts] : []),
      ...(profile.dcOutputAmpsAt12V > 0 ? [specs.dcOutputA / profile.dcOutputAmpsAt12V] : [])
    ];
    fit = Math.max(...ratios);
  }

  if (!fit || fit > 3) return null;
  const completeness = relevantSpecValues(product).filter((value) => value !== null).length;
  const fitScore = Math.max(0, 70 - Math.abs(1 - fit) * 35);
  const availabilityScore = product.available === true ? 15 : 5;
  const completenessScore = Math.min(15, completeness * 3);
  const quantityPenalty = product.category === "solar_panel"
    ? Math.max(0, (product.recommendedQuantity - 1) * 4)
    : 0;

  return {
    product,
    fit,
    score: Math.round(fitScore + availabilityScore + completenessScore - quantityPenalty),
    reason: recommendationReason(product, setup),
    checks: recommendationChecks(product, setup),
    verify: verificationNote(product.category, setup.locale)
  };
}

function relevantSpecValues(product) {
  if (product.category === "battery") {
    return [product.specs.voltageV, product.specs.capacityAh, product.specs.batteryType];
  }
  if (product.category === "solar_panel") return [product.specs.powerW];
  if (product.category === "inverter") {
    return [product.specs.voltageV, product.specs.powerW, product.specs.pureSine];
  }
  if (product.category === "dc_charger" || product.category === "shore_charger") {
    return [product.specs.currentA, product.specs.chargingVoltagesV, product.specs.chargingInputVoltagesV, product.specs.chargingBatteryTypes];
  }
  if (product.category === "power_station") {
    return [product.specs.capacityWh, product.specs.powerW, product.specs.solarInputW, product.specs.dcOutputA];
  }
  return [product.specs.currentA];
}

function hasPureSineEvidence(product) {
  if (product.specs.pureSine === false) return false;
  if (product.specs.pureSine === true) return true;
  return !/modifikovan[^\s]* (?:sinus|sínus)[^\s]*/i.test(product.name)
    && /čist[^\s]* (?:sinus|sínus)[^\s]*|czyst[^\s]* sinus[^\s]*|pure sine|(?:sinusov|sínusov)[^\s]* (?:měnič|menič)|sinepower/i.test(product.name);
}

function uniqueProductPages(candidates) {
  const seenPages = new Set();
  const seenProducts = new Set();
  return candidates.filter(({ product }) => {
    const identity = `${product.category}:${cleanText(product.name).toLocaleLowerCase("cs-CZ")}`;
    if (seenPages.has(product.productUrl) || seenProducts.has(identity)) return false;
    seenPages.add(product.productUrl);
    seenProducts.add(identity);
    return true;
  });
}

function recommendationReason(product, setup) {
  const text = PRODUCT_TEXT[setup.locale] || PRODUCT_TEXT.cs;
  if (product.category === "battery") return text.batteryReason(setup);
  if (product.category === "solar_panel") return text.panelReason(product, setup);
  if (product.category === "inverter") return text.inverterReason(setup);
  if (product.category === "dc_charger") return text.dcChargerReason(setup);
  if (product.category === "shore_charger") return text.shoreChargerReason(setup);
  if (product.category === "power_station") return text.powerStationReason(calculatePowerStationProfile(setup));
  return text.controllerReason(setup);
}

function recommendationChecks(product, setup) {
  const text = PRODUCT_TEXT[setup.locale] || PRODUCT_TEXT.cs;
  if (product.category === "battery") return [
    `${product.specs.capacityAh} Ah ≥ ${setup.batteryAh} Ah`,
    `${product.specs.voltageV} V = ${text.systemVoltage}`,
    product.specs.batteryType === "lifepo4" ? "LiFePO₄" : text.batteryLead
  ];
  if (product.category === "solar_panel") return [
    `${product.recommendedQuantity} × ${product.specs.powerW} Wp = ${product.recommendedQuantity * product.specs.powerW} Wp`,
    `${text.requirement}: ${setup.solarWatts} Wp`
  ];
  if (product.category === "inverter") return [
    `${product.specs.powerW} W ≥ ${setup.inverterWatts} W`,
    `${product.specs.voltageV} V = ${text.systemVoltage}`
  ];
  if (product.category === "dc_charger" || product.category === "shore_charger") {
    const required = product.category === "dc_charger"
      ? setup.charging.dcDc.suggestedCurrentAmps
      : setup.charging.shore.suggestedCurrentAmps;
    return [
      `${product.specs.currentA} A ≥ ${required} A`,
      `${setup.systemVoltage} V = ${text.systemVoltage}`,
      ...(product.category === "dc_charger" ? [`${text.chargerInput} ${setup.charging.starterVoltage} V`] : []),
      setup.batteryType === "lifepo4" ? text.lifepo4Profile : text.batteryLead
    ];
  }
  if (product.category === "power_station") {
    const profile = calculatePowerStationProfile(setup);
    return [
      `${product.specs.capacityWh} Wh ≥ ${profile.capacityWh} Wh`,
      `${product.specs.powerW} W ≥ ${profile.acOutputWatts} W AC`,
      `${product.specs.solarInputW} W ≥ ${profile.solarInputWatts} W PV`,
      `${product.specs.dcOutputA} A ≥ ${profile.dcOutputAmpsAt12V} A ${text.powerStationAt12V}`
    ];
  }
  return [
    `${product.specs.currentA} A ≥ ${setup.controllerAmps} A`,
    `${text.controllerFor} ${setup.solarWatts} Wp`
  ];
}

function verificationNote(category, locale) {
  const verify = (PRODUCT_TEXT[locale] || PRODUCT_TEXT.cs).verify;
  return verify[category] || verify.controller;
}

function validateProductUrl(value, hostname, productPathPrefix = null) {
  const url = new URL(value);
  const allowedHosts = new Set([hostname, hostname.replace(/^www\./, "")]);
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname)) {
    throw new Error(`Neplatná produktová URL pro ${hostname}`);
  }
  if (url.pathname === "/" || url.pathname === "") {
    throw new Error("Affiliate odkaz nesmí směřovat na homepage.");
  }
  if (productPathPrefix && !url.pathname.startsWith(productPathPrefix)) {
    throw new Error(`Affiliate odkaz musí směřovat na produktovou stránku ${productPathPrefix}.`);
  }
  url.hash = "";
  return url;
}

function normalizeImageUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizeAvailability(value) {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).trim();
  if (/^\d+$/.test(normalized)) return Number(normalized) >= 0;
  if (/back[ _-]?order|pre[ _-]?order/i.test(normalized)) return null;
  if (/out[ _-]?of[ _-]?stock|vyprodáno|vypredané|niedostępn|nincs készleten/i.test(normalized)) return false;
  return /skladem|na sklade|dostępn\w*|készleten|in[ _-]?stock|true/i.test(normalized);
}

function parsePrice(value) {
  const normalized = String(value ?? "").replace(/[^\d,.-]/g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCurrency(value) {
  const match = String(value ?? "").toUpperCase().match(/\b(CZK|EUR|PLN|USD|GBP|HUF|SEK)\b/);
  return match?.[1] || null;
}

function matchNumber(text, pattern) {
  const match = text.match(pattern);
  if (!match) return null;
  const parsed = parseLocalizedNumber(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractContinuousPower(text) {
  const continuousAndPeak = text.match(/(?:stálý|trvalý|jmenovitý)[^\d]{0,30}\b(\d+(?:[ \u00a0]\d{3})*(?:[.,]\d+)?)\s*\/\s*\d+(?:[ \u00a0]\d{3})*(?:[.,]\d+)?\s*w\b/i);
  if (continuousAndPeak) return parseLocalizedNumber(continuousAndPeak[1]);
  return matchNumber(text, /\b(\d+(?:[ \u00a0]\d{3})*(?:[.,]\d+)?)\s*(?:w|wp)\b/i)
    ?? matchNumber(text, /\bwp\)?\s*(\d+(?:[.,]\d+)?)/i);
}

function extractNominalVoltage(text) {
  const values = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*v\b/gi)]
    .map((match) => parseLocalizedNumber(match[1]))
    .filter(Number.isFinite);
  const exactNominals = values.filter((value) => [6, 8, 12, 24, 36, 48].includes(value));
  if (exactNominals.length) return exactNominals.at(-1);
  for (const measured of values) {
    if (measured >= 10 && measured < 16) return 12;
    if (measured >= 20 && measured < 32) return 24;
    if (measured >= 32 && measured < 44) return 36;
    if (measured >= 44 && measured < 58) return 48;
  }
  return null;
}

function extractChargingVoltages(primaryText) {
  const primary = cleanText(primaryText);
  const allowed = new Set([12, 24, 36, 48]);

  const directional = matchChargingDirection(primary);
  if (directional) return [normalizeSystemVoltage(directional.output)].filter(Boolean);

  const dualVoltage = primary.match(/\b(12|24|36|48)\s*v\s*[/]\s*(12|24|36|48)\s*v\b/i);
  if (dualVoltage) return [Number(dualVoltage[2])];

  const converterPair = primary.match(/\b(12|24|36|48)\s*[/]\s*(12|24|36|48)\s*[-/]\s*\d+(?:[.,]\d+)?\s*a\b/i);
  if (converterPair) return [Number(converterPair[2])];

  const primaryValues = [...primary.matchAll(/\b(12|24|36|48)\s*v\b/gi)].map((match) => Number(match[1]));
  return [...new Set(primaryValues.filter((value) => allowed.has(value)))];
}

function extractChargingInputVoltages(primaryText) {
  const primary = cleanText(primaryText);
  const directional = matchChargingDirection(primary);
  if (directional) return directional.inputs;
  const pair = primary.match(/\b(12|24|36|48)\s*v?\s*[/]\s*(12|24|36|48)(?:\s*v\b|\s*[-/]\s*\d+(?:[.,]\d+)?\s*a\b)/i);
  if (pair) return [Number(pair[1])];
  const single = primary.match(/\b(12|24|36|48)\s*v\b/i);
  return single ? [Number(single[1])] : [];
}

function matchChargingDirection(text) {
  const match = text.match(/\b(?:z|zo|od)\s*((?:12|24|36|48)\s*v(?:\s*\/\s*(?:12|24|36|48)\s*v?)?)\s*(?:na|do)\s*(\d+(?:[.,]\d+)?)\s*v\b/i)
    || text.match(/\b((?:12|24|36|48)\s*v(?:\s*\/\s*(?:12|24|36|48)\s*v?)?)\s*[-–]?(?:ról|ről|tól|től)\s*(\d+(?:[.,]\d+)?)\s*v(?:\s*[-–]?(?:ra|re|ig))?/i);
  if (!match) return null;
  return {
    inputs: [...new Set([...match[1].matchAll(/(12|24|36|48)\s*v?/gi)].map((value) => Number(value[1])))],
    output: parseLocalizedNumber(match[2])
  };
}

function normalizeSystemVoltage(value) {
  if ([12, 24, 36, 48].includes(value)) return value;
  if (value >= 10 && value < 16) return 12;
  if (value >= 20 && value < 32) return 24;
  if (value >= 32 && value < 44) return 36;
  if (value >= 44 && value < 60) return 48;
  return null;
}

function extractChargingBatteryTypes(primaryText, fallbackText) {
  const text = `${cleanText(primaryText)} ${cleanText(fallbackText)}`;
  const types = [];
  if (/lifepo4|lithium(?:-ion)?|lithiov|litow|lítium/i.test(text)) types.push("lifepo4");
  if (/\bagm\b|olov|ołowi|kwasow|gelov|żelow|ólom|zselé/i.test(text)) types.push("lead");
  return types;
}

function extractControllerCurrent(name, description) {
  const explicitInName = matchNumber(name, /(\d+(?:[.,]\d+)?)\s*a\b/i);
  if (explicitInName) return explicitInName;

  const model = name.match(/(?:mppt|smartsolar|bluesolar)[^\n]{0,80}?\b\d{2,3}\s*[\/-]\s*(\d{1,3})\b/i);
  if (model) return parseLocalizedNumber(model[1]);

  return matchNumber(
    description,
    /(?:nabíjecí|výstupní|max(?:imální)?\.?|töltőáram|kimeneti|maximális)[^\d]{0,24}(\d+(?:[.,]\d+)?)\s*a\b/i
  );
}

function parseLocalizedNumber(value) {
  return Number(String(value).replace(/[ \u00a0]/g, "").replace(",", "."));
}

function cleanText(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
