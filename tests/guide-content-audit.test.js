import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("three Czech model scenarios have meaningful content and are in the sitemap", async()=>{
 const sitemap=await readFile("sitemap.xml","utf8");
 for(const slug of ["vikend-v-karavanu","rodinna-dovolena","prace-z-karavanu"]){
  const page=await readFile(`pruvodce/modelove-sestavy/${slug}/index.html`,"utf8");
  assert.match(page,/"dateModified":"2026-10-13"/);
  assert.match(page,/<h2>.*baterii/i);
  assert.match(page,/href="\/kalkulacky\//);
  assert.match(sitemap,new RegExp(`modelove-sestavy/${slug}/<\\/loc><lastmod>2026-10-13`));
 }
});
