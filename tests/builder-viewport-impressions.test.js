import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bindAffiliateImpressionTracking } from "../src/affiliate-analytics.js";

function fixture() {
  const events = [];
  const docListeners = new Map();
  const rootListeners = new Map();
  const documentRoot = {
    hidden: false,
    addEventListener(type, cb) { docListeners.set(type, cb); },
    fire(type) { docListeners.get(type)?.(); },
  };
  const state = { links: [], consent: true };
  const observers = [];
  class Observer {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.watched = new Set();
      this.removed = [];
      observers.push(this);
    }
    observe(link) { this.watched.add(link); }
    unobserve(link) { this.watched.delete(link); this.removed.push(link); }
    emit(link, ratio) {
      this.callback([{target:link,isIntersecting:ratio>0,intersectionRatio:ratio}]);
    }
  }
  const root = {
    ownerDocument: documentRoot,
    querySelectorAll() { return state.links; },
    contains(link) { return state.links.includes(link); },
    addEventListener(type, cb) { rootListeners.set(type, cb); },
    fire(type, event) { rootListeners.get(type)?.(event); },
  };
  const track = (name, params) => {
    if (!state.consent) return false;
    events.push({name,params});
    return true;
  };
  const scan = bindAffiliateImpressionTracking(root, track, {Observer,documentRoot});
  const link = (id, category="battery") => {
    const value = {
      dataset: {productId:id,merchant:"vselektro",category,source:"package",recommendationRole:"recommended"},
      isConnected:true,
      expanded:true,
      closest() { return this.expanded ? null : {open:false}; },
    };
    return value;
  };
  assert.equal(observers.length,1);
  return {events,documentRoot,state,observers,observer:observers[0],root,scan,link};
}

test("rendering before result-step exposure is NOT a product-choice impression",()=>{
  const x=fixture();
  const product=x.link("panel-200");
  x.state.links=[product];
  x.scan();
  assert.deepEqual(x.events,[]);
  assert.equal(x.observer.watched.has(product),true);
  assert.deepEqual(x.observer.options.threshold,[0,0.5,1]);
  x.observer.emit(product,0.49);
  assert.equal(x.events.length,0);
  x.observer.emit(product,0.5);
  assert.deepEqual(x.events.map(e=>e.name),["product_choice_impression","product_choices_rendered"]);
  assert.equal(x.events[0].params.productId,"panel-200");
  assert.equal(x.events[1].params.productCount,1);
  x.observer.emit(product,1);
  x.scan();
  assert.equal(x.events.length,2,"one exposure per rendered link, even after a scan/scroll");
});

test("closed package alternatives are not counted until expanded and visible",()=>{
  const x=fixture();
  const recommended=x.link("recommended");
  const alternative=x.link("economy");
  alternative.expanded=false;
  x.state.links=[recommended,alternative];
  x.scan();
  x.observer.emit(alternative,1);
  assert.equal(x.events.length,0,"hidden alternative is not an exposure");
  x.observer.emit(recommended,0.6);
  assert.deepEqual(x.events.filter(e=>e.name==="product_choice_impression").map(e=>e.params.productId),["recommended"]);
  alternative.expanded=true;
  x.root.fire("toggle",{target:{open:true}});
  assert.deepEqual(x.events.filter(e=>e.name==="product_choice_impression").map(e=>e.params.productId),
    ["recommended","economy"]);
});

test("analytics denied at visibility time can track same exposure after consent",()=>{
  const x=fixture();
  const product=x.link("dc-charger");
  x.state.links=[product];
  x.state.consent=false;
  x.scan();
  x.observer.emit(product,0.8);
  assert.equal(x.events.length,0);
  assert.equal(product.dataset.affiliateImpressionTracked,undefined);
  x.state.consent=true;
  x.documentRoot.fire("mypowersetup:analytics-granted");
  assert.equal(x.events[0].name,"product_choice_impression");
  assert.equal(product.dataset.affiliateImpressionTracked,"true");
  x.documentRoot.fire("mypowersetup:analytics-granted");
  assert.equal(x.events.length,2);
});

test("background-tab exposure is deferred until the page becomes visible",()=>{
  const x=fixture();
  const product=x.link("battery");
  x.state.links=[product];
  x.scan();
  x.documentRoot.hidden=true;
  x.observer.emit(product,0.7);
  assert.equal(x.events.length,0);
  x.documentRoot.hidden=false;
  x.documentRoot.fire("visibilitychange");
  assert.equal(x.events.filter(e=>e.name==="product_choice_impression").length,1);
});

test("recalculation replaces old dynamic links and does not count detached stale offers",()=>{
  const x=fixture();
  const previous=x.link("old");
  const current=x.link("new");
  x.state.links=[previous];
  x.scan();
  x.observer.emit(previous,0.9);
  assert.equal(x.events.length,2);
  previous.isConnected=false;
  x.state.links=[current];
  x.scan();
  assert.deepEqual(x.observer.removed,[previous]);
  x.observer.emit(previous,0.9);
  assert.equal(x.events.length,2,"detached prior offer must not get an impression");
  x.observer.emit(current,0.9);
  assert.deepEqual(x.events.filter(e=>e.name==="product_choice_impression").map(e=>e.params.productId),["old","new"]);
});

test("no IntersectionObserver means no fabricated viewport impressions",()=>{
  const x=fixture();
  const trackCalls=[];
  const scan=bindAffiliateImpressionTracking(x.root,(...args)=>{trackCalls.push(args);return true;},{
    Observer:null,documentRoot:x.documentRoot,
  });
  assert.equal(scan(),false);
  assert.deepEqual(trackCalls,[]);
});

test("all four core Builders wire the observer-aware binder and versioned JavaScript",async()=>{
  for(const [locale,file,html] of [
    ["cs","src/app.js","index.html"],
    ["sk","src/app-sk.js","sk/index.html"],
    ["pl","src/app-pl.js","pl/index.html"],
    ["hu","src/app-hu-browser.js","hu/index.html"],
  ]) {
    const source=await readFile(file,"utf8");
    const page=await readFile(html,"utf8");
    assert.match(source,/bindAffiliateImpressionTracking\(document\.querySelector\("#product-recommendations"\),/);
    assert.match(source,/affiliate-analytics\.js\?v=20261108-viewport1/);
    assert.match(source,/trackVisibleProductChoices\(\);/);
    assert.ok(page.includes("20261108-click-evidence-builder4"),locale);
  }
});
