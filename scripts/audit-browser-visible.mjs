import { spawn, spawnSync } from "node:child_process";
import { readdir, readFile, writeFile, rm } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { join } from "node:path";

class CdpClient {
  static async connect(url) {
    const client = new CdpClient(url);
    await client.opened;
    return client;
  }

  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.socket = new WebSocket(url);
    this.opened = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(`CDP ${message.error.code}: ${message.error.message}`));
      else resolve(message.result || {});
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async close() {
    for (const { reject } of this.pending.values()) reject(new Error("CDP connection closed"));
    this.pending.clear();
    if (this.socket.readyState === WebSocket.CLOSED) return;
    const closed = new Promise((resolve) => this.socket.addEventListener("close", resolve, { once: true }));
    this.socket.close();
    await Promise.race([closed, delay(500)]);
  }
}


const origin = (process.env.MPS_PRODUCTION_URL || "https://mypowersetup.com").replace(/\/$/, "");
const profileDir = "/tmp/mps-browser-guide-audit-" + process.pid;
const chromeBin = findChrome();
const chrome = spawn(chromeBin, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
  "--no-first-run", "--no-default-browser-check", "--remote-allow-origins=*",
  "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0",
  "--user-data-dir=" + profileDir, "about:blank",
], {stdio:["ignore","pipe","pipe"]});
const chromeDiagnostics = captureDiagnostics(chrome);
const files = [];
async function collect(dir) {
  for (const item of await readdir(dir, {withFileTypes:true})) {
    if (item.name === "node_modules" || item.name === ".git") continue;
    const path=join(dir,item.name);
    if (item.isDirectory()) await collect(path);
    else if (item.isFile() && item.name === "index.html") files.push(path);
  }
}
await collect(".");
const routes=files.map(file=>file.replaceAll("\\","/").replace(/^\.\//,""))
  .map(file=>file==="index.html"?"/":"/"+file.slice(0,-"index.html".length))
  .sort((a,b)=>a.localeCompare(b));
const limit=Number(process.env.MPS_BROWSER_AUDIT_LIMIT || 0);
const targets=limit>0?routes.slice(0,limit):routes;
const hubs = new Set(["/pruvodce/","/pruvodce/modelove-sestavy/","/sk/sprievodca/","/pl/poradnik/","/hu/utmutatok/","/pt/guias/","/ro/ghiduri/","/si/vodici/"]);
const expression=String.raw`(() => {
  const main = document.querySelector("main") || document.body;
  const heading = document.querySelector("h1");
  function visible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;
    for (let parent=element; parent && parent.nodeType === 1; parent=parent.parentElement) {
      const style=getComputedStyle(parent);
      if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || Number(style.opacity) === 0) return false;
    }
    return true;
  }
  return {
    pathname: window.location.pathname,
    state: document.readyState,
    mainChars: (main?.innerText || "").trim().length,
    bodyChars: (document.body?.innerText || "").trim().length,
    mainVisible: visible(main),
    h1Visible: visible(heading),
    h1Text: (heading?.innerText || "").trim().slice(0,120),
    title: document.title || "",
    cssSheets: document.styleSheets.length,
    overflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
  };
})()`;
const report=[];
let client;
try {
  const port=await waitForDevToolsPort(profileDir,chrome,chromeDiagnostics);
  const target=await waitForChromeTarget(port,chrome,chromeDiagnostics);
  client=await CdpClient.connect(target.webSocketDebuggerUrl);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {width:390,height:844,deviceScaleFactor:1,mobile:true,screenWidth:390,screenHeight:844});
  for(const route of targets) {
    const issues=[],warnings=[];
    let snapshot=null;
    try {
      const navigated=await client.send("Page.navigate",{url:origin+route+"?mps_browser_audit=1"});
      if(navigated?.errorText)throw new Error(navigated.errorText);
      for(let tick=0; tick<65;tick++) {
        await delay(110);
        try {
          const evaluated=await evaluate(client,expression);
          if(evaluated?.pathname===route && evaluated?.state!=="loading") {
            snapshot=evaluated;
            if(evaluated.state==="complete" || tick>=8)break;
          }
        }catch {}
      }
      if(!snapshot)throw new Error("BROWSER_PAGE_NOT_READY");
      const guide=/^\/(?:pruvodce|sk\/sprievodca|pl\/poradnik|hu\/utmutatok|pt\/guias|ro\/ghiduri|si\/vodici)\//.test(route);
      const minChars=guide?(hubs.has(route)?150:500):50;
      if(!snapshot.mainVisible)issues.push("MAIN_NOT_VISIBLE");
      if(guide && !snapshot.h1Visible)issues.push("HEADING_NOT_VISIBLE");
      if(snapshot.mainChars<minChars)issues.push("RENDERED_TEXT_TOO_SHORT:"+snapshot.mainChars);
      if(snapshot.cssSheets<1)warnings.push("NO_STYLESHEETS");
      if(snapshot.overflowPx>100)warnings.push("MOBILE_HORIZONTAL_OVERFLOW:"+snapshot.overflowPx);
    } catch(error) {issues.push("BROWSER_NAVIGATION_OR_EVALUATION:"+String(error?.message||error));}
    report.push({route,issues,warnings,snapshot});
    if(report.length%25===0)console.log("BROWSER_VISIBLE_PROGRESS "+report.length+"/"+targets.length);
  }
} finally {
  if(client) await client.send("Browser.close").catch(()=>{});
  await client?.close().catch(()=>{});
  if(chrome.exitCode===null && chrome.signalCode===null)chrome.kill("SIGTERM");
  await waitForExit(chrome);
  await cleanupProfile(profileDir);
}
const errors=report.filter(x=>x.issues.length),warnings=report.filter(x=>x.warnings.length);
const output={origin,checked:targets.length,expected:routes.length,errors:errors.length,warnings:warnings.length,viewport:"390x844",issues:errors,warningsDetail:warnings};
console.log("BROWSER_VISIBLE_SUMMARY "+JSON.stringify({checked:output.checked,expected:output.expected,errors:output.errors,warnings:output.warnings}));
for(const row of errors)console.log("BROWSER_VISIBLE_ERROR "+JSON.stringify({route:row.route,issues:row.issues,snapshot:row.snapshot}));
for(const row of warnings)console.log("BROWSER_VISIBLE_WARNING "+JSON.stringify({route:row.route,warnings:row.warnings}));
await writeFile("browser-visible-report.json",JSON.stringify(output,null,2));
if(errors.length)process.exitCode=1;

function findChrome() {
  const candidates = [process.env.CHROME_BIN, "google-chrome", "google-chrome-stable", "chromium", "chromium-browser"].filter(Boolean);
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    if (result.status === 0) return candidate;
  }
  throw new Error(`PUBLIC_MOBILE_SMOKE_CHROME_NOT_FOUND:${candidates.join(",")}`);
}

