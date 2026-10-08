# Architecture

## Shared-state protocol

`register_project(name, repository, policy_json)` immediately locks the canonical JSON policy and its SHA-256. There is no policy setter, admin role or override. IDs are contract-generated sequential `pN`/`rN` identifiers. Owner/repository registration and project/version/commit candidate identities reject duplicates.

`submit_release(project_id, version, commit, manifest_url, manifest_sha256, review_deadline)` is owner-only. The deadline is strictly future and at most seven days after the transaction timestamp.

`evaluate_release(release_id)` is permissionless, available once, through the deadline inclusively. It copies bounded storage records into memory before entering the non-deterministic VM.

`recheck_release(release_id, manifest_url, manifest_sha256)` performs a new evaluation atomically, with one owner quota and one non-owner quota. It adds a supplemental manifest to the original sources. An unsuccessful request does not consume quota or create history. Rechecks require successful source verification and at least one previously unseen actual evidence SHA-256. Manifest repackaging and duplicate source bytes cannot satisfy this rule.

`finalize_release(release_id)` is permissionless strictly after the deadline. It closes application review, preserving revisions. A candidate never evaluated receives an append-only `INCONCLUSIVE / REVIEW_EXPIRED` revision. Application finalization differs from network transaction finality.

## Storage

Typed `TreeMap[str,str]` fields hold canonical bounded JSON project, release and revision records. `u32` counters are persistent. Revision keys are `release_id:revision`, checked absent before insertion. Only bounded metadata, decisions, commitments and reasons are stored; fetched body text remains off-chain. Public methods return JSON strings for uncomplicated Studio and JS interoperability.

Views: `get_project`, `get_policy`, `get_release`, `get_release_history` (maximum 3 revisions), `list_project_releases` (maximum 16 IDs per page), `project_count`, `release_count`. Project release arrays are globally bounded at 32.

## Independent semantic consensus

Both leader and validator execute `evaluate_sources`: fetch committed manifest bytes, verify digest, validate exact schema and candidate identity, retrieve every referenced evidence file, verify each digest, then interpret each locked criterion. `gl.vm.run_nondet_unsafe` receives a custom validator which reruns this full task independently. It compares criterion IDs/outcomes, deterministic derived status/score, evidence verification status, manifest hashes and evaluated evidence commitments. Reason wording and chosen supporting labels may differ. Leader exceptions and malformed model results are rejected. No validator simply accepts an enum or JSON shape.

Mandatory FAIL → BLOCKED. Otherwise any retrieval problem or INCONCLUSIVE criterion → INCONCLUSIVE. Otherwise optional weighted PASS score below locked basis-point threshold → BLOCKED. Otherwise APPROVED. Scores use integer arithmetic. Every criterion must have exactly one result in locked order. PASS/FAIL results require at least one existing evidence label.

GenLayer network consensus handles leader rotation, disagreement and finality. A material disagreement does not authorize deterministic state mutation.

## Portal

Vite + TypeScript + GenLayerJS. No write methods or wallet provider. Deployment facts are bundled from the committed manifest. Data is read with `TransactionHashVariant.LATEST_FINAL`. An unsuccessful refresh clears stale verdicts. Evidence text is HTML-escaped and raw evidence links are allowlisted. The portal displays the most recent 16 releases per project; contract reads remain separately pageable.
