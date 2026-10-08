# Deployment

Target: stable hosted [GenLayer Studio](https://studio.genlayer.com), Studionet, chain ID 61999, RPC `https://studio.genlayer.com/api`. The preview network has a different chain identity and is not substituted. [Official networks](https://docs.genlayer.com/developers/networks).

1. Run tests and `genvm-lint check`; commit and push the exact source.
2. Push synthetic evidence before generating manifests. `node scripts/make-manifests.mjs <pushed evidence commit>` verifies local bytes against the specified Git commit, creates manifests and prints exact hashes. Push the generated manifests.
3. Upload `contracts/release_gate.py` into Studio. Use the built-in funded account and faucet as needed, never exporting its private key. Deploy with no constructor arguments. Capture the transaction identifier immediately.
4. Verify deployment finality and compare deployed source bytes with the committed source. Record the source commit and file SHA-256.
5. Register the fixture policy. Submit candidates using immutable manifest URLs from the pushed manifest commit and exact-byte manifest SHA-256. Evaluate them permissionlessly with real models. If a transaction stalls, inspect it before resubmitting.
6. Recheck with a new supplemental manifest and a second account where useful. Preserve the original revision. Finalize the application review after the committed deadline and verify network finality separately.
7. Publish the static read-only portal. It only enables finalized reads for a verified deployment record. Record website and pilot facts, without inferred transaction IDs or addresses.

The stable Studio integration does not require MetaMask. Public reads require no signing account. The deployed contract itself is nonpayable and uses no transfers. Runtime fees, web/model budgets and transaction availability depend on the network; no measured fee profile is claimed without an actual run. This static reviewer portal submits no transactions and therefore needs no frontend fee profile.

## Official references inspected

- [Intelligent contract overview](https://docs.genlayer.com/developers/intelligent-contracts)
- [Storage](https://docs.genlayer.com/developers/intelligent-contracts/storage)
- [Transaction context](https://docs.genlayer.com/developers/intelligent-contracts/features/transaction-context)
- [Web access](https://docs.genlayer.com/developers/intelligent-contracts/features/web-access)
- [Equivalence Principle](https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle)
- [Testing](https://docs.genlayer.com/developers/intelligent-contracts/testing)
- [Direct testing](https://docs.genlayer.com/api-references/genlayer-test/direct)
- [Linter](https://docs.genlayer.com/api-references/genlayer-linter)
- [Finalized reads](https://docs.genlayer.com/developers/decentralized-applications/reading-data)
- [Fee profiling](https://docs.genlayer.com/developers/decentralized-applications/fee-profiling-and-estimation)

The installed SDK was also inspected directly: `gl.nondet.web.get` returns `Response.status` and byte `body`; its request API has no caller-controlled redirect or streaming size option. `gl.nondet.exec_prompt(..., response_format='json')` returns a parsed object. Stable Studio's template runner matches the source header. This implementation follows the actual SDK where introductory examples differ.
