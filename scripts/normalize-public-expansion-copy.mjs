import { readFile, writeFile } from "node:fs/promises";
import { expansionPublicationManifest, publicizeExpansionHtml } from "../src/expansion-publication.js";

// One-shot branch normalizer; removed after the generated public output is committed.
const markets = ["pt", "si", "ro"];
let changed = 0;
for (const market of markets) {
  for (const entry of expansionPublicationManifest(market)) {
    const before = await readFile(entry.path, "utf8");
    const after = publicizeExpansionHtml(before, market, entry.route, { home: entry.source === "home" });
    if (after !== before) {
      await writeFile(entry.path, after, "utf8");
      changed += 1;
    }
  }
}
console.log(JSON.stringify({ ready: true, changed }, null, 2));
