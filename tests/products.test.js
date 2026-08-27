import test from "node:test";
import assert from "node:assert/strict";

import { parseProductFeed } from "../src/feed.js";
import { buildAffiliateUrl, configureMerchantAffiliate, normalizeProduct, recommendProducts, refreshCatalogProduct } from "../src/products.js";

test("affiliate deeplink keeps the exact product destination", () => {
  const destination = "https://www.reslshop.cz/markyza-pro-obytne-dodavky-charly-charlyne/";
  const affiliate = new URL(buildAffiliateUrl("reslshop", destination));
  assert.equal(affiliate.hostname, "ehub.cz");
  assert.equal(affiliate.searchParams.get("a_bid"), "c38e2d15");
  assert.equal(affiliate.searchParams.get("desturl"), destination);
});

test("CJ deeplink keeps BLUETTI tracking and the exact product destination", () => {
  const destination = "https://www.bluettipower.com/products/ac200l";
  const affiliate = new URL(buildAffiliateUrl("bluetti", destination));
  assert.equal(affiliate.hostname, "www.dpbolvw.net");
  assert.equal(affiliate.pathname, "/click-101869970-17110660");
  assert.equal(affiliate.searchParams.get("url"), destination);
  assert.equal(affiliate.searchParams.has("desturl"), false);
});

test("CJ deeplink rejects a non-BLUETTI destination and a merchant homepage", () => {
  assert.throws(
    () => buildAffiliateUrl("bluetti", "https://example.com/products/ac200l"),
    /Neplatná produktová URL/
  );
  assert.throws(
    () => buildAffiliateUrl("bluetti", "https://www.bluettipower.com/"),
    /homepage/
  );
});

test("Awin deeplink keeps ALLPOWERS PL tracking and exact product destination", () => {
  const destination = "https://allpowers.com.pl/products/allpowers-r1500-lite-stacja-zasilania-1600w-1056wh-akumulator-lifep04";
  const affiliate = new URL(buildAffiliateUrl("allpowers_pl", destination));

  assert.equal(affiliate.hostname, "www.awin1.com");
  assert.equal(affiliate.pathname, "/cread.php");
  assert.equal(affiliate.searchParams.get("awinmid"), "121776");
  assert.equal(affiliate.searchParams.get("awinaffid"), "3044971");
  assert.equal(affiliate.searchParams.get("ued"), destination);
});

test("ALLPOWERS PL deeplink rejects other hosts and non-product pages", () => {
  assert.throws(
    () => buildAffiliateUrl("allpowers_pl", "https://example.com/products/r1500-lite"),
    /Neplatná produktová URL/
  );
  assert.throws(
    () => buildAffiliateUrl("allpowers_pl", "https://allpowers.com.pl/collections/power-stations"),
    /produktovou stránku/
  );
});

test("ALLPOWERS power station is recommended only when every verified limit fits", () => {
  const product = normalizeProduct({
    id: "r1500-lite",
    name: "ALLPOWERS R1500 LITE Stacja Zasilania 1600W 1056Wh Akumulator LiFePO4",
    category: "Stacje zasilania",
    description: "Wejście solarne 650 W. Wyjście 12 V 10 A. Czysta sinusoida.",
    price: "2119",
    url: "https://allpowers.com.pl/products/allpowers-r1500-lite-stacja-zasilania-1600w-1056wh-akumulator-lifep04",
    available: true
  }, "allpowers_pl");
  const setup = {
    locale: "pl",
    dailyWh: 600,
    autonomyDays: 1,
    solarWatts: 300,
    inverterWatts: 1000,
    applianceRows: [{ watts: 60, quantity: 1, ac: false }],
    systemVoltage: 12,
    batteryAh: 100,
    batteryType: "lifepo4",
    controllerAmps: 30,
    charging: { starterVoltage: 12, dcDc: {}, shore: {} }
  };

  assert.equal(product.category, "power_station");
  assert.equal(product.specs.capacityWh, 1056);
  assert.equal(product.specs.solarInputW, 650);
  assert.equal(product.specs.dcOutputA, 10);
  assert.deepEqual(
    recommendProducts([product], setup).power_station.map(({ product: match }) => match.id),
    ["allpowers_pl:r1500-lite"]
  );

  assert.equal(
    recommendProducts([product], { ...setup, solarWatts: 700 }).power_station.length,
    0
  );
  assert.equal(
    recommendProducts([product], { ...setup, applianceRows: [{ watts: 132, quantity: 1, ac: false }] }).power_station.length,
    0
  );
});

