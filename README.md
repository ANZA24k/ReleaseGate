# ReleaseGate

ReleaseGate is an evidence-bound software release approval protocol built around a GenLayer Intelligent Contract. A maintainer locks a release policy and commits each candidate's repository, target commit, manifest URL and exact SHA-256. Leader and validators independently retrieve and evaluate the committed evidence; deterministic rules produce `APPROVED`, `BLOCKED` or `INCONCLUSIVE`.

**APPROVED means only:** “The retrieved committed evidence satisfied the exact release policy stored for this project.” It is not a universal security guarantee or a production audit.

## Verification status

**Public reviewer portal:** [ReleaseGate](https://releasegate-review-ledger.ansaf1st34.chatgpt.site/).

The contract is **finalized on Studionet, chain ID 61999**, at [`0x8E28e9bb998A1E0158EF49C0d5151d8136F16130`](https://explorer-studio.genlayer.com/address/0x8E28e9bb998A1E0158EF49C0d5151d8136F16130), [deployment transaction](https://explorer-studio.genlayer.com/tx/0x6b7868004deee62b42edfdf813564588280caa2f0e4675009b3951f82fdf2659). Deployed source matches the committed contract byte for byte. The real consensus pilot recorded **APPROVED** for the compliant synthetic candidate and **BLOCKED** for the candidate with an unresolved cross-tenant failure. A second-account recheck appended APPROVED revision 2 while preserving revision 1. See the machine-readable [deployment record](deployment.studionet.json) and [verification evidence](docs/VERIFICATION.md). Both application review windows are finalized.

Local direct tests use mocked web and model responses. Synthetic public fixtures describe invented scenarios and do not claim executed product tests or a security audit.

## Why GenLayer

“Does the migration guide clearly explain a breaking database change and recovery procedure?” cannot reliably be reduced to a hash check or keyword search. GenLayer evaluates that semantic requirement using independently retrieved evidence and validator agreement. Ordinary Python enforces ownership, deadlines, resource bounds, cryptographic identity, thresholds and append-only history.

## Run checks

Python **3.12+** and Node **22.12+**:

```sh
python -m pip install -r requirements.txt
python -m pytest tests/direct -q
genvm-lint check contracts/release_gate.py
npm ci
npm test
npm run build
```

The direct tests pin the GenVM SDK to v0.2.12, whose SDK matches the contract's dependency runner. Studio's stable templates use the same dependency hash. The linter may report a newer prerelease runner; a prerelease is not silently substituted for the committed stable runner.

```sh
npm run dev
```

The reviewer portal is read-only and uses `LATEST_FINAL` reads. It has no wallet connection, database or centralized verdict override. Demonstration writes are intended for Studio's built-in accounts.

## Repository map

| Path | Purpose |
| --- | --- |
| `contracts/release_gate.py` | Single deployable contract with bounded storage and independent consensus |
| `tests/direct/` | Real SDK direct-mode tests with web/model mocks |
| `tests/web/` | Portal escaping, link and verification-gate tests |
| `fixtures/policy.json` | Locked synthetic pilot criteria |
| `fixtures/evidence/` | Explicitly synthetic public evidence |
| `scripts/make-manifests.mjs` | Generate exact-byte commitments from a pushed source commit |
| `web/` | Responsive reviewer portal with finalized reads |
| `deployment.studionet.json` | Observed deployment/pilot facts |
| `docs/` | Architecture, security, testing, deployment, demo and submission evidence |

## Limits

64 projects; 512 releases globally; 32 releases per project; 12 criteria per policy; 8 evidence items across up to 3 manifests; 12 KiB per manifest; 16 KiB per evidence file; 64 KiB combined evidence; 3 decision revisions. No transfer of funds is implemented.

Hashes establish byte identity rather than truth. Submitted evidence can be misleading, model judgments can disagree, GitHub may become unavailable, and Studionet may reset. The SDK has no per-request streaming size or redirect-control parameter: size checks occur after retrieval, and transport limits depend on GenVM. See [SECURITY](docs/SECURITY.md).
