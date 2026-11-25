import {canonical, sha256} from '../../scripts/lib/gate.mjs';
export function fixture() {
  const owner = '0x'+'1'.repeat(40), contract = '0x'+'2'.repeat(40);
  const policy = {criteria:[
    {id:'security',name:'Security',requirement:'No unresolved critical failure',mandatory:true,weight:1},
    {id:'migration',name:'Migration',requirement:'Recovery instructions',mandatory:false,weight:3},
    {id:'compatibility',name:'Compatibility',requirement:'Supported clients tested',mandatory:false,weight:1}
  ],optional_threshold_bps:7500};
  const policySha256 = sha256(canonical(policy));
  const request = {contract,owner,project:'p1',release:'r1',repository:'ANZA24k/ReleaseGate',commit:'a'.repeat(40),version:'1.2.0',policySha256};
  const url = file => `https://raw.githubusercontent.com/ANZA24k/ReleaseGate/${'b'.repeat(40)}/${file}`;
  const manifests = [{url:url('manifest.json'),sha256:'c'.repeat(64)}];
  const project = {project_id:'p1',name:'Example',repository:request.repository,owner,policy,policy_sha256:policySha256,active:true,release_ids:['r1']};
  const release = {release_id:'r1',project_id:'p1',repository:request.repository,version:request.version,commit:request.commit,creator:owner,created_at:100,review_deadline:200,status:'APPROVED',latest_revision:1,finalized:true,manifests};
  const history = [{revision:1,supersedes_revision:0,policy_sha256:policySha256,timestamp:150,actor:owner,kind:'INITIAL',status:'APPROVED',optional_score_bps:10000,evidence_status:'VERIFIED',manifest_hashes:manifests.map(m=>m.sha256),evaluated_evidence:[{label:'report',url:url('report.md'),sha256:'d'.repeat(64)}],criteria:policy.criteria.map(c=>({id:c.id,outcome:'PASS',reason:'Documented in report',evidence_labels:['report']}))}];
  return {request,project,release,history};
}
