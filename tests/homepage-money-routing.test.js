import test from "node:test";
import assert from "node:assert/strict";

import { enhanceHomepageMoneyRouting, homepageMoneyLinks } from "../src/homepage-money-routing.js";

const PUBLIC_HOMES = [
  ["cs", "/", "/pruvodce/"],
  ["sk", "/sk/", "/sk/sprievodca/"],
  ["pl", "/pl/", "/pl/poradnik/"],
  ["hu", "/hu/", "/hu/utmutatok/"],
  ["pt", "/pt/", "/pt/guias/"],
  ["ro", "/ro/", "/ro/ghiduri/"],
  ["sl", "/si/", "/si/vodici/"],
];

test("each public homepage exposes six unique high-intent money-guide destinations", () => {
  for (const [lang, pathname, routePrefix] of PUBLIC_HOMES) {
    const links = homepageMoneyLinks({ lang, pathname });
    assert.equal(links.length, 6, `${lang} money-guide count`);
    assert.equal(new Set(links.map((item) => item.href)).size, 6, `${lang} unique routes`);
    for (const item of links) {
      assert.ok(item.href.startsWith(routePrefix), `${lang} route stays in market`);
      assert.ok(item.title.length > 8);
      assert.ok(item.description.length > 20);
    }
  }

  assert.deepEqual(homepageMoneyLinks({ lang: "cs", pathname: "/pruvodce/" }), []);
  assert.deepEqual(homepageMoneyLinks({ lang: "pt", pathname: "/pt/guias/" }), []);
  assert.deepEqual(homepageMoneyLinks({ lang: "ro", pathname: "/ro/ghiduri/" }), []);
  assert.deepEqual(homepageMoneyLinks({ lang: "sl", pathname: "/si/vodici/" }), []);
  assert.deepEqual(homepageMoneyLinks({ lang: "fr", pathname: "/fr/" }), []);
});

test("enhancer appends only missing money guides and is idempotent", () => {
  const existing = [
    "/pruvodce/kapacita-baterie-do-karavanu/",
    "/pruvodce/agm-vs-lifepo4/",
    "/pruvodce/kolik-w-solarnich-panelu/",
  ];
  const appended = [];
  const grid = {
    querySelectorAll(selector) {
      assert.equal(selector, "a[href]");
      return [...existing, ...appended.map((link) => link.href)].map((href) => ({ getAttribute: () => href }));
    },
    append(link) { appended.push(link); },
  };
  const root = {
    querySelector(selector) { return selector === ".guide-preview-grid" ? grid : null; },
    createElement(tag) {
      assert.equal(tag, "a");
      return { href: "", dataset: {}, innerHTML: "" };
    },
  };

  assert.equal(enhanceHomepageMoneyRouting({ root, lang: "cs", pathname: "/" }), 4);
  assert.deepEqual(appended.map((link) => link.href), [
    "/pruvodce/jak-vybrat-mppt-regulator/",
    "/pruvodce/jak-vybrat-dc-dc-nabijecku/",
    "/pruvodce/jak-vybrat-nabijecku-230-v/",
    "/pruvodce/jak-velky-menic-do-karavanu/",
  ]);
  assert.ok(appended.every((link) => Object.hasOwn(link.dataset, "moneyGuide")));
  assert.ok(appended.every((link) => link.innerHTML.includes("<h3>")));

  assert.equal(enhanceHomepageMoneyRouting({ root, lang: "cs", pathname: "/" }), 0);
  assert.equal(appended.length, 4);
});