function captureDiagnostics(child) {
  let output = "";
  const append = (chunk) => {
    output += String(chunk);
    if (output.length > 12000) output = output.slice(-12000);
  };
  child.stdout?.on("data", append);
  child.stderr?.on("data", append);
  return () => output.trim();
}

async function cleanupProfile(directory) {
  try {
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch (error) {
    console.warn(`Public mobile smoke passed; temporary Chrome profile cleanup was skipped: ${error?.code || error?.message || error}`);
  }
}

async function waitForHttp(url, child, diagnostics, label, attempts = 60) {
  for (let index = 0; index < attempts; index += 1) {
    if (child.exitCode !== null) throw new Error(`PUBLIC_MOBILE_SMOKE_${label}_EXITED:${child.exitCode}:${diagnostics()}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`PUBLIC_MOBILE_SMOKE_${label}_TIMEOUT:${url}:${diagnostics()}`);
}

async function waitForDevToolsPort(directory, child, diagnostics, attempts = 120) {
  const path = `${directory}/DevToolsActivePort`;
  for (let index = 0; index < attempts; index += 1) {
    if (child.exitCode !== null) throw new Error(`PUBLIC_MOBILE_SMOKE_CHROME_EXITED:${child.exitCode}:${diagnostics()}`);
    try {
      const [portText] = (await readFile(path, "utf8")).trim().split(/\r?\n/);
      const port = Number(portText);
      if (Number.isInteger(port) && port > 0) return port;
    } catch {}
    await delay(100);
  }
  throw new Error(`PUBLIC_MOBILE_SMOKE_DEVTOOLS_PORT_TIMEOUT:${path}:${diagnostics()}`);
}

async function waitForChromeTarget(port, child, diagnostics, attempts = 80) {
  for (let index = 0; index < attempts; index += 1) {
    if (child.exitCode !== null) throw new Error(`PUBLIC_MOBILE_SMOKE_CHROME_EXITED:${child.exitCode}:${diagnostics()}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const target = targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
        if (target) return target;
      }
    } catch {}
    await delay(100);
  }
  throw new Error(`PUBLIC_MOBILE_SMOKE_CHROME_TARGET_TIMEOUT:${port}:${diagnostics()}`);
}

async function waitFor(predicate, attempts = 80) {
  for (let index = 0; index < attempts; index += 1) {
    if (await predicate()) return;
    await delay(100);
  }
  throw new Error("PUBLIC_MOBILE_SMOKE_CONDITION_TIMEOUT");
}

async function evaluate(cdp, expression) {
  const response = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (response.exceptionDetails) throw new Error(`PUBLIC_MOBILE_SMOKE_EVALUATION_FAILED:${response.exceptionDetails.text || "unknown"}`);
  return response.result?.value;
}

function assert(condition, message) {
  if (!condition) throw new Error(`PUBLIC_MOBILE_SMOKE_ASSERT:${message}`);
}

function waitForExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => child.once("exit", resolve));
}
