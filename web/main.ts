import './style.css';
import deployment from '../deployment.studionet.json';
import demonstrationPolicy from '../fixtures/policy.json';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionHashVariant } from 'genlayer-js/types';
import { escapeHtml as e, badge, deploymentReady, safeEvidenceUrl } from './view.mjs';

type Deployment = Omit<typeof deployment, 'pilot'> & { contractAddress?: string; deploymentTx?: string; sourceCommit?: string; sourceSha256?: string; website?: string; pilot: Array<{transaction: string; action: string; releaseId?: string; observedStatus?: string}> };
type Criterion = { id: string; name: string; requirement: string; mandatory: boolean; weight: number };
type Project = { project_id: string; name: string; repository: string; owner: string; policy: { criteria: Criterion[]; optional_threshold_bps: number }; policy_sha256: string; release_ids: string[] };
type Commitment = {url: string; sha256: string; label?: string};
type Release = { release_id:string; project_id:string; version:string; commit:string; status:string; finalized:boolean; latest_revision:number; review_deadline:number; manifests:Commitment[] };
type Revision = {revision:number; status:string; evidence_status:string; timestamp:number; actor:string; kind:string; supersedes_revision:number; optional_score_bps:number; criteria:Array<{id:string;outcome:string;reason:string;evidence_labels:string[]}>; evaluated_evidence:Commitment[]};
const d: Deployment = deployment;
const repo = 'https://github.com/ANZA24k/ReleaseGate';
const explorer = 'https://explorer-studio.genlayer.com';
let projects: Project[] = [];
let releases: Release[] = [];
let histories = new Map<string, Revision[]>();
let selected = '';
const app = document.querySelector<HTMLDivElement>('#app')!;
const sourceLink = (path: string, label: string) => `<a href="${repo}/blob/main/${path}" target="_blank" rel="noopener noreferrer">${label}</a>`;
app.innerHTML = `
<a class="skip" href="#ledger">Skip to release ledger</a>
<header><a class="brand" href="/" aria-label="ReleaseGate home"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 25V7h11l7 7v11M7 16h18M16 7v18"/></svg>ReleaseGate<span>REVIEW LEDGER</span></a><nav aria-label="Primary"><a href="#ledger">Releases</a><a href="#policy">Policy</a><a href="#architecture">Protocol</a><a href="${repo}" target="_blank" rel="noopener noreferrer">GitHub</a></nav></header>
<main>
<section class="intro"><div><p class="eyebrow">GENLAYER INTELLIGENT CONTRACT · STUDIONET</p><h1>Evidence in.<br>Accountable decisions out.</h1><p class="lead">Inspect the exact policy behind a software release decision. Every source is committed. Every revision stays visible.</p></div><aside class="meaning"><span class="mini">01 / SCOPE OF APPROVAL</span><p>“The retrieved committed evidence satisfied the exact release policy stored for this project.”</p><small>Approval establishes policy satisfaction. It does not establish universal security or production safety.</small></aside></section>
<section class="deployment" aria-label="Deployment"><div><span class="mini">CONTRACT</span><div id="contract-info">${deploymentReady(d) ? `<a class="mono" href="${explorer}/contracts/${d.contractAddress}" target="_blank" rel="noopener noreferrer">${e(d.contractAddress)}</a>` : '<strong>Deployment not yet verified</strong>'}</div></div><div><span class="mini">NETWORK</span><strong>Studionet / 61999</strong></div><div><span class="mini">SOURCE</span>${d.sourceCommit ? `<a class="mono" href="${repo}/commit/${d.sourceCommit}" target="_blank" rel="noopener noreferrer">${e(d.sourceCommit.slice(0,12))}</a>` : sourceLink('contracts/release_gate.py','Inspect contract')}</div><div><span class="mini">READ MODE</span><strong>Latest finalized state</strong></div></section>
<section id="ledger" class="ledger"><div class="section-title"><div><p class="eyebrow">02 / RELEASE CANDIDATES</p><h2>Release review ledger</h2></div><button id="refresh" type="button">Refresh state</button></div><p id="read-status" role="status" aria-live="polite">${deploymentReady(d) ? 'Loading finalized contract state…' : 'No live on-chain record is available. The fixtures below are synthetic demonstrations, not recorded verdicts.'}</p><div class="workspace"><aside class="releases-panel"><div class="panel-heading">REGISTERED RELEASES <span id="release-count">—</span></div><div id="release-list"></div></aside><article id="release-detail" class="detail"><div class="empty"><span class="empty-mark">[ ]</span><h3>No verified release selected</h3><p>Finalized contract data will appear here after a verified deployment. No sample verdict is presented as live activity.</p></div></article></div></section>
<section id="policy"><div class="section-title"><div><p class="eyebrow">03 / LOCKED REQUIREMENTS</p><h2>Policy, criterion by criterion</h2></div><span id="policy-origin" class="subtle">Synthetic pilot policy · source fixture</span></div><div id="policy-grid"></div><p id="policy-hash" class="mono subtle"></p></section>
<section class="fixtures"><div><p class="eyebrow">TRANSPARENT DEMONSTRATION EVIDENCE</p><h2>Two candidates.<br>One unchanged policy.</h2><p>These fixtures describe invented release scenarios to exercise semantic consensus. They do not report executed product tests or a production security audit.</p></div><div class="fixture-links">${sourceLink('fixtures/evidence/approved.md','Compliant fixture <span>Authentication, migration, compatibility</span>')}${sourceLink('fixtures/evidence/blocked.md','Noncompliant fixture <span>Deliberately unresolved cross-tenant failure</span>')}${sourceLink('fixtures/evidence/supplement.md','Supplemental fixture <span>New commitment for an append-only recheck</span>')}</div></section>
<section id="architecture"><p class="eyebrow">04 / THE PROTOCOL</p><h2>Independent review. Shared state.</h2><div class="protocol-grid"><article><span class="step">01</span><h3>Lock the policy</h3><p>The maintainer registers bounded criteria. Ownership, deadlines and commitments are enforced by deterministic contract logic.</p></article><article><span class="step">02</span><h3>Retrieve committed sources</h3><p>Leader and validators independently fetch commit-pinned manifests and evidence, then verify exact byte hashes.</p></article><article><span class="step">03</span><h3>Evaluate the substance</h3><p>GenLayer interprets qualitative requirements such as whether migration instructions explain breaking changes. Validators compare material criterion outcomes.</p></article><article><span class="step">04</span><h3>Keep the decision history</h3><p>Deterministic rules derive the release status. Rechecks append revisions and require new verified evidence. Finalization closes the review window.</p></article></div></section>
<section class="limits"><div><p class="eyebrow">FAILURE MODEL</p><h2>A useful gate has explicit limits.</h2></div><div><p>Missing, oversized, unavailable or hash-mismatched evidence produces an inconclusive result. Material validator disagreement cannot silently approve a release.</p><p>Hashes establish byte identity, not truth. A maintainer can submit misleading evidence. Model judgments, GitHub availability, reviewer identity and Studionet persistence remain limitations.</p><p>One owner recheck and one independent reviewer recheck are allowed per release. Independent addresses do not prove independent people.</p>${sourceLink('docs/SECURITY.md','Read the security model')}</div></section>
<section id="transactions"><div class="section-title"><div><p class="eyebrow">05 / VERIFICATION RECORD</p><h2>Public transaction evidence</h2></div></div><div id="transaction-list">${deploymentReady(d) ? `<a class="mono" href="${explorer}/transactions/${d.deploymentTx}" target="_blank" rel="noopener noreferrer">Deployment · ${e(d.deploymentTx)}</a>` : '<p class="subtle">No finalized deployment or pilot transaction has been recorded.</p>'}</div></section>
</main><footer><div class="brand small">ReleaseGate</div><p>Policy satisfaction, with a traceable evidence trail.</p><div>${sourceLink('docs/VERIFICATION.md','Verification')}${sourceLink('docs/TESTING.md','Testing')}<a href="https://studio.genlayer.com" target="_blank" rel="noopener noreferrer">GenLayer Studio</a></div></footer>`;

