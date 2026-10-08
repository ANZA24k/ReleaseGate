import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const tracked = execFileSync('git',['ls-files','-z']).toString().split('\0').filter(Boolean);
for (const path of tracked) {
  if (path.includes('node_modules/') || /(^|\/)\.env$/.test(path)) throw new Error(`Unwanted tracked file: ${path}`);
  const body = readFileSync(path,'utf8');
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(body) || /(?:ghp_|github_pat_)[A-Za-z0-9_]{30,}/.test(body)) throw new Error(`Possible secret: ${path}`);
}
const d = JSON.parse(readFileSync('deployment.studionet.json','utf8'));
if(d.deploymentStatus === 'FINALIZED' && (!/^0x[a-fA-F0-9]{40}$/.test(d.contractAddress || '') || !/^0x[a-fA-F0-9]{64}$/.test(d.deploymentTx || '') || !/^[a-f0-9]{40}$/.test(d.sourceCommit || ''))) throw new Error('Incomplete finalized deployment facts');
console.log(`Repository check passed (${tracked.length} tracked files).`);
