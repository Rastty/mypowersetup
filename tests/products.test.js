import test from "node:test";
import assert from "node:assert/strict";

import { parseProductFeed } from "../src/feed.js";
import { buildAffiliateUrl, normalizeProduct, recommendProducts } from "../src/products.js";

test("affiliate deeplink keeps the exact product destination", () => {
  const destination = "https://www.reslshop.cz/markyza-pro-obytne-dodavky-charly-charlyne/";
  const affiliate = new URL(buildAffiliateUrl("reslshop", destination));
  assert.equal(affiliate.hostname, "ehub.cz");
  assert.equal(affiliate.searchParams.get("a_bid"), "c38e2d15");
  assert.equal(affiliate.searchParams.get("desturl"), destination);
});

test("affiliate deeplink refuses a merchant homepage", () => {
  assert.throws(
    () => buildAffiliateUrl("svetkaravanu", "https://www.svetkaravanu.cz/"),
    /homepage/
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
