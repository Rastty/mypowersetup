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
  assert.match(source, /expansionPurchaseRoutePriority/);
  assert.match(source, /data-purchase-route-priority=/);
  assert.match(source, /data-route-priority=/);
  assert.match(source, /data-purchase-route-priority-note/);
  assert.match(source, /purchase_route_prioritized/);
  assert.match(source, /Instalação por componentes/);
  assert.match(source, /Instalație din componente/);
  assert.match(source, /Sistem iz posameznih komponent/);
  assert.match(styles, /\.expansion-purchase-route\.is-portable/);
  assert.match(styles, /\.expansion-purchase-route\.is-portable\.is-priority/);
  assert.match(styles, /\.purchase-route-priority-note/);
});


test("localized copy explains why portable route moves first", async () => {
  const source = await readFile("src/expansion-calculator-browser.js", "utf8");
  assert.match(source, /A estação portátil abaixo cobre o perfil completo verificado e aparece primeiro/);
  assert.match(source, /Stația portabilă de mai jos acoperă profilul complet verificat și este afișată prima/);
  assert.match(source, /Spodnja prenosna elektrarna pokriva celoten preverjeni profil, zato je prikazana prva/);
});
