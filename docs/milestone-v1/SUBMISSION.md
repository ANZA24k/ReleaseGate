# Milestone submission draft

Title: ReleaseGate v1 — Finalized CI Approval Gate

Changes & Improvements (861/1000 characters):

Added a CI release approval gate and reusable GitHub Action so release pipelines can enforce ReleaseGate decisions. The gate binds approval to the exact contract, project, owner, repository, commit, version and locked policy hash. It verifies deployed source identity, reads finalized Studionet state, requires a closed review window, validates append-only revisions and evidence references, and recomputes release status and weighted scores. Missing state, mismatched candidates and unapproved releases block deployment. Added atomic approval/denial receipts and an offline integrity checker. Added 52 gate/CLI tests; all 136 automated tests pass, including 486 aggregation parity cases. The live GitHub Action accepted approved r1 and rejected blocked r2; a separate live check rejected a wrong commit. Includes integration docs, receipts and a baseline diff.

Evidence URL:
https://github.com/ANZA24k/ReleaseGate/blob/main/docs/milestone-v1.md

Additional evidence:
https://github.com/ANZA24k/ReleaseGate/actions/runs/45557592075
https://github.com/ANZA24k/ReleaseGate/compare/3f0657274df1170546ece76b9501f4e3303a7f21...245a70a9e082e58c1d5df70cfd202f877b963e9e

Suggested change type: Integration (choose the closest available option).
Contribution date: 2026-11-25

This file is a draft. Creating it does not submit the contribution or use a weekly slot.
