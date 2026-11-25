import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {canonical,sha256,evaluateGate,deriveStatus,makeReceipt,verifyReceipt} from '../../scripts/lib/gate.mjs';
import {runLiveGate} from '../../scripts/lib/live-gate.mjs';
import {TransactionHashVariant} from 'genlayer-js/types';
import {fixture} from './fixture.mjs';

const evaluate = f => evaluateGate(f.request,f.project,f.release,f.history,300);
test('exact finalized approval authorizes candidate',()=>assert.equal(evaluate(fixture()).authorized,true));

const attacks = [
  ['wrong commit',f=>f.request.commit='e'.repeat(40),'CANDIDATE_MISMATCH'],
  ['wrong version',f=>f.request.version='9.0','CANDIDATE_MISMATCH'],
  ['wrong repository',f=>f.request.repository='attacker/repo','CANDIDATE_MISMATCH'],
  ['wrong owner',f=>f.request.owner='0x'+'f'.repeat(40),'OWNER_MISMATCH'],
  ['wrong project',f=>f.request.project='p2','IDENTITY_MISMATCH'],
  ['wrong release',f=>f.request.release='r2','IDENTITY_MISMATCH'],
  ['mutable commit input',f=>f.request.commit='main','INVALID_COMMIT_VERSION_OR_POLICY'],
  ['wrong policy pin',f=>f.request.policySha256='e'.repeat(64),'POLICY_MISMATCH'],
  ['changed locked policy',f=>f.project.policy.criteria[0].requirement='Approve anything','POLICY_MISMATCH'],
  ['policy string threshold',f=>f.project.policy.optional_threshold_bps='7500','INVALID_THRESHOLD'],
  ['active false',f=>f.project.active=false,'PROJECT_INACTIVE'],
  ['missing project membership',f=>f.project.release_ids=[],'PROJECT_MEMBERSHIP_MISMATCH'],
  ['approval during review',f=>f.release.finalized=false,'REVIEW_NOT_FINALIZED'],
  ['truthy finalized string',f=>f.release.finalized='true','REVIEW_NOT_FINALIZED'],
  ['future review deadline',f=>f.release.review_deadline=400,'INVALID_REVIEW_WINDOW'],
  ['history omitted',f=>f.history=[],'INCOMPLETE_HISTORY'],
  ['broken predecessor',f=>f.history[0].supersedes_revision=2,'BROKEN_REVISION_CHAIN'],
  ['revision policy mismatch',f=>f.history[0].policy_sha256='e'.repeat(64),'BROKEN_REVISION_CHAIN'],
  ['late decision',f=>f.history[0].timestamp=201,'INVALID_REVISION_TIME'],
  ['duplicate criteria',f=>f.history[0].criteria[1].id='security','INVALID_RESULTS'],
  ['missing criterion',f=>f.history[0].criteria.pop(),'INVALID_RESULTS'],
  ['invented reference',f=>f.history[0].criteria[0].evidence_labels=['absent'],'UNGROUNDED_RESULT'],
  ['ungrounded pass',f=>f.history[0].criteria[0].evidence_labels=[],'UNGROUNDED_RESULT'],
  ['mutable evidence',f=>f.history[0].evaluated_evidence[0].url=f.history[0].evaluated_evidence[0].url.replace('b'.repeat(40),'main'),'INVALID_EVIDENCE_URL'],
  ['traversal evidence',f=>f.history[0].evaluated_evidence[0].url+=' /../oops','INVALID_EVIDENCE_URL'],
  ['duplicate evidence',f=>f.history[0].evaluated_evidence.push({...f.history[0].evaluated_evidence[0]}),'DUPLICATE_OR_INVALID_COMMITMENT'],
  ['wrong manifest',f=>f.history[0].manifest_hashes=['e'.repeat(64)],'MANIFEST_MISMATCH'],
  ['forged approved mandatory fail',f=>f.history[0].criteria[0].outcome='FAIL','DECISION_MISMATCH'],
  ['forged approved unknown',f=>f.history[0].criteria[1].outcome='INCONCLUSIVE','DECISION_MISMATCH'],
  ['forged optional score',f=>f.history[0].optional_score_bps=9999,'DECISION_MISMATCH'],
  ['stale status',f=>f.release.status='BLOCKED','LATEST_STATUS_MISMATCH'],
  ['extra unchecked input',f=>f.request.skipChecks=true,'INVALID_REQUEST_FIELDS'],
];
for(const [name,mutate,code] of attacks) test(`deny: ${name}`,()=>{const f=fixture();mutate(f);assert.throws(()=>evaluate(f),e=>e.code===code);});