test("new Czech merchant deeplinks preserve exact Solar-import and Battery.cz products", () => {
  const solarDestination = "https://www.solar-import.cz/off-grid/victron-energy-dc-dc-konvertor-orion-ip67-24-12-10/";
  const batteryDestination = "https://www.battery.cz/skyrich-lithium-motobaterie-hjtz5s-fp--12v-24wh--2ah/";
  const solar = new URL(buildAffiliateUrl("solarimport", solarDestination));
  const battery = new URL(buildAffiliateUrl("batterycz", batteryDestination));

  assert.equal(solar.hostname, "ehub.cz");
  assert.equal(solar.searchParams.get("a_bid"), "35cb7fb0");
  assert.equal(solar.searchParams.get("desturl"), solarDestination);
  assert.equal(battery.hostname, "ehub.cz");
  assert.equal(battery.searchParams.get("a_bid"), "7095cb16");
  assert.equal(battery.searchParams.get("desturl"), batteryDestination);
});

test("Battery.cz starter and motorcycle batteries are excluded from caravan recommendations", () => {
  const motorcycle = normalizeProduct({
    id: "moto",
    name: "Skyrich Lithium motobaterie 12V 2Ah",
    category: "Heureka.cz | Auto-moto | Vše pro motorky | Motobaterie",
    url: "https://www.battery.cz/skyrich-lithium-motobaterie-12v-2ah/",
    available: true
  }, "batterycz");
  const leisure = normalizeProduct({
    id: "leisure",
    name: "LiFePO4 baterie 12V 100Ah",
    category: "TRAKČNÍ BATERIE | VOLNÝ ČAS",
    url: "https://www.battery.cz/lifepo4-baterie-12v-100ah/",
    available: true
  }, "batterycz");

  assert.equal(motorcycle.category, "other");
  assert.equal(leisure.category, "battery");
});

test("unsupported 8V traction batteries and multi-component sets are not presented as 12V batteries", () => {
  const eightVolt = normalizeProduct({
    id: "8v",
    name: "Trakční baterie Trojan T 875, 170Ah, 8V",
    category: "TRAKČNÍ BATERIE | PRŮMYSLOVÉ",
    description: "Nabíjecí napětí soustavy 12V.",
    url: "https://www.battery.cz/trakcni-baterie-trojan-t-875/",
    available: true
  }, "batterycz");
  const set = normalizeProduct({
    id: "set",
    name: "Solární sestava pro karavan 55Wp + baterie 45Ah",
    category: "Heureka.cz | Dílna, stavba, zahrada | Fotovoltaika | Solární sestavy",
    url: "https://www.solar-import.cz/solarni-sestava-pro-karavan/",
    available: true
  }, "solarimport");

  assert.equal(eightVolt.specs.voltageV, 8);
  assert.equal(set.category, "other");
});

test("battery matcher requires evidenced chemistry and treats gel as lead", () => {
  const unknown = normalizeProduct({
    id: "unknown",
    name: "Trakční baterie 12V 120Ah",
    category: "TRAKČNÍ BATERIE | VOLNÝ ČAS",
    url: "https://www.battery.cz/trakcni-baterie-12v-120ah/",
    available: true
  }, "batterycz");
  const gel = normalizeProduct({
    id: "gel",
    name: "Trakční gelová baterie 12V 120Ah",
    category: "TRAKČNÍ BATERIE | VOLNÝ ČAS",
    url: "https://www.battery.cz/trakcni-gelova-baterie-12v-120ah/",
    available: true
  }, "batterycz");
  const setup = {
    locale: "cs",
    systemVoltage: 12,
    batteryAh: 100,
    batteryType: "lead",
    solarWatts: 200,
    inverterWatts: 0,
    controllerAmps: 20,
    charging: { starterVoltage: 12, dcDc: {}, shore: {} }
  };
  const recommended = recommendProducts([unknown, gel], setup);

  assert.equal(unknown.specs.batteryType, null);
  assert.equal(gel.specs.batteryType, "lead");
  assert.deepEqual(recommended.battery.map(({ product }) => product.id), ["batterycz:gel"]);
});

