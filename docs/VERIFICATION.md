# Verification evidence

## Local/direct evidence

- Actual Python SDK direct test run: **76 passed**, October 8, 2026. Web/model responses mocked.
- Actual frontend test run: **8 passed**, October 8, 2026.
- `genvm-lint check contracts/release_gate.py --json`: AST lint and SDK validation passed; 12 public methods. Informational notice about a newer prerelease runner, no error.
- TypeScript and Vite production build passed. Frontend runtime dependencies: npm audit reported zero vulnerabilities.

## External evidence

- GitHub Actions [run 37727521406](https://github.com/ANZA24k/ReleaseGate/actions/runs/37727521406) passed both contract and reviewer jobs for source commit `9b30f7ad38de530112b9146036d5e73df2633995`.
- Stable Studio deployment finalized: [contract](https://explorer-studio.genlayer.com/address/0x8E28e9bb998A1E0158EF49C0d5151d8136F16130), [deployment transaction](https://explorer-studio.genlayer.com/tx/0x6b7868004deee62b42edfdf813564588280caa2f0e4675009b3951f82fdf2659).
- `getContractCode` returned exactly the local committed source bytes. SHA-256: `682e6ca645a9bda8aa7ea445319a12742fa9608fb942021741f2c9a7f92aa99a`.
- `p1` locked policy SHA-256 `31adf845df31f1ae9166ba2a8f247655afa9ef5c4cca92a93912aa4f285e4134`.
- Latest-final reads recorded `r1` revision 1 **APPROVED**, all three criteria PASS, evidence VERIFIED; `r2` revision 1 **BLOCKED**, authentication FAIL, migration and compatibility PASS, evidence VERIFIED.
- Actual model execution and validator agreement were observed in the public receipts; the pilot did not mock web or model calls. Studio normal/full-consensus mode was used with simulation off.
- Separate built-in account `0x5b05e70A2C3d526ab9a1ee66CfB109D5ca6aAcfa` submitted [recheck](https://explorer-studio.genlayer.com/tx/0x5075af4f7a8ffdca9053a277ea61d6df643d4a68cf806540c8ad1ff5a171bfa6), which finalized and appended revision 2 **APPROVED**, with supplemental evidence verified and the original revision preserved. Both application review windows are finalized, and the public reviewer portal is published.
- GitHub Actions [run 37730877681](https://github.com/ANZA24k/ReleaseGate/actions/runs/37730877681) passed for the committed deployment/pilot observation stage.
- Public [reviewer portal](https://releasegate-review-ledger.ansaf1st34.chatgpt.site/) published successfully through Sites. Anonymous curl requests returned HTTP **200** for `/` and HTTP **404** with the custom not-found page for `/no-such-route`. Python urllib requests returned 403; those responses were not used as proof of availability.
- Browser QA confirmed desktop rendering, no horizontal overflow, live latest-final loading of two releases, release selection, BLOCKED authentication reasoning, two APPROVED revisions, locked policy, hashes, and transaction links. The contract address and deployment transaction pages load in the public explorer; repository HTTP response was 200.
- Mobile breakpoints at 1000px and 650px were inspected in CSS. An actual mobile browser viewport was not verified: this cloud browser did not expose emulation controls, and a data-URL viewport wrapper was rejected by browser policy. Mobile visual QA remains a stated limitation, not a claimed pass.

Run `node scripts/verify-pilot.mjs --require-closed` to repeat source comparison, finalized state reads, receipt inspection and application closure checks. It writes a public observation snapshot to `docs/pilot-observed.json`, with timestamps and exact transaction identifiers. Network finality and the contract's review-window `finalized` flag are separate facts. Initial finalized reads briefly lagged the transaction status; later reads exposed both recorded revisions.

- Final closure verification on October 8, 2026: all nine recorded transactions finalized with successful execution; `r1` APPROVED/finalized with two preserved revisions and `r2` BLOCKED/finalized with one revision. `node scripts/verify-pilot.mjs --require-closed` passed and refreshed `docs/pilot-observed.json`.
