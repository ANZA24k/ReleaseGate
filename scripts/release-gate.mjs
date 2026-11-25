import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { GateError, verifyReceipt } from './lib/gate.mjs';
import { runLiveGate } from './lib/live-gate.mjs';

const help = `ReleaseGate CI approval gate (Node 22.12+)
Live check (all identity pins are required):
  npm run gate -- --contract 0x... --owner 0x... --project p1 --release r1 \\
    --repository owner/repo --commit <40 lowercase hex> --version <exact version> \\
    --policy-sha256 <64 lowercase hex> --output receipt.json
Offline audit (integrity only; never authorizes a deployment):
  npm run receipt:verify -- --file receipt.json
Exit: 0 live approval / successful offline integrity check, 1 denied, 2 input or RPC error.
Receipt files are unsigned observations, not chain proofs. CI must use the live check.`;

async function main() {
  const audit = process.argv[2] === 'verify-receipt';
  const {values} = parseArgs({args:process.argv.slice(audit ? 3 : 2), options:Object.fromEntries([
    ...(audit ? ['file'] : ['contract','owner','project','release','repository','commit','version','policy-sha256','output']).map(k => [k,{type:'string'}]), ['help',{type:'boolean'}]
  ]), strict:true, allowPositionals:false});
  if (values.help) { console.log(help); return; }
  if (audit) {
    if (!values.file) throw new GateError('MISSING_FILE');
    const raw = await readFile(values.file, 'utf8');
    if (Buffer.byteLength(raw) > 524288) throw new GateError('RECEIPT_TOO_LARGE');
    console.log(JSON.stringify(verifyReceipt(JSON.parse(raw)))); return;
  }
  const {output, 'policy-sha256':policySha256, help:_, ...pins} = values;
  if (!output) throw new GateError('MISSING_OUTPUT');
  // Delete an old receipt before reading. A failed live run must not leave an old approval.
  await rm(output, {force:true});
  const request = {...pins, policySha256};
  const deployment = JSON.parse(await readFile(new URL('../deployment.studionet.json', import.meta.url), 'utf8'));
  const receipt = await runLiveGate(request, deployment);
  const temp = `${output}.${process.pid}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(receipt,null,2)+'\n', {flag:'wx',mode:0o600});
    await rename(temp,output);
  } finally { await rm(temp,{force:true}); }
  console.log(JSON.stringify({ ...receipt.payload.result, receipt:output, sha256:receipt.sha256 }));
  process.exitCode = receipt.payload.result.authorized ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // SDK 1.1.8 has no AbortSignal transport hook. Exit after awaited file writes
  // so a timed-out underlying fetch cannot keep a failed CI process alive.
  main().then(() => process.exit(process.exitCode || 0)).catch(error => {
    console.error(JSON.stringify({authorized:false, code:error instanceof GateError ? error.code : 'INPUT_OR_RPC_ERROR', message:String(error.message).slice(0,500)}));
    process.exit(2);
  });
}