test("identical products from shared merchant catalogs are shown only once", () => {
  const first = normalizeProduct({
    id: "first",
    name: "LiFePO4 baterie 12V 100Ah",
    category: "BATERIE | LITHIOVÉ",
    price: "10000",
    url: "https://www.solar-import.cz/lifepo4-baterie-12v-100ah/",
    available: true
  }, "solarimport");
  const second = normalizeProduct({
    id: "second",
    name: "LiFePO4 baterie 12V 100Ah",
    category: "BATERIE | LITHIOVÉ",
    price: "11000",
    url: "https://www.battery.cz/lifepo4-baterie-12v-100ah/",
    available: true
  }, "batterycz");
  const setup = {
    locale: "cs",
    systemVoltage: 12,
    batteryAh: 100,
    batteryType: "lifepo4",
    solarWatts: 200,
    inverterWatts: 0,
    controllerAmps: 20,
    charging: { starterVoltage: 12, dcDc: {}, shore: {} }
  };

  assert.equal(recommendProducts([first, second], setup).battery.length, 1);
});

test("numeric Heureka delivery time remains orderable", () => {
  const product = normalizeProduct({
    id: "delivery",
    name: "LiFePO4 baterie 12V 100Ah",
    category: "BATERIE | LITHIOVÉ",
    url: "https://www.solar-import.cz/lifepo4-baterie-12v-100ah/",
    available: "14"
  }, "solarimport");

  assert.equal(product.available, true);
});

test("affiliate deeplink refuses a merchant homepage", () => {
  assert.throws(
    () => buildAffiliateUrl("svetkaravanu", "https://www.svetkaravanu.cz/"),
    /homepage/
  );
});

test("Padabo stays disabled until approved eHub.sk tracking is configured", () => {
  assert.throws(
    () => buildAffiliateUrl("padabo", "https://www.padabo.sk/solarny-panel-200-w/"),
    /není nakonfigurován/
  );
  assert.throws(
    () => configureMerchantAffiliate("padabo", "https://example.com/click"),
    /eHub\.sk/
  );
  configureMerchantAffiliate(
    "padabo",
    "https://ehub.sk/system/scripts/click.php?a_aid=test&a_bid=program"
  );
  const affiliate = new URL(
    buildAffiliateUrl("padabo", "https://www.padabo.sk/solarny-panel-200-w/")
  );
  assert.equal(affiliate.hostname, "ehub.sk");
  assert.equal(
    affiliate.searchParams.get("desturl"),
    "https://www.padabo.sk/solarny-panel-200-w/"
  );
});

test("Heureka XML is normalized and technical values are extracted", () => {
  const xml = `
    <SHOP><SHOPITEM>
      <ITEM_ID>bat-200</ITEM_ID>
      <PRODUCTNAME><![CDATA[LiFePO4 baterie 12 V 200 Ah]]></PRODUCTNAME>
      <DESCRIPTION>Trakční lithium baterie pro karavan</DESCRIPTION>
      <URL>https://www.reslshop.cz/baterie-12v-200ah/</URL>
      <PRICE_VAT>18990</PRICE_VAT>
      <DELIVERY_DATE>0</DELIVERY_DATE>
    </SHOPITEM></SHOP>`;
  const [product] = parseProductFeed(xml, "reslshop");
  assert.equal(product.category, "battery");
  assert.equal(product.specs.voltageV, 12);
  assert.equal(product.specs.capacityAh, 200);
  assert.equal(product.specs.batteryType, "lifepo4");
  assert.equal(product.available, true);
});

test("charger classifier separates explicit DC-DC and 230V battery chargers", () => {
  const dcDc = normalizeProduct({
    id: "orion",
    name: "DC-DC nabíječka Orion-Tr Smart 12/12-18A",
    category: "Elektro pro karavany | Nabíječky, boostery",
    description: "Nabíjecí profily pro LiFePO4, AGM a gelové baterie.",
    url: "https://www.reslshop.cz/orion-12-12-18a/",
    available: true
  }, "reslshop");
  const shore = normalizeProduct({
    id: "shore",
    name: "Inteligentní nabíječka baterií 12 V / 20 A",
    category: "Elektro pro karavany | Nabíječky, boostery",
    description: "Pro LiFePO4, AGM a gelové baterie.",
    url: "https://www.reslshop.cz/nabijecka-12v-20a/",
    available: true
  }, "reslshop");
  const usb = normalizeProduct({
    id: "usb",
    name: "USB nabíječka 12 V / 20 A",
    category: "Elektro pro karavany | Nabíječky, boostery",
    url: "https://www.reslshop.cz/usb-nabijecka/",
    available: true
  }, "reslshop");

  assert.equal(dcDc.category, "dc_charger");
  assert.deepEqual(dcDc.specs.chargingVoltagesV, [12]);
  assert.deepEqual(dcDc.specs.chargingInputVoltagesV, [12]);
  assert.equal(shore.category, "shore_charger");
  assert.deepEqual(shore.specs.chargingVoltagesV, [12]);
  assert.equal(usb.category, "other");
});

