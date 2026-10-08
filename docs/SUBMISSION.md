# Submission

ReleaseGate demonstrates an evidence-bound release-policy adjudication primitive on GenLayer. It combines immutable criteria, exact-byte evidence commitments, independent validator interpretation, deterministic status derivation and bounded append-only rechecks.

The [reviewer portal](https://releasegate-review-ledger.ansaf1st34.chatgpt.site/) is a read-only evidence surface. The central state and shared decision live in the Intelligent Contract at `0x8E28e9bb998A1E0158EF49C0d5151d8136F16130` on Studionet (61999). Finalized pilot reads recorded APPROVED, BLOCKED and an append-only APPROVED reviewer recheck. Exact public receipts and source comparison are documented in `VERIFICATION.md` and `deployment.studionet.json`.

Submission description:

> ReleaseGate locks a project's release policy and binds candidates to exact Git commits and SHA-256 committed manifests. GenLayer leader and validators independently retrieve hash-verified evidence and interpret qualitative requirements such as migration recovery instructions and authentication regression coverage. Deterministic logic derives APPROVED/BLOCKED/INCONCLUSIVE, enforces owner authorization, deadlines, resource limits and one owner/one reviewer recheck with genuinely new evidence. Revisions are append-only. The read-only reviewer portal exposes criterion decisions, commitments and history through finalized contract reads. Synthetic pilot fixtures are explicitly labeled; approval means only satisfaction of the locked policy by the retrieved evidence.

Do not claim that fixtures are a production audit, that mocked tests prove consensus, or that an unfinalized deployment is complete.
