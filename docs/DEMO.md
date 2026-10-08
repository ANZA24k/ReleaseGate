# Public pilot

The policy in `fixtures/policy.json` is explicitly about synthetic release evidence. It requires expired-session rejection, cross-tenant rejection, documented users.tenant_id migration/backfill/backup/rollback, and breaking API/client compatibility notes.

- `approved.md` describes evidence satisfying these requirements.
- `blocked.md` deliberately reports an unresolved cross-tenant regression.
- `supplement.md` adds a separate review supporting the compliant candidate for a new-evidence recheck.

Expected fixture outcomes are not observed chain verdicts. Actual verdicts may differ or consensus may fail; only finalized observations are recorded in `deployment.studionet.json` and `VERIFICATION.md`.

Manifests use schema version 1 with exactly: `schema_version`, `repository`, `commit`, `version`, `evidence`. Each evidence item has exactly `label`, `type`, `url`, `sha256`, `description`. Hash the final UTF-8 file bytes including the trailing newline. No canonicalization is performed before validating a committed manifest digest.

The primary manifest commits all initial sources. Recheck manifests add separate unique sources; they do not repeat or replace the primary manifest entries. The contract independently refetches the original and supplemental evidence each time. Identity fields remain the same. Evidence URLs can pin the artifact commit while the manifest `commit` binds the target software commit.

The public portal reads finalized contract state and displays decision histories. Synthetic source links remain visibly labeled even when a live pilot decision exists.
