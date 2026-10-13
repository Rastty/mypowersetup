import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOTS = ["pruvodce", "sk/sprievodca", "pl/poradnik", "hu/utmutatok", "pt/guias", "ro/ghiduri", "si/vodici"];
const THRESHOLDS = Object.freeze({ empty: 300, thin: 1100, short: 1800 });
const strip = (html) => String(html)
  .replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<(nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&(?:nbsp|amp|quot|apos|lt|gt|#\d+|#x[0-9a-f]+);/gi, " ")
  .replace(/\s+/g, " ").trim();
async function walk(dir) {
  const result = [];
  for (const e of await readdir(dir, {withFileTypes:true})) {
    if (e.isDirectory()) result.push(...await walk(join(dir,e.name)));
    else if (e.isFile() && e.name === "index.html") result.push(join(dir,e.name));
  }
  return result;
}
const findings=[];
for (const root of ROOTS) {
  for (const file of await walk(root)) {
    const path=relative(".",file).replaceAll("\\","/");
    const html=await readFile(file,"utf8");
    const hub=path === root+"/index.html" || path==="pruvodce/modelove-sestavy/index.html";
    const body=html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || "";
    const main=body.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || body;
    const article=main.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] || main;
    const text=strip(article);
    const h1=(body.match(/<h1\b/gi)||[]).length;
    const h2=(article.match(/<h2\b/gi)||[]).length;
    const paragraphs=(article.match(/<p\b/gi)||[]).length;
    const anchor=(body.match(/<a\b[^>]*href=/gi)||[]).length;
    const canonical=html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)/i)?.[1] || null;
    const placeholder=/\b(lorem ipsum|coming soon|placeholder|připravujeme|wkrótce|hamarosan)\b/i.test(text) || /\\bTODO\\b/.test(text);
    const status=!h1 || !canonical || !body.trim() || text.length < THRESHOLDS.empty ? "empty_or_broken"
      : !hub && (text.length < THRESHOLDS.thin || h2 < 2 || paragraphs < 4 || placeholder) ? "thin"
      : !hub && text.length < THRESHOLDS.short ? "short" : "ok";
    findings.push({path,hub,status,textChars:text.length,words:text.split(/\s+/).filter(Boolean).length,h1,h2,paragraphs,links:anchor,canonical,placeholder});
  }
}
findings.sort((a,b)=>a.textChars-b.textChars);
const counts={};
for(const row of findings) counts[row.status]=(counts[row.status]||0)+1;
const report={generatedAt:new Date().toISOString(),total:findings.length,counts,thresholds:THRESHOLDS,findings};
if(process.argv.includes("--json")) console.log(JSON.stringify(report,null,2));
else {
 console.log("GUIDE_AUDIT_SUMMARY "+JSON.stringify({total:report.total,counts:report.counts}));
 for(const row of findings) console.log("GUIDE_AUDIT_ROW "+JSON.stringify(row));
}
if(process.argv.includes("--strict") && (counts.empty_or_broken || counts.thin)) process.exitCode=1;