function renderPolicy(project?: Project) {
  const policy = project?.policy || demonstrationPolicy;
  document.querySelector('#policy-grid')!.innerHTML = policy.criteria.map(c => `<article class="criterion"><div><span class="mono">${e(c.id)}</span><span class="mini">${c.mandatory ? 'MANDATORY' : `OPTIONAL · WEIGHT ${c.weight}`}</span></div><h3>${e(c.name)}</h3><p>${e(c.requirement)}</p></article>`).join('');
  document.querySelector('#policy-origin')!.textContent = project ? `Locked on-chain · ${project.name}` : 'Synthetic pilot policy · source fixture';
  document.querySelector('#policy-hash')!.textContent = project ? `Policy SHA-256: ${project.policy_sha256}` : '';
}
function linkEvidence(m: Commitment) {
  return `<div class="commitment">${safeEvidenceUrl(m.url) ? `<a href="${e(m.url)}" target="_blank" rel="noopener noreferrer">${e(m.label || 'Manifest')}</a>` : '<span>Unrecognized evidence URL</span>'}<code>${e(m.sha256)}</code></div>`;
}
function renderRelease(id: string) {
  selected = id;
  const release = releases.find(r => r.release_id === id)!;
  const project = projects.find(p => p.project_id === release.project_id)!;
  const history = histories.get(id) || [];
  const latest = history.at(-1);
  renderPolicy(project);
  document.querySelector('#release-list')!.innerHTML = releases.map(r => `<button class="release-row ${r.release_id === selected ? 'selected' : ''}" data-release="${e(r.release_id)}" aria-pressed="${r.release_id === selected}"><span><strong>${e(r.version)}</strong><small>${e(r.release_id)} · revision ${r.latest_revision}</small></span>${badge(r.status)}</button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-release]').forEach(b => b.addEventListener('click', () => renderRelease(b.dataset.release!)));
  document.querySelector('#release-detail')!.innerHTML = `<div class="detail-title"><div><span class="mini">${e(project.name)} / ${e(id)}</span><h3>${e(release.version)}</h3></div>${badge(release.status)}</div><dl><div><dt>Target commit</dt><dd><a class="mono" href="https://github.com/${e(project.repository)}/commit/${e(release.commit)}" target="_blank" rel="noopener noreferrer">${e(release.commit)}</a></dd></div><div><dt>Review window</dt><dd>${new Date(release.review_deadline * 1000).toISOString()} · ${release.finalized ? 'Closed by contract' : 'Contract not finalized'}</dd></div><div><dt>Evidence</dt><dd>${e(latest?.evidence_status || 'Not evaluated')}</dd></div></dl><h4>Criterion decisions</h4>${latest ? latest.criteria.map(c => `<div class="decision"><div>${badge(c.outcome)}<strong>${e(project.policy.criteria.find(p => p.id === c.id)?.name || c.id)}</strong></div><p>${e(c.reason)}</p><small>Sources: ${e(c.evidence_labels.join(', ') || 'None')}</small></div>`).join('') : '<p>Evaluation pending.</p>'}<h4>Hash commitments</h4>${release.manifests.map(linkEvidence).join('')}${(latest?.evaluated_evidence || []).map(linkEvidence).join('')}<h4>Append-only revisions</h4>${history.map(r => `<details ${r.revision === release.latest_revision ? 'open' : ''}><summary>Revision ${r.revision} · ${e(r.kind)} ${badge(r.status)}</summary><p>${new Date(r.timestamp * 1000).toISOString()} · supersedes ${r.supersedes_revision || 'none'}</p><p class="mono">Actor ${e(r.actor)}</p><p>Optional score: ${r.optional_score_bps} / 10000</p>${r.criteria.map(c => `<p>${e(c.id)}: ${e(c.outcome)} — ${e(c.reason)}</p>`).join('')}</details>`).join('')}`;
}
async function loadState() {
  if (!deploymentReady(d)) return;
  const button = document.querySelector<HTMLButtonElement>('#refresh')!;
  button.disabled = true;
  const status = document.querySelector('#read-status')!;
  status.textContent = 'Reading latest finalized state from Studionet…';
  try {
    const client = createClient({ chain: studionet });
    const read = async (functionName: string, args: (string | number)[] = []) => client.readContract({address: d.contractAddress as `0x${string}`, functionName, args, transactionHashVariant: TransactionHashVariant.LATEST_FINAL});
    const count = Number(await read('project_count'));
    if (!Number.isInteger(count) || count < 0 || count > 64) throw new Error('Invalid contract project count');
    const nextProjects: Project[] = [];
    const nextReleases: Release[] = [];
    const nextHistories = new Map<string, Revision[]>();
    for (let i = 1; i <= count; i++) {
      const p = JSON.parse(String(await read('get_project', [`p${i}`]))) as Project;
      nextProjects.push(p);
      // Public browsing is capped to the most recent 16 releases per project.
      for (const id of p.release_ids.slice(-16)) {
        const [r, h] = await Promise.all([read('get_release', [id]), read('get_release_history', [id])]);
        nextReleases.push(JSON.parse(String(r)) as Release);
        nextHistories.set(id, JSON.parse(String(h)) as Revision[]);
      }
    }
    projects = nextProjects; releases = nextReleases; histories = nextHistories;
    document.querySelector('#release-count')!.textContent = String(releases.length);
    status.textContent = `Live finalized reads · ${releases.length} release(s) · refreshed ${new Date().toLocaleTimeString()}`;
    if (releases.length) renderRelease(releases.some(r => r.release_id === selected) ? selected : releases[0].release_id);
    else document.querySelector('#release-detail')!.innerHTML = '<div class="empty"><h3>No registered releases</h3><p>The deployed contract has no release candidates in its latest finalized state.</p></div>';
  } catch (error) {
    status.textContent = `Finalized state unavailable: ${error instanceof Error ? error.message : 'RPC error'}. No new chain state has been verified.`;
    // Clear stale verdicts after an unsuccessful refresh.
    document.querySelector('#release-list')!.innerHTML = '';
    document.querySelector('#release-detail')!.innerHTML = '<div class="empty"><h3>Could not verify live state</h3><p>Retry the read or inspect the contract in Studio.</p></div>';
  } finally { button.disabled = false; }
}
renderPolicy();
if (!deploymentReady(d)) document.querySelector<HTMLButtonElement>('#refresh')!.disabled = true;
document.querySelector('#refresh')!.addEventListener('click', loadState);
for (const tx of d.pilot) {
  const a = document.createElement('a'); a.className = 'transaction mono'; a.href = `${explorer}/transactions/${tx.transaction}`; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = `${tx.action} · ${tx.transaction}${tx.observedStatus ? ` · ${tx.observedStatus}` : ''}`; document.querySelector('#transaction-list')!.append(a);
}
void loadState();