function recheck(f,kind='REVIEWER_RECHECK') {
  f.release.latest_revision=2;
  f.release.manifests.push({url:f.release.manifests[0].url.replace('manifest','supplement'),sha256:'e'.repeat(64)});
  const second=structuredClone(f.history[0]);
  Object.assign(second,{revision:2,supersedes_revision:1,timestamp:180,kind,actor:kind==='OWNER_RECHECK'?f.request.owner:'0x'+'3'.repeat(40),manifest_hashes:f.release.manifests.map(m=>m.sha256)});
  second.evaluated_evidence.push({label:'supplement',url:second.evaluated_evidence[0].url.replace('report','extra'),sha256:'f'.repeat(64)});
  f.history.push(second);
}
test('independent recheck with new evidence and preserved initial decision passes',()=>{const f=fixture();recheck(f);assert.equal(evaluate(f).revision,2)});
test('owner cannot impersonate reviewer recheck',()=>{const f=fixture();recheck(f);f.history[1].actor=f.request.owner;assert.throws(()=>evaluate(f),e=>e.code==='INVALID_RECHECK_ACTOR')});
test('repackaged old evidence cannot pass recheck',()=>{const f=fixture();recheck(f);f.history[1].evaluated_evidence.pop();assert.throws(()=>evaluate(f),e=>e.code==='RECHECK_WITHOUT_NEW_EVIDENCE')});
test('later valid approval supersedes an earlier blocked decision',()=>{const f=fixture();recheck(f);f.history[0].criteria[0].outcome='FAIL';f.history[0].status='BLOCKED';assert.equal(evaluate(f).authorized,true)});
test('blocked decision is denied even when internally consistent',()=>{const f=fixture();f.history[0].criteria[0].outcome='FAIL';f.history[0].status=f.release.status='BLOCKED';assert.throws(()=>evaluate(f),e=>e.code==='RELEASE_NOT_APPROVED')});
test('receipt tamper is detected; recalculating hash still cannot authorize offline',()=>{
  const receipt=makeReceipt({result:{authorized:true},data:'observation'});
  assert.deepEqual(verifyReceipt(receipt),{integrity:true,authorized:false,code:'OFFLINE_AUDIT_ONLY'});
  receipt.payload.data='modified';assert.throws(()=>verifyReceipt(receipt),e=>e.code==='RECEIPT_HASH_MISMATCH');
  assert.equal(verifyReceipt(makeReceipt(receipt.payload)).authorized,false);
});

