import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const page = "pl/poradnik/ile-wat-paneli-solarnych-do-kampera/index.html";

test("Polish solar guide covers sizing and buyer intent", async () => {
  const html = await readFile(page, "utf8");
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
  const h1 = html.match(/<h1>([^<]+)<\/h1>/)?.[1] ?? "";

  assert.match(title, /Panel solarny do kampera/i);
  assert.match(title, /ile W/i);
  assert.match(title, /jaki zestaw/i);
  assert.match(h1, /Jaki panel solarny do kampera/i);
  assert.match(html, /id="zestaw"/);
  assert.match(html, /Panel stały, elastyczny czy przenośny\?/);
  assert.doesNotMatch(html, /[řěůčťďň]/i);
});
