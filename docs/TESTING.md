# Testing

## Milestone v1 CI gate

`npm test` now runs the original 8 portal tests plus 52 gate/CLI tests. These include
mocked finalized reads, source mismatch, timeout, wrong candidate pins, policy
tampering, invalid history, reviewer roles, repackaged evidence, stale receipt removal
and offline receipt tampering. One parity test covers 486 aggregation combinations
against the actual Python contract function; another checks Unicode canonical hashes.
The tests use Python 3.12+ for parity but the deployed gate runtime needs only Node.

New live read receipts and validation results are linked in [milestone-v1.md](milestone-v1.md).
The separate `Finalized gate integration` Actions workflow runs approval/denial checks
against the pre-existing synthetic Studionet pilot. Availability failures are real
failures; there is no mock or non-final fallback in that workflow.

The automated suite invokes the actual contract through `genlayer-test` direct mode using a pinned GenVM SDK. Web and LLM calls are mocked. It covers authorization, locked policy, duplicate identities, commit/URL validation, exact deadline boundaries, HTTP and size failures, hash mismatch, malformed manifests and models, synthetic prompt injection, deterministic outcomes, validator refetching/disagreement, history, quota and limits.

```sh
python -m pip install -r requirements.txt
python -m pytest tests/direct -q
genvm-lint check contracts/release_gate.py
npm ci
npm test
npm run build
```

Direct-mode validators are invoked explicitly with `direct_vm.run_validator()`. Direct mode runs the leader synchronously; it does not emulate a full network committee or prove finality. Tests proving rejection by the custom validator are not described as a finalized on-chain disagreement transaction.

Frontend tests verify HTML escaping, finalized-deployment eligibility and immutable evidence link restrictions. TypeScript and Vite checks validate the portal build. The committed GitHub Actions workflow runs these checks without repository secrets.

Real integration evidence belongs in `VERIFICATION.md` and the deployment manifest. A passing mocked suite does not prove resistance to every prompt injection or correct judgment by live models. Stable hosted Studio is the integration target, using built-in accounts and actual consensus; no mocked response is used in the public pilot.
