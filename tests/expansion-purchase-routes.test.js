import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("expansion recommendations separate component and portable purchase routes", async () => {
  const [source, styles] = await Promise.all([
    readFile("src/expansion-calculator-browser.js", "utf8"),
    readFile("styles.css", "utf8"),
  ]);

  assert.match(source, /item\.category !== "power_station"/);
  assert.match(source, /item\.category === "power_station"/);
  assert.match(source, /data-purchase-route="components"/);
  assert.match(source, /data-purchase-route="portable"/);
  assert.match(source, /Instalação por componentes/);
  assert.match(source, /Instalație din componente/);
  assert.match(source, /Sistem iz posameznih komponent/);
  assert.match(styles, /\.expansion-purchase-route\.is-portable/);
});
