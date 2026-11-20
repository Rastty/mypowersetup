import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assessPagesDeployment, successfulDescendantCandidates, waitForPagesDeployment } from "./wait-for-pages-deployment.mjs";

const SHA = "a".repeat(40);
const DESCENDANT_SHA = "b".repeat(40);
const PAGES_PATH = "dynamic/pages/pages-build-deployment";
const goodRun = (changes = {}) => ({
  id: 111, name: "pages build and deployment", path: PAGES_PATH,
  head_branch: "main", head_sha: SHA, status: "completed", conclusion: "success", ...changes,
});
const options = {repo: "Rastty/mypowersetup", sha: SHA, token: "INJECTED_TEST_TOKEN", sleep: async () => {}, intervalMs: 0};

function mockedRuns(sequence, comparison) {
  const calls = [];
  let count = 0;
  const fetchImpl = async (url, opts) => {
    calls.push({url,opts});
    if (url.includes("/compare/")) return {
      ok: comparison?.http ? false : true, status: comparison?.http || 200,
      json: async () => comparison || {status:"diverged",ahead_by:1,behind_by:1},
    };
    const value = sequence[Math.min(count++, sequence.length - 1)];
    return {ok: value?.http ? false : true, status: value?.http || 200,
      json: async () => ({workflow_runs: value?.runs || []})};
  };
  return {fetchImpl,calls};
}

test("release barrier rejects another SHA, wrong branch or similarly named non-Pages workflow", () => {
  for (const run of [
    goodRun({head_sha:"b".repeat(40)}), goodRun({head_branch:"feature"}),
    goodRun({path:".github/workflows/other.yml"}),goodRun({name:"pages build"}),
  ]) assert.equal(assessPagesDeployment([run],SHA).status,"waiting");
  assert.deepEqual(assessPagesDeployment([goodRun()],SHA),{status:"verified",runId:111});
});

test("matching latest deployment must succeed; running or cancelled deployments do not verify", () => {
  assert.equal(assessPagesDeployment([goodRun({status:"in_progress",conclusion:null})],SHA).status,"waiting");
  for (const conclusion of ["failure","cancelled","timed_out","action_required"]) {
    const inspected = assessPagesDeployment([goodRun({conclusion})],SHA);
    assert.equal(inspected.status,"failed");
    assert.ok(inspected.reason.includes(conclusion.toUpperCase()));
  }
  assert.equal(assessPagesDeployment([goodRun(),goodRun({id:112,conclusion:"failure"})],SHA).status,"failed",
    "a newer failed deployment cannot be masked by earlier green attempt");
  assert.equal(assessPagesDeployment([goodRun({id:111,conclusion:"failure"}),goodRun({id:112})],SHA).status,"verified");
});

test("only successful newer main Pages runs qualify as potential descendant deployments", () => {
  const next = goodRun({id:112,head_sha:DESCENDANT_SHA});
  const candidates = successfulDescendantCandidates([
    next, goodRun({id:113,head_sha:"c".repeat(40),conclusion:"cancelled"}),
    goodRun({id:114,head_sha:"d".repeat(40),head_branch:"feature"}),
    goodRun({id:115,head_sha:"e".repeat(40),path:".github/workflows/fake.yml"}),
    goodRun({id:116,head_sha:"f".repeat(40),name:"another workflow"}),
    goodRun({id:110,head_sha:"1".repeat(40)}),goodRun(),
  ],SHA,111);
  assert.deepEqual(candidates,[next]);
});

test("waiter only uses authenticated read-only GETs and waits for success of exact source revision", async () => {
  const h=mockedRuns([{runs:[]},{runs:[goodRun({status:"in_progress",conclusion:null})]},{runs:[goodRun()]}]);
  const delays=[];
  const result=await waitForPagesDeployment({...options,fetchImpl:h.fetchImpl,maxPolls:4,sleep:async ms=>delays.push(ms),intervalMs:5});
  assert.deepEqual(result,{status:"PAGES_EXACT_SHA_DEPLOYED",sha:SHA,runId:111,polls:3});
  assert.deepEqual(delays,[5,5]);
  assert.equal(h.calls.length,3);
  for (const {url,opts} of h.calls) {
    assert.match(url,/actions\/runs\?branch=main&per_page=100/);
    assert.equal(opts.authorization,undefined);
    assert.equal(opts.headers.authorization,"Bearer INJECTED_TEST_TOKEN");
    assert.equal(opts.headers.accept,"application/vnd.github+json");
    assert.equal(opts.redirect,"error");
    assert.ok(opts.signal instanceof AbortSignal);
    assert.equal(opts.method,undefined,"GET is implicit; no mutating API calls");
  }
});