test("charger matcher requires calculated current and exact battery voltage", () => {
  const products = [
    normalizeProduct({
      id: "dc-fit",
      name: "Renogy nabíječka DC-DC 12V/30A",
      category: "Elektro pro karavany | Nabíječky, boostery",
      description: "Nabíjecí profily pro LiFePO4, AGM a gelové baterie.",
      url: "https://www.reslshop.cz/dc-fit/",
      available: true
    }, "reslshop"),
    normalizeProduct({
      id: "dc-wrong-voltage",
      name: "DC-DC nabíječka 24V/30A",
      category: "Elektro pro karavany | Nabíječky, boostery",
      description: "Nabíjecí profily pro LiFePO4, AGM a gelové baterie.",
      url: "https://www.reslshop.cz/dc-wrong-voltage/",
      available: true
    }, "reslshop"),
    normalizeProduct({
      id: "shore-fit",
      name: "Inteligentní nabíječka baterií 12V/20A",
      category: "Elektro pro karavany | Nabíječky, boostery",
      description: "Nabíjecí profily pro LiFePO4, AGM a gelové baterie.",
      url: "https://www.reslshop.cz/shore-fit/",
      available: true
    }, "reslshop")
  ];
  const recommendations = recommendProducts(products, {
    locale: "cs",
    systemVoltage: 12,
    batteryAh: 100,
    batteryType: "lifepo4",
    solarWatts: 300,
    inverterWatts: 800,
    controllerAmps: 30,
    charging: {
      starterVoltage: 12,
      dcDc: { suggestedCurrentAmps: 20 },
      shore: { suggestedCurrentAmps: 10 }
    }
  });

  assert.deepEqual(recommendations.dc_charger.map(({ product }) => product.id), ["reslshop:dc-fit"]);
  assert.deepEqual(recommendations.shore_charger.map(({ product }) => product.id), ["reslshop:shore-fit"]);
  assert.match(recommendations.dc_charger[0].verify, /chytrého alternátoru/);
});

test("DC-DC matcher rejects a charger with the wrong starter-system input voltage", () => {
  const converter = normalizeProduct({
    id: "48-to-12",
    name: "DC-DC nabíječka 48/12-30A",
    category: "Elektro pro karavany | Nabíječky, boostery",
    description: "Nabíjecí profily pro LiFePO4, AGM a gelové baterie.",
    url: "https://www.reslshop.cz/48-to-12/",
    available: true
  }, "reslshop");
  const recommendations = recommendProducts([converter], {
    locale: "cs",
    systemVoltage: 12,
    batteryAh: 100,
    batteryType: "lifepo4",
    solarWatts: 300,
    inverterWatts: 800,
    controllerAmps: 30,
    charging: {
      starterVoltage: 12,
      dcDc: { suggestedCurrentAmps: 20 },
      shore: { suggestedCurrentAmps: 10 }
    }
  });
  assert.equal(recommendations.dc_charger.length, 0);
});

test("matcher rejects incompatible voltage and ranks a fitting battery", () => {
  const products = [
    normalizeProduct({
      id: "12v",
      name: "LiFePO4 baterie 12 V 200 Ah",
      url: "https://www.reslshop.cz/baterie-12v-200ah/",
      price: 19000,
      available: true
    }, "reslshop"),
    normalizeProduct({
      id: "24v",
      name: "LiFePO4 baterie 24 V 200 Ah",
      url: "https://www.reslshop.cz/baterie-24v-200ah/",
      price: 25000,
      available: true
    }, "reslshop")
  ];
  const recommendations = recommendProducts(products, {
    systemVoltage: 12,
    batteryAh: 180,
    batteryType: "lifepo4",
    solarWatts: 400,
    inverterWatts: 1000,
    controllerAmps: 40
  });
  assert.equal(recommendations.battery.length, 1);
  assert.equal(recommendations.battery[0].product.id, "reslshop:12v");
  assert.deepEqual(recommendations.battery[0].checks, [
    "200 Ah ≥ 180 Ah",
    "12 V = napětí sestavy",
    "LiFePO₄"
  ]);
  assert.match(recommendations.battery[0].verify, /BMS/);
});

