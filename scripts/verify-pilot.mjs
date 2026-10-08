import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionHashVariant } from 'genlayer-js/types';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const deployment = JSON.parse(readFileSync('deployment.studionet.json', 'utf8'));
if (!deployment.contractAddress) throw new Error('No recorded deployment');
const client = createClient({ chain: studionet });
const code = await client.getContractCode(deployment.contractAddress);
const source = readFileSync('contracts/release_gate.py', 'utf8');
if (code !== source) throw new Error('Deployed source differs from local source');
const read = async (functionName, args = []) => client.readContract({
  address: deployment.contractAddress, functionName, args,
  transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
});
const project = JSON.parse(String(await read('get_project', ['p1'])));
const releases = [];
for (const id of project.release_ids) {
  releases.push({release: JSON.parse(String(await read('get_release', [id]))),
    history: JSON.parse(String(await read('get_release_history', [id])))});
}
const transactions = [];
for (const item of [{action:'Deployment', transaction:deployment.deploymentTx}, ...deployment.pilot]) {
  const tx = await client.getTransaction({hash:item.transaction});
  const receipts = tx.consensus_data?.leader_receipt || [];
  transactions.push({...item, networkStatus:tx.statusName,
    executionResults:receipts.filter(r => r.execution_result === 'SUCCESS').map(r => r.execution_result),
    votes:tx.consensus_data?.votes || {}});
}
if (transactions.some(t => t.networkStatus !== 'FINALIZED' || t.executionResults.length === 0)) {
  throw new Error('A recorded transaction is not finalized with successful execution');
}
const approved = releases.find(r => r.release.release_id === 'r1');
const blocked = releases.find(r => r.release.release_id === 'r2');
if (approved?.release.status !== 'APPROVED' || approved.history.length !== 2 ||
    approved.history[0].kind !== 'INITIAL' || approved.history[1].kind !== 'REVIEWER_RECHECK' ||
    approved.history[1].actor.toLowerCase() === project.owner.toLowerCase() ||
    blocked?.release.status !== 'BLOCKED' || blocked.history[0]?.criteria.find(c => c.id === 'auth')?.outcome !== 'FAIL') {
  throw new Error('Pilot outcomes or append-only independent recheck differ from recorded expectations');
}
if (process.argv.includes('--require-closed') && releases.some(r => !r.release.finalized)) {
  throw new Error('Application review window is not finalized');
}
const result = {observedAt:new Date().toISOString(), network:'studionet', chainId:61999,
  contractAddress:deployment.contractAddress, sourceMatches:true,
  sourceSha256:createHash('sha256').update(source).digest('hex'), project, releases, transactions};
writeFileSync('docs/pilot-observed.json', JSON.stringify(result, null, 2)+'\n');
console.log(JSON.stringify({observedAt:result.observedAt,sourceMatches:true,
  releases:releases.map(r => ({id:r.release.release_id,status:r.release.status,
    finalized:r.release.finalized,revisions:r.history.length})),
  transactions:transactions.map(t => ({action:t.action,status:t.networkStatus}))},null,2));
