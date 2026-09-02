import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const guideRoots = ["pruvodce", "sk/sprievodca", "pl/poradnik", "hu/utmutatok"];

test("mature-market guide titles and descriptions fit useful search-snippet bounds", async () => {
  const titles = new Set();
  const descriptions = new Set();

  for (const root of guideRoots) {
    const entries = await readdir(root, { withFileTypes: true });
    const guideDirectories = entries.filter((entry) => entry.isDirectory());
    assert.equal(guideDirectories.length, 12, `${root} guide coverage changed`);

    for (const entry of guideDirectories) {
      const file = join(root, entry.name, "index.html");
      const html = await readFile(file, "utf8");
      const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
      const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1] ?? "";

      assert.ok(title.length >= 35 && title.length <= 60, `${file} title has ${title.length} characters`);
      assert.ok(description.length >= 110 && description.length <= 160, `${file} description has ${description.length} characters`);
      assert.ok(!titles.has(title), `${file} duplicates a guide title`);
      assert.ok(!descriptions.has(description), `${file} duplicates a guide description`);
      titles.add(title);
      descriptions.add(description);
    }
  }
});
