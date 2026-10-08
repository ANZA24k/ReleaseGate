# Security and failure model

## Evidence commitments

The initial manifest and every supplemental manifest are SHA-256 committed. Digests use the SDK response's exact bytes before UTF-8 decoding. Schema, repository, target commit and version must match the candidate. Evidence can be stored in a later artifact commit than its target software commit; the manifest explicitly binds the target identity. This permits post-build reports without a circular Git commit commitment.

Hash identity is not evidence authenticity. A project owner can author misleading test reports; a reviewer must choose a policy which requires appropriate evidence provenance. This deployment does not authenticate CI signatures, replay tests, inspect hidden files or establish completeness of a repository audit.

## URLs and availability

Only HTTPS `raw.githubusercontent.com/<exact registered owner/repo>/<40 lowercase hex commit>/<plain path>` is accepted. Arbitrary hosts, IP addresses, loopback, private/link-local networks, userinfo, ports, percent encoding, queries, fragments and traversal segments fail admission. Branch names and mutable references are excluded.

GitHub content may be unavailable or removed even with a commit pin. HTTP non-200, byte changes, invalid UTF-8, malformed identity and size failures are INCONCLUSIVE. Supplemental rechecks require fully VERIFIED sources. Host/web-module networking policy remains necessary: this stable SDK exposes no redirect toggle or streaming response-size cap. Application checks reject oversized downloaded bodies; they do not cap bytes transferred before the check or control transport redirects. This is a documented transport-level limitation, not a claim of complete SSRF immunity.

## Prompt injection

All fetched text and evidence metadata are adversarial data. The prompt prohibits instructions in evidence, role changes, extra browsing and executing source code. Only the locked owner policy sets the task. Every validator independently retrieves and interprets sources. Schema validation requires existing source labels for PASS/FAIL. These defenses reduce risk but do not prove model immunity; correlated models can still be wrong. The mocked injection test establishes code path and prompt construction only.

## Consensus and revisions

Material criterion outcomes, commitments, status and score must agree. Reason wording need not agree. A validator error or malformed leader result rejects consensus. Malformed LLM output fails execution rather than creating an APPROVED record. Network rotation/undetermined behavior requires integration verification separately from direct tests.

The initial decision is preserved. One owner and one non-owner recheck maximum; both require new evidence bytes. Non-owner addresses do not establish unique humans. Sybil actors can consume the single reviewer slot; no claim of identity verification is made. There is no economic bond or slashing mechanism in ReleaseGate.

## Bounds and exhaustion

All state growth is bounded. Maximum 64 projects, 512 releases, 32 releases per project, 12 criteria, three manifests/revisions, eight evidence files in aggregate, 64 KiB evidence text. Reasons are limited to 320 characters and criteria requirements to 768 characters. The global project cap is susceptible to permissionless exhaustion; deploy separate contract instances for separate governance domains if necessary. Bounds intentionally trade scalability for predictable review costs.

## False assurance

APPROVED means exactly policy satisfaction by retrieved committed evidence. It does not mean vulnerability-free, universally secure, production-safe, compliant, audited, or independent author identity. Synthetic fixtures are not a real software security test. No private keys are included. No transfers, token incentives, admin override, authentication service or database are present.