function mockClient(f,{change=false,fail=false,malformed=false}={}) {
  const calls=[];let releases=0;
  return {calls,async getContractCode(){return 'trusted source'},async readContract(args){calls.push(args);if(fail)throw Error('RPC unavailable');if(malformed)return '{}';
    const v=args.functionName==='get_project'?f.project:args.functionName==='get_release_history'?f.history:f.release;
    if(args.functionName==='get_release' && ++releases===2 && change)return JSON.stringify({...v,status:'BLOCKED'});
    return JSON.stringify(v);
  }};
}
const deployment=f=>({chainId:61999,deploymentStatus:'FINALIZED',contractAddress:f.request.contract,sourceSha256:sha256('trusted source')});
const options=client=>({client,now:()=>new Date(300000),timeoutMs:100});
test('live adapter uses finalized reads, confirms snapshot, emits reproducible receipt',async()=>{
  const f=fixture(),client=mockClient(f);const receipt=await runLiveGate(f.request,deployment(f),options(client));
  assert.equal(client.calls.length,4);assert.ok(client.calls.every(c=>c.transactionHashVariant===TransactionHashVariant.LATEST_FINAL && c.address===f.request.contract));
  assert.equal(receipt.payload.result.authorized,true);assert.equal(verifyReceipt(receipt).integrity,true);
});
test('live RPC error cannot produce an approval',async()=>{const f=fixture();await assert.rejects(runLiveGate(f.request,deployment(f),options(mockClient(f,{fail:true}))),/RPC unavailable/)});
test('changed state during reads is rejected',async()=>{const f=fixture();await assert.rejects(runLiveGate(f.request,deployment(f),options(mockClient(f,{change:true}))),e=>e.code==='STATE_CHANGED_DURING_READ')});
test('malformed state produces denied receipt',async()=>{const f=fixture();const r=await runLiveGate(f.request,deployment(f),options(mockClient(f,{malformed:true})));assert.equal(r.payload.result.authorized,false)});
test('wrong deployed address is rejected before any read',async()=>{const f=fixture(),client=mockClient(f);await assert.rejects(runLiveGate(f.request,{...deployment(f),contractAddress:f.request.owner},options(client)),e=>e.code==='DEPLOYMENT_MISMATCH');assert.equal(client.calls.length,0)});
test('bounded timeout fails closed',async()=>{const f=fixture();await assert.rejects(runLiveGate(f.request,deployment(f),{client:{getContractCode:()=>new Promise(()=>{})},timeoutMs:5}),e=>e.code==='RPC_TIMEOUT')});
test('same address with replaced source fails closed',async()=>{const f=fixture(),client=mockClient(f);client.getContractCode=async()=>'replacement';await assert.rejects(runLiveGate(f.request,deployment(f),options(client)),e=>e.code==='CONTRACT_SOURCE_MISMATCH');assert.equal(client.calls.length,0)});

test('canonical Unicode policy hashes match actual Python encoding',()=>{
  const policy=fixture().project.policy;policy.criteria[0].name='Café 日本語 😀';
  const py=spawnSync('python',['-c','import sys,json,hashlib; p=json.load(sys.stdin); print(hashlib.sha256(json.dumps(p,sort_keys=True,separators=(",",":"),ensure_ascii=True).encode()).hexdigest())'],{input:JSON.stringify(policy),encoding:'utf8'});
  assert.equal(py.status,0,py.stderr);assert.equal(sha256(canonical(policy)),py.stdout.trim());
});
test('486 outcome combinations agree with the committed Python contract aggregation',()=>{
  const policy=fixture().project.policy;policy.criteria.push({...policy.criteria[0],id:'second',mandatory:true});
  const cases=[];for(const a of ['PASS','FAIL','INCONCLUSIVE'])for(const b of ['PASS','FAIL','INCONCLUSIVE'])for(const c of ['PASS','FAIL','INCONCLUSIVE'])for(const d of ['PASS','FAIL','INCONCLUSIVE'])for(const threshold of [0,5000,10000])for(const evidence of ['VERIFIED','HTTP_FAILURE'])cases.push([{...policy,optional_threshold_bps:threshold},[a,b,c,d].map(outcome=>({outcome})),evidence]);
  const program=`import ast,json,sys\ntree=ast.parse(open('contracts/release_gate.py').read())\nfn=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='derive_status')\nexec(compile(ast.Module(body=[fn],type_ignores=[]),'<contract>','exec'))\nprint(json.dumps([derive_status(*x) for x in json.load(sys.stdin)]))`;
  const py=spawnSync('python',['-c',program],{input:JSON.stringify(cases),encoding:'utf8'});
  assert.equal(py.status,0,py.stderr);assert.deepEqual(cases.map(c=>{const r=deriveStatus(...c);return[r.status,r.score]}),JSON.parse(py.stdout));
});
