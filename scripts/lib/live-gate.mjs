import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionHashVariant } from 'genlayer-js/types';
import { canonical, evaluateGate, GateError, makeReceipt, sha256, validateRequest } from './gate.mjs';

export async function runLiveGate(request, deployment, {client = createClient({chain:studionet}), now = () => new Date(), timeoutMs = 45000} = {}) {
  validateRequest(request);
  if (deployment.chainId !== 61999 || studionet.id !== 61999 || deployment.deploymentStatus !== 'FINALIZED' || deployment.contractAddress?.toLowerCase() !== request.contract.toLowerCase()) throw new GateError('DEPLOYMENT_MISMATCH');
  const bounded = async operation => {
    let timer;
    try {
      return await Promise.race([
        operation(),
        new Promise((_,reject) => { timer = setTimeout(() => reject(new GateError('RPC_TIMEOUT')), timeoutMs); })
      ]);
    } finally { clearTimeout(timer); }
  };
  const code = await bounded(() => client.getContractCode(request.contract));
  if (typeof code !== 'string' || Buffer.byteLength(code) > 65536 || sha256(code) !== deployment.sourceSha256) throw new GateError('CONTRACT_SOURCE_MISMATCH');
  const read = async (functionName, id) => {
    const raw = await bounded(() => client.readContract({address:request.contract, functionName, args:[id], transactionHashVariant:TransactionHashVariant.LATEST_FINAL}));
    if (typeof raw !== 'string' || Buffer.byteLength(raw) > 131072) throw new GateError('INVALID_RPC_RESPONSE');
    return JSON.parse(raw);
  };
  const release = await read('get_release', request.release);
  const project = await read('get_project', request.project);
  const history = await read('get_release_history', request.release);
  // LATEST_FINAL is not an atomic multi-call snapshot. Check the release again;
  // only application-finalized records are eligible, and those cannot be rechecked.
  const confirmed = await read('get_release', request.release);
  if (canonical(release) !== canonical(confirmed)) throw new GateError('STATE_CHANGED_DURING_READ');
  const observedAt = now().toISOString();
  let result;
  try { result = evaluateGate(request, project, release, history, Math.floor(Date.parse(observedAt)/1000)); }
  catch (error) {
    result = {authorized:false, code:error instanceof GateError ? error.code : 'INVALID_STATE'};
  }
  return makeReceipt({network:'studionet',chainId:61999,readMode:'LATEST_FINAL',sourceSha256:deployment.sourceSha256,observedAt,request,project,release,history,result});
}