test("matcher never presents an undersized battery as compatible", () => {
  const battery = normalizeProduct({
    id: "undersized",
    name: "LiFePO4 baterie 12 V 160 Ah",
    url: "https://www.reslshop.cz/baterie-12v-160ah/",
    available: true
  }, "reslshop");
  const recommendations = recommendProducts([battery], {
    systemVoltage: 12,
    batteryAh: 180,
    batteryType: "lifepo4",
    solarWatts: 400,
    inverterWatts: 1000,
    controllerAmps: 40
  });
  assert.equal(recommendations.battery.length, 0);
});

test("classifier rejects a water faucet and battery accessories", () => {
  const faucet = normalizeProduct({
    id: "faucet",
    name: "Vodovodní baterie se sprchou Reich EHM Carino Duett",
    category: "Voda | Sprchy pro karavan | Vysouvací sprchy",
    url: "https://www.svetkaravanu.cz/vodovodni-baterie_z152/"
  }, "svetkaravanu");
  const box = normalizeProduct({
    id: "box",
    name: "Box na baterie s krytem",
    description: "Vhodný pro akumulátory do 100 Ah",
    category: "Elektro | Baterie | Příslušenství k bateriím",
    url: "https://www.svetkaravanu.cz/box-na-baterie_z200/"
  }, "svetkaravanu");
  assert.equal(faucet.category, "other");
  assert.equal(box.category, "other");
});

test("classifier rejects solar holders and MPPT enclosures", () => {
  const holder = normalizeProduct({
    id: "holder",
    name: "Nastavitelný držák solárního panelu EcoFlow",
    description: "Pro panely do 400 W",
    category: "Elektro | Solární panely | Držáky",
    url: "https://www.svetkaravanu.cz/drzak-panelu_z300/"
  }, "svetkaravanu");
  const enclosure = normalizeProduct({
    id: "wirebox",
    name: "Pouzdro na solární regulátor Victron MPPT WireBox-M",
    description: "Pro regulátor 50 A",
    category: "Elektro | Solární regulátory",
    url: "https://www.svetkaravanu.cz/pouzdro-mppt_z301/"
  }, "svetkaravanu");
  assert.equal(holder.category, "other");
  assert.equal(enclosure.category, "other");
});

test("classifier excludes PWM controllers from MPPT recommendations", () => {
  const pwm = normalizeProduct({
    id: "pwm-30",
    name: "PWM solární regulátor 30 A",
    description: "Maximální nabíjecí proud 30 A.",
    category: "Elektro | Solární regulátory",
    url: "https://www.svetkaravanu.cz/pwm-regulator_z302/"
  }, "svetkaravanu");
  assert.equal(pwm.category, "other");
});

test("classifier accepts products only with their required technical value", () => {
  const panel = normalizeProduct({
    id: "panel",
    name: "Skládací solární panel Carbest SC200 200 W",
    category: "Elektro | Solární panely | Fotovoltaické panely",
    url: "https://www.svetkaravanu.cz/solarni-panel-200w_z400/"
  }, "svetkaravanu");
  const inverter = normalizeProduct({
    id: "inverter",
    name: "Sinusový měnič Dometic SinePower stálý / špičkový výkon 1000/2000 W",
    category: "Elektro | Měniče napětí",
    url: "https://www.svetkaravanu.cz/menic-1000w_z401/"
  }, "svetkaravanu");
  assert.equal(panel.category, "solar_panel");
  assert.equal(panel.specs.powerW, 200);
  assert.equal(inverter.category, "inverter");
  assert.equal(inverter.specs.powerW, 1000);
});

test("product title takes precedence over conflicting description values", () => {
  const panel = normalizeProduct({
    id: "panel-135",
    name: "Solární panel Phaesun Sun Plus (Wp) 135",
    description: "Produktová řada je dostupná také ve variantě 45 W.",
    category: "Elektro | Solární panely | Fotovoltaické panely",
    url: "https://www.svetkaravanu.cz/phaesun-135_z500/"
  }, "svetkaravanu");
  assert.equal(panel.category, "solar_panel");
  assert.equal(panel.specs.powerW, 135);
});

