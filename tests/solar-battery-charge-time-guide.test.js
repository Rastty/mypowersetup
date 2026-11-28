import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {classifyGuideCalculatorLink} from "../src/analytics-links.js";
const route="/pruvodce/jak-dlouho-solarni-panel-nabiji-baterii/";
test("charge-time guide has distinct search metadata, complete model and real calculator destinations",async()=>{
 const html=await readFile(route.slice(1)+"index.html","utf8");
 const title=html.match(/<title>([^<]+)<\/title>/)[1],description=html.match(/<meta name="description" content="([^"]+)">/)[1];
 assert.ok(title.length>=35&&title.length<=60);assert.ok(description.length>=110&&description.length<=160);
 assert.match(html,/12,8 V/);assert.match(html,/640 Wh/);assert.match(html,/12,8 dne/);
 const main=html.match(/<article class="article">([\s\S]*?)<\/article>/)[1];assert.ok(main.replace(/<[^>]*>/g," ").trim().split(/\s+/).length>=1900);
 assert.equal((main.match(/<tr><th scope="row">/g)||[]).length,18);
 for(const href of ["/kalkulacky/solarni-panely/","/kalkulacky/mppt-regulator/","/kalkulacky/dc-dc-nabijecka/"]){assert.ok(html.includes('href="'+href+'"'));assert.ok(classifyGuideCalculatorLink(href));}
 for(const path of ["index.html","pruvodce/index.html","pruvodce/kolik-w-solarnich-panelu/index.html","pruvodce/lifepo4-100ah-nebo-200ah-karavan/index.html","pruvodce/spotreba-kompresorove-lednice/index.html","kalkulacky/solarni-panely/index.html"])assert.ok((await readFile(path,"utf8")).includes('href="'+route+'"'),path);
});
