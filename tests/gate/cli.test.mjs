import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {makeReceipt} from '../../scripts/lib/gate.mjs';
const cli=(...args)=>spawnSync(process.execPath,['scripts/release-gate.mjs',...args],{encoding:'utf8',timeout:10000});
test('CLI documents mandatory identity pins',()=>{const r=cli('--help');assert.equal(r.status,0);assert.match(r.stdout,/policy-sha256/)});
test('unknown options fail without an approval',()=>{const r=cli('--skip-verification');assert.equal(r.status,2);assert.equal(JSON.parse(r.stderr).authorized,false)});
test('invalid live run removes stale receipt and exits 2',()=>{
  const dir=mkdtempSync(join(tmpdir(),'releasegate-'));
  try {const file=join(dir,'receipt.json');writeFileSync(file,'old approval');const r=cli('--output',file);assert.equal(r.status,2);assert.equal(existsSync(file),false)}finally{rmSync(dir,{recursive:true,force:true})}
});
test('offline CLI verifies integrity and explicitly refuses deployment authorization',()=>{
  const dir=mkdtempSync(join(tmpdir(),'releasegate-'));
  try {const file=join(dir,'receipt.json');writeFileSync(file,JSON.stringify(makeReceipt({result:{authorized:true}})));const r=cli('verify-receipt','--file',file);assert.equal(r.status,0);assert.equal(JSON.parse(r.stdout).authorized,false);assert.match(r.stdout,/OFFLINE_AUDIT_ONLY/);
    const altered=JSON.parse(readFileSync(file,'utf8'));altered.payload.result.authorized=false;writeFileSync(file,JSON.stringify(altered));const invalid=cli('verify-receipt','--file',file);assert.equal(invalid.status,2);assert.equal(JSON.parse(invalid.stderr).code,'RECEIPT_HASH_MISMATCH');
  }finally{rmSync(dir,{recursive:true,force:true})}
});