test("MPPT model suffix is used as controller current", () => {
  const controller = normalizeProduct({
    id: "mppt-100-50",
    name: "Solární regulátor Victron SmartSolar MPPT 100/50",
    description: "V nabídce jsou také regulátory s proudem 30 A.",
    category: "Elektro | Solární regulátory",
    url: "https://www.svetkaravanu.cz/victron-100-50_z501/"
  }, "svetkaravanu");
  assert.equal(controller.category, "controller");
  assert.equal(controller.specs.currentA, 50);
});

test("controller model number is not mistaken for amperage", () => {
  const controller = normalizeProduct({
    id: "suncontrol-2",
    name: "Solární regulátor Dometic NDS SunControl 2",
    description: "Maximální nabíjecí proud 20 A.",
    category: "Elektro | Solární regulátory",
    url: "https://www.svetkaravanu.cz/suncontrol-2_z502/"
  }, "svetkaravanu");
  assert.equal(controller.specs.currentA, 20);
});

test("decimal lithium voltage is normalized to nominal system voltage", () => {
  const battery = normalizeProduct({
    id: "lifepo-128",
    name: "LiFePO4 baterie 12,8 V 100 Ah",
    category: "Elektro | Baterie",
    url: "https://www.svetkaravanu.cz/lifepo4-128v_z503/"
  }, "svetkaravanu");
  assert.equal(battery.specs.voltageV, 12);
});

test("nominal battery voltage is found after charging voltages in description", () => {
  const battery = normalizeProduct({
    id: "gel-130",
    name: "Gelová baterie Victron Energy VRLA GEL kapacita 130 Ah",
    description: "Doporučené nabíjecí napětí 14,2–14,6 V. Pracovní napětí: 12 V.",
    category: "Elektro | Baterie | Gelové baterie",
    url: "https://www.svetkaravanu.cz/gelova-baterie_z508/"
  }, "svetkaravanu");
  assert.equal(battery.specs.voltageV, 12);
});

test("a 6 V battery is never normalized to a 12 V system", () => {
  const battery = normalizeProduct({
    id: "six-volt",
    name: "Solární AGM baterie 6 V kapacita 200 Ah",
    description: "Nabíjecí soustava může obsahovat další 12 V komponenty.",
    category: "Elektro | Baterie | AGM baterie",
    url: "https://www.svetkaravanu.cz/six-volt_z519/",
    available: true
  }, "svetkaravanu");

  assert.equal(battery.specs.voltageV, 6);
  const recommendations = recommendProducts([battery], {
    systemVoltage: 12,
    batteryAh: 200,
    batteryType: "lead",
    solarWatts: 200,
    inverterWatts: 800,
    controllerAmps: 20
  });
  assert.equal(recommendations.battery.length, 0);
});

test("panel operating voltage does not exclude it from a 12 V MPPT system", () => {
  const panel = normalizeProduct({
    id: "panel-vmp-205",
    name: "Skládací solární panel Carbest HC130 – 130 W",
    description: "Jmenovité napětí Vmp: 20,5 V. Napětí otevřeného obvodu Voc: 24 V.",
    category: "Elektro | Solární panely a příslušenství | Přenosné solární sady",
    url: "https://www.svetkaravanu.cz/panel-hc130_z509/",
    available: true
  }, "svetkaravanu");
  const recommendations = recommendProducts([panel], {
    systemVoltage: 12,
    batteryAh: 100,
    batteryType: "lifepo4",
    solarWatts: 250,
    inverterWatts: 800,
    controllerAmps: 30
  });
  assert.equal(recommendations.solar_panel.length, 1);
  assert.equal(recommendations.solar_panel[0].product.recommendedQuantity, 2);
});

