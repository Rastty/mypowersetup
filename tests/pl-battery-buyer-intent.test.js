import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const page = "pl/poradnik/agm-czy-lifepo4/index.html";

test("Polish battery guide targets buyer intent without losing chemistry comparison", async () => {
  const html = await readFile(page, "utf8");
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
  const h1 = html.match(/<h1>([^<]+)<\/h1>/)?.[1] ?? "";
  const answer = html.match(/<div class="answer">([\s\S]*?)<\/div>/)?.[1] ?? "";

  assert.match(title, /^Jaki akumulator do kampera\?/);
  assert.match(title, /AGM/);
  assert.match(title, /LiFePO₄/);
  assert.equal(h1, "Jaki akumulator do kampera? AGM czy LiFePO₄");
  assert.match(answer, /href="\/pl\/poradnik\/pojemnosc-akumulatora-do-kampera\/"/);
});
