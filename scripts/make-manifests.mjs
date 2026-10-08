import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const evidenceCommit = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(evidenceCommit || '')) throw new Error('Pass the pushed evidence commit SHA.');
const repository = 'ANZA24k/ReleaseGate';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// Refuse to emit URLs for bytes which differ from the selected source commit.
mkdirSync('fixtures/manifests', { recursive: true });
for (const kind of ['approved', 'blocked', 'supplement']) {
  const path = `fixtures/evidence/${kind}.md`;
  const bytes = readFileSync(path);
  const committed = execFileSync('git', ['show', `${evidenceCommit}:${path}`]);
  if (!bytes.equals(committed)) throw new Error(`${path} differs from pinned commit`);
  const version = kind === 'blocked' ? 'demo-blocked-1' : 'demo-approved-1';
  const manifest = { schema_version: 1, repository, commit: evidenceCommit, version,
    evidence: [{ label: kind, type: 'synthetic-release-review', url: `https://raw.githubusercontent.com/${repository}/${evidenceCommit}/${path}`,
      sha256: sha(bytes), description: 'Synthetic demonstration fixture; not a production audit or executed product test.' }] };
  const output = JSON.stringify(manifest, null, 2) + '\n';
  writeFileSync(`fixtures/manifests/${kind}.json`, output);
  console.log(`${kind}: ${sha(output)}`);
}
