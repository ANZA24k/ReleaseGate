import { createHash } from 'node:crypto';

export class GateError extends Error {
  constructor(code) { super(code); this.code = code; }
}
const require = (ok, code) => { if (!ok) throw new GateError(code); };
const hex = (v, n) => typeof v === 'string' && new RegExp(`^[a-f0-9]{${n}}$`).test(v);
const address = v => typeof v === 'string' && /^0x[a-fA-F0-9]{40}$/.test(v);
const integer = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;
const text = (v, max) => typeof v === 'string' && v.length > 0 && [...v].length <= max && v.trim() === v && !/[\u0000-\u001f]/.test(v);
const keys = (v, expected) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).sort().join(',') === [...expected].sort().join(',');

// Matches Python json.dumps(sort_keys=True, separators=(',', ':'), ensure_ascii=True)
// for the bounded integer/string/bool policy schema. No floating point is accepted.
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${canonical(k)}:${canonical(value[k])}`).join(',')}}`;
  require(value === null || typeof value === 'string' || typeof value === 'boolean' || Number.isSafeInteger(value), 'NON_CANONICAL_VALUE');
  return JSON.stringify(value).replace(/[\u0080-\uffff]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}
export const sha256 = value => createHash('sha256').update(value).digest('hex');

export function validateRequest(r) {
  require(keys(r, ['contract','project','release','repository','commit','version','policySha256','owner']), 'INVALID_REQUEST_FIELDS');
  require(address(r.contract) && address(r.owner), 'INVALID_ADDRESS');
  require(/^p[1-9][0-9]{0,2}$/.test(r.project) && /^r[1-9][0-9]{0,2}$/.test(r.release), 'INVALID_ID');
  require(typeof r.repository === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}\/[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(r.repository), 'INVALID_REPOSITORY');
  require(hex(r.commit, 40) && hex(r.policySha256, 64) && text(r.version, 80), 'INVALID_COMMIT_VERSION_OR_POLICY');
}

function validatePolicy(p) {
  require(keys(p, ['criteria','optional_threshold_bps']) && Array.isArray(p.criteria) && integer(p.criteria.length, 1, 12), 'INVALID_POLICY');
  require(integer(p.optional_threshold_bps, 0, 10000), 'INVALID_THRESHOLD');
  const ids = new Set();
  for (const c of p.criteria) {
    require(keys(c, ['id','name','requirement','mandatory','weight']), 'INVALID_CRITERION');
    require(text(c.id, 32) && /^[a-z0-9_-]+$/.test(c.id) && !ids.has(c.id), 'INVALID_CRITERION_ID'); ids.add(c.id);
    require(text(c.name, 80) && text(c.requirement, 768) && typeof c.mandatory === 'boolean' && integer(c.weight, 1, 10000), 'INVALID_CRITERION');
  }
  require(p.criteria.some(c => c.mandatory) && (p.optional_threshold_bps === 0 || p.criteria.some(c => !c.mandatory)), 'INVALID_POLICY');
}

function commitments(items, repository, evidence) {
  require(Array.isArray(items) && integer(items.length, 1, evidence ? 8 : 3), 'INVALID_COMMITMENTS');
  const labels = new Set(), urls = new Set(), hashes = new Set();
  for (const item of items) {
    require(keys(item, evidence ? ['label','url','sha256'] : ['url','sha256']), 'INVALID_COMMITMENT');
    require(typeof item.url === 'string' && item.url.length <= 512 && item.url.startsWith(`https://raw.githubusercontent.com/${repository}/`), 'INVALID_EVIDENCE_URL');
    const parts = item.url.slice(`https://raw.githubusercontent.com/${repository}/`.length).split('/');
    require(parts.length >= 2 && hex(parts[0], 40) && parts.slice(1).every(p => /^[A-Za-z0-9_.-]+$/.test(p) && p !== '.' && p !== '..'), 'INVALID_EVIDENCE_URL');
    require(hex(item.sha256, 64) && !urls.has(item.url) && !hashes.has(item.sha256), 'DUPLICATE_OR_INVALID_COMMITMENT');
    urls.add(item.url); hashes.add(item.sha256);
    if (evidence) { require(text(item.label, 64) && !labels.has(item.label), 'INVALID_LABEL'); labels.add(item.label); }
  }
  return labels;
}

export function deriveStatus(policy, results, evidenceStatus) {
  const total = policy.criteria.reduce((n,c) => n + (c.mandatory ? 0 : c.weight), 0);
  const passed = policy.criteria.reduce((n,c,i) => n + (!c.mandatory && results[i].outcome === 'PASS' ? c.weight : 0), 0);
  const score = total ? Math.floor(passed * 10000 / total) : 10000;
  const status = policy.criteria.some((c,i) => c.mandatory && results[i].outcome === 'FAIL') ? 'BLOCKED'
    : evidenceStatus !== 'VERIFIED' || results.some(r => r.outcome === 'INCONCLUSIVE') ? 'INCONCLUSIVE'
    : score < policy.optional_threshold_bps ? 'BLOCKED' : 'APPROVED';
  return {status, score};
}

