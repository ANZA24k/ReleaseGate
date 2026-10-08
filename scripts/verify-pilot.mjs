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
const result = {observedAt:new Date().toISOString(), network:'studionet', chainId:61999,
  contractAddress:deployment.contractAddress, sourceMatches:true,
  sourceSha256:createHash('sha256').update(source).digest('hex'), project, releases, transactions};
writeFileSync('docs/pilot-observed.json', JSON.stringify(result, null, 2)+'\n');
console.log(JSON.stringify({observedAt:result.observedAt,sourceMatches:true,
  releases:releases.map(r => ({id:r.release.release_id,status:r.release.status,
    finalized:r.release.finalized,revisions:r.history.length})),
  transactions:transactions.map(t => ({action:t.action,status:t.networkStatus}))},null,2));
