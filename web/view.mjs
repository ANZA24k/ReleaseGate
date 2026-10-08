export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
export function deploymentReady(d) {
  return d.deploymentStatus === 'FINALIZED' && /^0x[a-fA-F0-9]{40}$/.test(d.contractAddress || '') && /^0x[a-fA-F0-9]{64}$/.test(d.deploymentTx || '');
}
export function badge(status) {
  const valid = ['PENDING','APPROVED','BLOCKED','INCONCLUSIVE','PASS','FAIL'];
  return `<span class="badge ${valid.includes(status) ? status.toLowerCase() : 'pending'}">${escapeHtml(valid.includes(status) ? status : 'UNVERIFIED')}</span>`;
}
export function safeEvidenceUrl(url) {
  return /^https:\/\/raw\.githubusercontent\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/[a-f0-9]{40}\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/.test(url) && !url.split('/').some(p => p === '..' || p === '.');
}