// Only this live-state evaluator can authorize deployment. Offline receipts are audit data.
export function evaluateGate(request, project, release, history, nowSeconds = Math.floor(Date.now()/1000)) {
  validateRequest(request);
  require(project?.project_id === request.project && release?.project_id === request.project && release?.release_id === request.release, 'IDENTITY_MISMATCH');
  require(project.repository === request.repository && release.repository === request.repository && release.commit === request.commit && release.version === request.version, 'CANDIDATE_MISMATCH');
  require(address(project.owner) && project.owner.toLowerCase() === request.owner.toLowerCase() && release.creator?.toLowerCase() === request.owner.toLowerCase(), 'OWNER_MISMATCH');
  require(Array.isArray(project.release_ids) && project.release_ids.includes(request.release), 'PROJECT_MEMBERSHIP_MISMATCH');
  require(project.active === true, 'PROJECT_INACTIVE');
  validatePolicy(project.policy);
  require(sha256(canonical(project.policy)) === request.policySha256 && project.policy_sha256 === request.policySha256, 'POLICY_MISMATCH');
  require(release.finalized === true, 'REVIEW_NOT_FINALIZED');
  require(integer(release.created_at, 0, nowSeconds) && integer(release.review_deadline, release.created_at + 1, release.created_at + 604800) && release.review_deadline < nowSeconds, 'INVALID_REVIEW_WINDOW');
  require(integer(release.latest_revision, 1, 3) && Array.isArray(history) && history.length === release.latest_revision, 'INCOMPLETE_HISTORY');
  commitments(release.manifests, request.repository, false);
  let previousEvidence = new Set(), previousManifests = [];
  const quotas = new Set();
  for (let i = 0; i < history.length; i++) {
    const revision = history[i];
    require(revision.revision === i+1 && revision.supersedes_revision === i && revision.policy_sha256 === request.policySha256, 'BROKEN_REVISION_CHAIN');
    require(integer(revision.timestamp, release.created_at, release.review_deadline) && (!i || revision.timestamp >= history[i-1].timestamp), 'INVALID_REVISION_TIME');
    require(address(revision.actor), 'INVALID_ACTOR');
    if (i === 0) require(revision.kind === 'INITIAL', 'INVALID_INITIAL_REVISION');
    else {
      require(['OWNER_RECHECK','REVIEWER_RECHECK'].includes(revision.kind) && !quotas.has(revision.kind), 'INVALID_RECHECK_QUOTA');
      require((revision.actor.toLowerCase() === request.owner.toLowerCase()) === (revision.kind === 'OWNER_RECHECK'), 'INVALID_RECHECK_ACTOR');
      quotas.add(revision.kind);
    }
    require(Array.isArray(revision.criteria) && revision.criteria.length === project.policy.criteria.length, 'INVALID_RESULTS');
    // Historical source failures can be repaired by a valid append-only recheck.
    const verified = revision.evidence_status === 'VERIFIED';
    const labels = verified ? commitments(revision.evaluated_evidence, request.repository, true) : new Set();
    require(Array.isArray(revision.evaluated_evidence), 'INVALID_EVIDENCE');
    for (let j = 0; j < revision.criteria.length; j++) {
      const result = revision.criteria[j];
      require(result.id === project.policy.criteria[j].id && ['PASS','FAIL','INCONCLUSIVE'].includes(result.outcome) && text(result.reason, 320), 'INVALID_RESULTS');
      require(Array.isArray(result.evidence_labels) && result.evidence_labels.length <= 8 && new Set(result.evidence_labels).size === result.evidence_labels.length, 'INVALID_REFERENCES');
      require(result.evidence_labels.every(l => labels.has(l)) && (result.outcome === 'INCONCLUSIVE' || result.evidence_labels.length > 0), 'UNGROUNDED_RESULT');
    }
    require(Array.isArray(revision.manifest_hashes) && revision.manifest_hashes.length <= release.manifests.length && revision.manifest_hashes.every((h,j) => h === release.manifests[j].sha256), 'MANIFEST_MISMATCH');
    if (verified) require(revision.manifest_hashes.length === i+1, 'MANIFEST_MISMATCH');
    if (i) {
      require(verified && revision.evaluated_evidence.some(e => !previousEvidence.has(e.sha256)), 'RECHECK_WITHOUT_NEW_EVIDENCE');
      require(previousManifests.every((h,j) => revision.manifest_hashes[j] === h), 'MANIFEST_HISTORY_MISMATCH');
    }
    for (const e of revision.evaluated_evidence) previousEvidence.add(e.sha256);
    previousManifests = revision.manifest_hashes;
    const derived = deriveStatus(project.policy, revision.criteria, revision.evidence_status);
    require(revision.status === derived.status && revision.optional_score_bps === derived.score, 'DECISION_MISMATCH');
  }
  const latest = history.at(-1);
  require(latest.manifest_hashes.length === release.manifests.length, 'MANIFEST_MISMATCH');
  require(release.status === latest.status, 'LATEST_STATUS_MISMATCH');
  require(release.status === 'APPROVED' && latest.evidence_status === 'VERIFIED', 'RELEASE_NOT_APPROVED');
  return {authorized:true, code:'FINALIZED_APPROVAL', revision:latest.revision, status:latest.status};
}

export function makeReceipt(payload) {
  return {schema:'releasegate-ci-receipt/v1', payload, sha256:sha256(canonical(payload))};
}
export function verifyReceipt(receipt) {
  require(keys(receipt, ['schema','payload','sha256']) && receipt.schema === 'releasegate-ci-receipt/v1', 'INVALID_RECEIPT');
  require(hex(receipt.sha256, 64) && sha256(canonical(receipt.payload)) === receipt.sha256, 'RECEIPT_HASH_MISMATCH');
  // Explicitly does not grant deployment authorization, even if payload claims it.
  return {integrity:true, authorized:false, code:'OFFLINE_AUDIT_ONLY'};
}
