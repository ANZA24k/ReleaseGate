# CI release approval gate

ReleaseGate can now enforce finalized contract decisions in a release pipeline.
Requires Node 22.12+ (24 recommended), no wallet or signing key.

## Local live check

Install with `npm ci --ignore-scripts`, then supply independently chosen identity pins:

```sh
npm run gate -- \
  --contract 0x8E28e9bb998A1E0158EF49C0d5151d8136F16130 \
  --owner 0x5C0393F259afa96aDc82AB666B3b2F2152327533 \
  --project p1 --release r1 --repository ANZA24k/ReleaseGate \
  --commit 9b30f7ad38de530112b9146036d5e73df2633995 \
  --version demo-approved-1 \
  --policy-sha256 31adf845df31f1ae9166ba2a8f247655afa9ef5c4cca92a93912aa4f285e4134 \
  --output receipt.json
```

This example checks the **existing synthetic pilot**, not current HEAD or a production
release. For deployment, commit must be the exact commit being deployed; register
and evaluate that candidate first. Never reuse the pilot SHA to approve another build.

| Exit | Meaning | Deployment |
| --- | --- | --- |
| 0 | Exact application-finalized APPROVED candidate | Allowed by this gate |
| 1 | State read succeeded, candidate denied | Block |
| 2 | Input, transport, deployed source, or snapshot failure | Block |

All pins are mandatory. Choose policy and owner from trusted reviewed configuration,
independently of candidate-supplied metadata. The deployment record additionally
pins the contract address and exact deployed source hash.

## GitHub Actions

Pin the composite action to a **reviewed full commit SHA**, replacing
`REVIEWED_FULL_COMMIT_SHA`. Protect workflow/configuration edits and downstream
deployment environments. Do not use `continue-on-error` on the gate.

```yaml
name: Release
on:
  push:
    tags: ['v*']
permissions:
  contents: read
jobs:
  approve:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - id: gate
        uses: ANZA24k/ReleaseGate@REVIEWED_FULL_COMMIT_SHA
        with:
          contract: '0x8E28e9bb998A1E0158EF49C0d5151d8136F16130'
          owner: ${{ vars.RELEASEGATE_OWNER }}
          project: ${{ vars.RELEASEGATE_PROJECT }}
          release: ${{ vars.RELEASEGATE_RELEASE }}
          repository: ${{ github.repository }}
          commit: ${{ github.sha }}
          version: ${{ github.ref_name }}
          policy-sha256: ${{ vars.RELEASEGATE_POLICY_SHA256 }}
      - uses: actions/upload-artifact@v4
        if: always() && steps.gate.outputs.receipt != ''
        with:
          name: releasegate-receipt
          path: ${{ steps.gate.outputs.receipt }}
          if-no-files-found: warn
      # Add deployment steps with their normal success() condition.
```

The action does not deploy. A downstream deployment must depend on the live check's
successful exit, never the presence of a receipt. Inputs pass through quoted environment
variables, not shell interpolation. Run once per job; output is runner-local. The separate
`Finalized gate integration` workflow exercises the public pilot on integration-code
pushes and manual dispatches. This workflow checks the public pilot
approval/denial pair. It is a network-dependent regression, not production deployment.

## Verification

1. Check configured contract identity and deployed code SHA-256.
2. Read project, release and history with `LATEST_FINAL`, then read the release again
   and reject changes. These are separate RPC calls, not a block-pinned snapshot.
3. Require exact project/release membership, owner, repository, commit and version.
4. Recompute the schema-validated policy's Python-compatible canonical SHA-256.
5. Require application `finalized === true` and a closed bounded review window.
6. Check sequential revisions, policy binding, predecessor links, timestamps, actor
   roles/quotas, pinned evidence references and genuinely new recheck evidence.
7. Recompute mandatory outcomes and optional weighted scores for every revision.
   Only the latest verified APPROVED result can pass.

Network finality and application review finalization are both required. See official
[finalized read guidance](https://docs.genlayer.com/developers/decentralized-applications/reading-data).

## Audit receipts

Successful reads produce atomic approval/denial JSON receipts with network, source
identity, requested pins, observation time, full state/history, result and canonical
payload SHA-256. Input/source/transport errors produce exit 2 without a receipt. A prior
output is removed before each live attempt, preventing reuse of an old approval there.

```sh
npm run receipt:verify -- --file receipt.json
```

Offline verification checks **internal integrity only**, returning
`authorized: false, code: OFFLINE_AUDIT_ONLY`. Its exit 0 never permits deployment.
Anyone can edit a receipt and recalculate its hash. Receipts are unsigned observations,
not cryptographic chain proofs. CI must run the live command for authorization.

## Limits

The gate trusts the pinned SDK's Studionet RPC and local clock. It does not prove RPC
honesty, authenticate reports, re-fetch original evidence, or rerun AI consensus. It
consumes the contract's agreed judgment. Network resets, unavailable RPC, and replaced
deployed code block checks. Each operation has a 45-second deadline with no retries or
non-final fallback. The CLI exits on timeout even though SDK 1.1.8 does not expose
transport cancellation. Response size checks occur after SDK retrieval; transport-level
streaming bounds are not guaranteed. Offline input receipts are capped at 512 KiB.