test("cancelled exact Pages deployment may be replaced ONLY by a confirmed deployed descendant", async () => {
  const cancelled = goodRun({conclusion:"cancelled"});
  const successor = goodRun({id:112,head_sha:DESCENDANT_SHA});
  const h=mockedRuns([{runs:[cancelled]},{runs:[successor,cancelled]}],{
    status:"ahead",behind_by:0,ahead_by:2,merge_base_commit:{sha:SHA},
  });
  const result=await waitForPagesDeployment({...options,fetchImpl:h.fetchImpl,maxPolls:3});
  assert.deepEqual(result,{
    status:"PAGES_DESCENDANT_SHA_DEPLOYED",sha:SHA,deployedSha:DESCENDANT_SHA,runId:112,polls:2,
  });
  assert.equal(h.calls.filter(c=>c.url.includes("/compare/")).length,1);
  assert.equal(h.calls.at(-1).url,`https://api.github.com/repos/Rastty/mypowersetup/compare/${SHA}...${DESCENDANT_SHA}`);
  assert.equal(h.calls.at(-1).opts.headers.authorization,"Bearer INJECTED_TEST_TOKEN");
});

test("unrelated main Pages success, unverifiable ancestry and actual failure never pass", async () => {
  const cancelled=goodRun({conclusion:"cancelled"});
  const successor=goodRun({id:112,head_sha:DESCENDANT_SHA});
  for (const comparison of [
    {status:"diverged",behind_by:1,ahead_by:2,merge_base_commit:{sha:"c".repeat(40)}},
    {status:"ahead",behind_by:0,ahead_by:2,merge_base_commit:{sha:"c".repeat(40)}},
    {status:"ahead",behind_by:1,ahead_by:2,merge_base_commit:{sha:SHA}},
  ]) {
    const h=mockedRuns([{runs:[successor,cancelled]}],comparison);
    await assert.rejects(waitForPagesDeployment({...options,fetchImpl:h.fetchImpl,maxPolls:2}),/PAGES_AUDIT_WAIT_TIMEOUT/);
    assert.equal(h.calls.filter(c=>c.url.includes("/compare/")).length,1,"invalid ancestry is not repeatedly fetched");
  }
  await assert.rejects(waitForPagesDeployment({...options,
    fetchImpl:mockedRuns([{runs:[successor,goodRun({conclusion:"failure"})]}],{
      status:"ahead",behind_by:0,ahead_by:1,merge_base_commit:{sha:SHA},
    }).fetchImpl,maxPolls:2,
  }),/PAGES_DEPLOY_FAILURE/);
  await assert.rejects(waitForPagesDeployment({...options,
    fetchImpl:mockedRuns([{runs:[successor,cancelled]}],{http:403}).fetchImpl,maxPolls:2,
  }),/PAGES_AUDIT_GITHUB_HTTP_403/);
});

test("barrier fails closed for failed, unknown, interrupted or untrusted evidence", async () => {
  await assert.rejects(waitForPagesDeployment({...options,fetchImpl:mockedRuns([{runs:[goodRun({conclusion:"failure"})]}]).fetchImpl,maxPolls:2}),/PAGES_DEPLOY_FAILURE/);
  await assert.rejects(waitForPagesDeployment({...options,fetchImpl:mockedRuns([{runs:[]}]).fetchImpl,maxPolls:2}),/PAGES_AUDIT_WAIT_TIMEOUT/);
  await assert.rejects(waitForPagesDeployment({...options,fetchImpl:mockedRuns([{http:403}]).fetchImpl,maxPolls:2}),/PAGES_AUDIT_GITHUB_HTTP_403/);
  for (const invalid of [
    {...options,sha:"b"}, {...options,repo:"attacker/repo"}, {...options,token:""},
  ]) await assert.rejects(waitForPagesDeployment(invalid),/PAGES_AUDIT_INVALID_REPOSITORY_SHA_OR_TOKEN/);
});

test("public parity workflow waits on exact SHA after main pushes, but PR dry-run is ungated", async () => {
  const yaml=await readFile(".github/workflows/audit-live-html-parity.yml","utf8");
  assert.match(yaml,/branches:\s*\[main, audit\/live-html-parity-20261013\]/);
  assert.match(yaml,/if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.match(yaml,/node scripts\/wait-for-pages-deployment\.mjs/);
  assert.match(yaml,/actions: read/);
  assert.match(yaml,/node scripts\/verify-buyer-paths-live\.mjs/);
  assert.match(yaml,/if: github\.event_name != 'pull_request'/);
});