test("stored catalog products are refreshed with the current parser before ranking", () => {
  const stored = {
    id: "svetkaravanu:gel-130",
    merchant: "svetkaravanu",
    name: "Gelová baterie Victron Energy VRLA GEL kapacita 130 Ah",
    description: "Nabíjecí napětí 14,2 V. Pracovní napětí: 12 V.",
    categoryPath: "Elektro | Baterie | Gelové baterie",
    category: "battery",
    available: true,
    productUrl: "https://www.svetkaravanu.cz/gelova-baterie_z510/",
    affiliateUrl: "https://ehub.cz/example",
    specs: { voltageV: null, capacityAh: 130, batteryType: "lead" }
  };
  const refreshed = refreshCatalogProduct(stored);
  assert.equal(refreshed.specs.voltageV, 12);
  const recommendations = recommendProducts([stored], {
    systemVoltage: 12,
    batteryAh: 120,
    batteryType: "lead",
    solarWatts: 200,
    inverterWatts: 800,
    controllerAmps: 20
  });
  assert.equal(recommendations.battery.length, 1);
});

test("compact catalog keeps previously extracted specs when the excerpt omits them", () => {
  const product = refreshCatalogProduct({
    name: "Victron Energy měnič",
    description: "Krátký katalogový výpis bez technických parametrů.",
    categoryPath: "Elektro pro karavany | Měniče napětí",
    specs: {
      voltageV: 12,
      capacityAh: null,
      powerW: 1200,
      currentA: null,
      batteryType: null,
      pureSine: true
    }
  });

  assert.equal(product.specs.voltageV, 12);
  assert.equal(product.specs.powerW, 1200);
  assert.equal(product.specs.pureSine, true);
  assert.equal(product.category, "inverter");
});

test("selected inverter variant voltage wins over shared 12/24 V family text", () => {
  const inverter = normalizeProduct({
    id: "dpsi-24",
    name: "Měnič Dometic SinePower DPSI 12 V nebo 24 V výkon 1000 W napětí 24 V",
    category: "Elektro | Měniče napětí",
    url: "https://www.svetkaravanu.cz/dpsi-24_z511/",
    available: true
  }, "svetkaravanu");
  assert.equal(inverter.specs.voltageV, 24);
  const recommendations = recommendProducts([inverter], {
    systemVoltage: 12,
    batteryAh: 100,
    batteryType: "lifepo4",
    solarWatts: 200,
    inverterWatts: 800,
    controllerAmps: 20
  });
  assert.equal(recommendations.inverter.length, 0);
});

test("irrelevant incidental specs do not boost battery ranking", () => {
  const base = {
    name: "LiFePO4 baterie 12 V 100 Ah",
    category: "Elektro | Baterie",
    available: true
  };
  const products = [
    normalizeProduct({ ...base, id: "expensive", description: "BMS 100 A, displej 5 W", price: 20000, url: "https://www.svetkaravanu.cz/battery-expensive_z512/" }, "svetkaravanu"),
    normalizeProduct({ ...base, id: "fair", price: 15000, url: "https://www.svetkaravanu.cz/battery-fair_z513/" }, "svetkaravanu")
  ];
  const recommendations = recommendProducts(products, {
    systemVoltage: 12,
    batteryAh: 100,
    batteryType: "lifepo4",
    solarWatts: 200,
    inverterWatts: 800,
    controllerAmps: 20
  });
  assert.equal(recommendations.battery[0].product.id, "svetkaravanu:fair");
});

test("zero-watt and VA-only inverters are excluded until watts are known", () => {
  const inverter = normalizeProduct({
    id: "va-only",
    name: "Měnič napětí Victron Phoenix 250 VA",
    description: "Spotřeba v režimu ECO je 0 W.",
    category: "Elektro | Měniče napětí",
    url: "https://www.svetkaravanu.cz/phoenix-250va_z504/"
  }, "svetkaravanu");
  assert.equal(inverter.category, "other");
  assert.equal(inverter.priceCzk, null);
});

test("matcher only recommends an inverter with evidenced pure sine output", () => {
  const modified = normalizeProduct({
    id: "modified",
    name: "Měnič napětí 12 V 1000 W s modifikovanou sinusoidou",
    category: "Elektro | Měniče napětí",
    url: "https://www.svetkaravanu.cz/menic-modifikovany_z505/",
    available: true
  }, "svetkaravanu");
  const recommendations = recommendProducts([modified], {
    systemVoltage: 12,
    batteryAh: 100,
    batteryType: "lifepo4",
    solarWatts: 200,
    inverterWatts: 800,
    controllerAmps: 20
  });
  assert.equal(modified.specs.pureSine, false);
  assert.equal(recommendations.inverter.length, 0);
});

