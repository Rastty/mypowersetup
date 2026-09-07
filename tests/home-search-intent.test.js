import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const cases = [
  ["index.html", "Kalkulačka baterie a soláru do karavanu | MyPowerSetup", "Kalkulačka baterie a soláru do karavanu: spočítejte kapacitu baterie, výkon panelů, měniče a MPPT regulátoru. Zdarma a s vysvětlením výpočtu."],
  ["sk/index.html", "Kalkulačka batérie a soláru do karavanu | MyPowerSetup", "Kalkulačka batérie a soláru do karavanu: vypočítajte kapacitu batérie, výkon panelov, meniča a MPPT regulátora. Zadarmo a s vysvetlením výpočtu."],
];

for (const [path, title, description] of cases) {
  test(path + " targets calculator + caravan search intent", async () => {
    const html = await readFile(path, "utf8");
    assert.ok(html.includes("<title>" + title + "</title>"));
    assert.equal(metaDescription(html), description);
    assert.ok(title.length >= 35 && title.length <= 60);
    assert.ok(description.length >= 110 && description.length <= 160);
  });
}

function metaDescription(html) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1];
    if (name?.toLowerCase() !== "description") continue;
    return tag.match(/\bcontent=["']([^"']*)["']/i)?.[1] || "";
  }
  return "";
}