test("matcher avoids impractical arrays of many tiny panels", () => {
  const tiny = normalizeProduct({
    id: "tiny-panel",
    name: "Solární panel 25 W",
    category: "Elektro | Solární panely",
    url: "https://www.svetkaravanu.cz/tiny-panel_z507/",
    available: true
  }, "svetkaravanu");
  const recommendations = recommendProducts([tiny], {
    systemVoltage: 12,
    batteryAh: 100,
    batteryType: "lifepo4",
    solarWatts: 250,
    inverterWatts: 800,
    controllerAmps: 30
  });
  assert.equal(recommendations.solar_panel.length, 0);
});

test("matcher rejects an inverter with unknown system voltage", () => {
  const inverter = normalizeProduct({
    id: "unknown-voltage",
    name: "Sinusový měnič 1000 W",
    category: "Elektro | Měniče napětí",
    url: "https://www.svetkaravanu.cz/menic-bez-napeti_z505/",
    available: true
  }, "svetkaravanu");
  const recommendations = recommendProducts([inverter], {
    systemVoltage: 12,
    batteryAh: 100,
    batteryType: "lifepo4",
    solarWatts: 200,
    inverterWatts: 800,
    controllerAmps: 20
  });
  assert.equal(recommendations.inverter.length, 0);
});

test("matcher shows only the best variant for one product page", () => {
  const sharedUrl = "https://www.svetkaravanu.cz/sinepower-varianty_z506/";
  const products = [
    normalizeProduct({
      id: "variant-1500",
      name: "Sinusový měnič 12 V 1500 W",
      category: "Elektro | Měniče napětí",
      url: sharedUrl,
      price: 15000,
      available: true
    }, "svetkaravanu"),
    normalizeProduct({
      id: "variant-1000",
      name: "Sinusový měnič 12 V 1000 W",
      category: "Elektro | Měniče napětí",
      url: sharedUrl,
      price: 12000,
      available: true
    }, "svetkaravanu")
  ];
  const recommendations = recommendProducts(products, {
    systemVoltage: 12,
    batteryAh: 100,
    batteryType: "lifepo4",
    solarWatts: 200,
    inverterWatts: 1000,
    controllerAmps: 20
  });
  assert.equal(recommendations.inverter.length, 1);
  assert.equal(recommendations.inverter[0].product.id, "svetkaravanu:variant-1000");
});

test("product recommendation explanations support Slovak locale", () => {
  const battery = normalizeProduct({
    id: "sk-battery",
    name: "LiFePO4 batéria 12 V 100 Ah",
    category: "Elektro | Batérie",
    url: "https://www.svetkaravanu.cz/sk-battery_z514/",
    available: true
  }, "svetkaravanu");
  const recommendations = recommendProducts([battery], {
    locale: "sk",
    systemVoltage: 12,
    batteryAh: 100,
    batteryType: "lifepo4",
    solarWatts: 200,
    inverterWatts: 800,
    controllerAmps: 20
  });
  assert.match(recommendations.battery[0].reason, /Kapacita spĺňa/);
  assert.match(recommendations.battery[0].checks[1], /napätie zostavy/);
  assert.match(recommendations.battery[0].verify, /Overte rozmery/);
});

test("classifier recognizes Slovak Padabo category and product wording", () => {
  const battery = normalizeProduct({
    id: "sk-lifepo4",
    name: "LiFePO4 batéria 12 V 150 Ah",
    category: "Elektro pre karavany | Batérie",
    url: "https://www.svetkaravanu.cz/sk-lifepo4_z515/"
  }, "svetkaravanu");
  const panel = normalizeProduct({
    id: "sk-panel",
    name: "Skladací solárny panel 200 W",
    category: "Solárne panely",
    url: "https://www.svetkaravanu.cz/sk-panel_z516/"
  }, "svetkaravanu");
  const inverter = normalizeProduct({
    id: "sk-inverter",
    name: "Sínusový menič 12 V 1000 W pure sine",
    category: "Elektro | Meniče napätia",
    url: "https://www.svetkaravanu.cz/sk-inverter_z517/"
  }, "svetkaravanu");
  const controller = normalizeProduct({
    id: "sk-controller",
    name: "Solárny regulátor MPPT 100/30",
    category: "Elektro | Solárne regulátory",
    url: "https://www.svetkaravanu.cz/sk-controller_z518/"
  }, "svetkaravanu");
  assert.deepEqual(
    [battery.category, panel.category, inverter.category, controller.category],
    ["battery", "solar_panel", "inverter", "controller"]
  );
});
