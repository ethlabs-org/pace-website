---
# the floating dock is fixed over the content column and covers body text
showAskAi: false
---

# Ethereum post-quantum work, state as of 2026-09-21

Research notes for a technical writer. Primary sources where possible. Anything I could not confirm against a primary source is marked UNVERIFIED. Numbers from secondary write-ups are flagged as such.

## 1. The signature schemes

### Why "hash-based" is the conservative choice

A quantum computer running Shor's algorithm breaks the discrete-log problem that secp256k1 (ECDSA), P-256 (passkeys) and BLS12-381 (validator signatures) rest on. Hash functions are only weakened by Grover's algorithm, which roughly halves the security level; a 256-bit hash still gives ~128-bit quantum security. A signature scheme built only from a hash function therefore has the smallest possible assumption set. That is the whole argument: it adds no new maths and rests only on the hash you already trust. ethereum.org states it as "hash-based signatures are considered quantum-safe because they rely only on the security of hash functions, which quantum computers weaken but do not break."

The cost is size and verification work. A hash-based signature is several kilobytes. An ECDSA signature is 65 bytes.

### SLH-DSA (SPHINCS+, FIPS 205)

NIST published FIPS 205 on 13 August 2024. It is the stateless hash-based scheme derived from SPHINCS+. "Stateless" matters: a signer never has to remember which one-time key it has used, so a key can be backed up, cloned or restored without the risk of reusing a one-time key. XMSS-style schemes do not have this property.

Parameter sets (from the FIPS 205 table; I could not machine-read the PDF, so these are the standard's published figures reproduced from memory and secondary sources, treat as UNVERIFIED for exact bytes):

| Set | Security cat. | Public key | Signature |
|---|---|---|---|
| SLH-DSA-128s | 1 | 32 B | 7,856 B |
| SLH-DSA-128f | 1 | 32 B | 17,088 B |
| SLH-DSA-192s | 3 | 48 B | 16,224 B |
| SLH-DSA-192f | 3 | 48 B | 35,664 B |
| SLH-DSA-256s | 5 | 64 B | 29,792 B |
| SLH-DSA-256f | 5 | 64 B | 49,856 B |

Each set exists with SHA-2 or SHAKE as the hash. "s" is small signature, slow signing. "f" is fast signing, big signature. A secondary source gives ~3.6 ms verification and ~131 ms signing for 128s on a laptop CPU; verification cost is dominated by hash calls, in the order of thousands of them.

Why it comes up for Ethereum accounts specifically: statelessness fits wallets (seed phrases, multiple devices) and the 32-byte public key fits existing address derivation. The EF's own execution-layer work is now explicitly built on this family, see "leanSPHINCS" and "SPHINCS-" below.

### ML-DSA (Dilithium, FIPS 204) and Falcon (FN-DSA)

Both are lattice schemes. They are far smaller and faster than SLH-DSA but rest on a structured-lattice assumption that is newer than "SHA-256 is a good hash".

- ML-DSA-44: public key 1,312 B, signature 2,420 B. ML-DSA-65: 1,952 / 3,309 B. ML-DSA-87: 2,592 / 4,627 B. (FIPS 204 figures, UNVERIFIED as exact bytes; the 2,420 B signature for level 2 is confirmed by EIP-8051's input layout.)
- Falcon-512: public key 897 B, signature ~666 B. Falcon-1024: 1,793 B / ~1,280 B. EIP-8052 gives 666 B and 896 B for Falcon-512.

Falcon has the smallest signatures of any NIST scheme but needs floating-point arithmetic for signing, which is hard to do safely on hardware wallets. ML-DSA signing is simpler. Neither is SNARK-friendly, which becomes relevant in section 3.

### XMSS, "hash-sig" and leanSig (the EF cryptography team's line of work)

XMSS (RFC 8391) is the stateful cousin of SPHINCS+: a Merkle tree of Winternitz one-time keys, where the signer must never reuse a leaf. Because Ethereum validators sign in slots, the slot number can be the leaf index, so statefulness is not a problem there.

The EF team (Drake, Khovratovich, Kudinov, Wagner) published "Hash-Based Multi-Signatures for Post-Quantum Ethereum" (eprint 2025/055, later in IACR Communications in Cryptology). It is a generalised XMSS built from "tweakable hash functions and incomparable encodings" with target-sum Winternitz encoding, proven in the standard model, without a random-oracle assumption. Instantiations exist with SHA-3 and Poseidon2. The prototype Rust repo is github.com/b-wagn/hash-sig (unaudited, and since November 2025 it says development moved to a new repo under the leanEthereum organisation). The production naming today is:

- leanXMSS: the scheme
- leanSig: the Rust implementation
- leanVM / leanMultisig: the minimal zkVM and the aggregation program (section 3)

Signature sizes for leanXMSS are roughly 1 to 4 KiB depending on parameters (secondary source, goatresearch survey).

## 2. The roadmap as of September 2026

### Organisation

- January 2026: EF formed a dedicated Post-Quantum team inside the Protocol cluster, tracked at pq.ethereum.org. Press reports name Thomas Coratger as lead (UNVERIFIED against a primary source). Two $1M prizes were announced: a Poseidon prize and a "Proximity" prize.
- 26 February 2026: Vitalik posted a PQ roadmap (on X; I could not fetch the primary post). It names four vulnerable areas: consensus BLS signatures, KZG in data availability, ECDSA on user accounts, and application-layer ZK proofs (KZG/Groth16). For user accounts the answer is EIP-8141.
- pq.ethereum.org describes the execution-layer order as "PQ sig precompiles (J*) → PQ transactions → PQ sig aggregation (M*)", where J* and M* are placeholder names for forks after Hegotá on the "strawmap" (roughly one fork every six months, seven forks by 2029). It also lists "standardizing post-quantum signature verification via a vector math precompile" as an execution-layer item.
- Target: "L1 protocol upgrades could be completed by 2029, with full execution-layer migration taking additional years beyond that." NIST plans to deprecate ECDSA in 2030 and disallow it in 2035.

### The August 2026 hash-function pivot

On 13 August 2026 Justin Drake announced on X that the EF is dropping Poseidon for L1 and moving to "SHA or BLAKE". The reason given was not a break of Poseidon but a change in proof systems: binary-field SNARKs (Binius in 2023, then "Flock" by Bünz, Rothblum and Wang, June 2026, eprint 2026/1329) prove standard hashes fast enough that a SNARK-friendly hash is no longer needed. Reported Flock numbers: ~82k BLAKE3 compressions/s per core on an M4 Max, ~660k on ten cores. Vitalik had earlier put ~200k hashes/s as the threshold for the PQ transition to be viable (secondary sources). Consequence for a writer: anything that says "Poseidon" in the lean Ethereum stack is now being reworked; the leanVM/leanMultisig figures below were measured with Poseidon and will change. Whether the final hash is SHA-256, Keccak or BLAKE3 is open. No EF blog post or EIP has formalised this yet.

### The EIPs that actually exist

All Draft, Standards Track Core, unless stated.

| EIP | What | Notes |
|---|---|---|
| EIP-8051 | Precompile for ML-DSA signature verification | Dubois, Masson. Created 2025-10-15. Level 2 params (k=l=4). Two precompiles: VERIFY_MLDSA (0x12, SHAKE256, FIPS-204 compliant) and VERIFY_MLDSA_ETH (0x13, Keccak-PRNG, NTT-domain key encoding). 4,500 gas each. Input is message 32 B + signature 2,420 B + expanded public key 20,512 B. |
| EIP-8052 | Precompile for Falcon support | Dubois, Masson, Sanso, van der Wijden, Wedderburn, Zhang, Consigny. Created 2025-10-17. Falcon-512. Split into FALCON_HASH_TO_POINT (SHAKE256 or Keccak-PRNG variant, 1,000 gas) and FALCON_CORE (2,000 gas). Addresses TBD. |
| EIP-7885 | Precompile for NTT operations | Dubois, Masson, Lee. Created 2025-02-12. Vector ops (NTT forward/inverse, vector mul/add mod q) that make Falcon/Dilithium verification cheap in contracts. This is probably what pq.ethereum.org means by "vector math precompile" (UNVERIFIED). Claims ETHFALCON drops from 1.8M to 479K gas. |
| EIP-7932 | Secondary Signature Algorithms | Kempton. A registry plus a SIGRECOVER precompile for extra transaction signature algorithms. Only secp256k1 is specified; PQ algorithms need their own EIPs. |
| EIP-8141 | Frame Transaction | Buterin, lightclient, Lange, Weiss, Forshtat, Tirosh, Nacson, Chiang, Wahrstätter, Vlachakis. Native AA. "Must-ship" for Hegotá (expected Q2 2027, no committed date). |
| EIP-8130 | Keystore Accounts | Chris Hunter (Base). Created 2025-10-14. Competing native-AA design with an on-chain keystore. The EF/Base effort to merge 8141 and 8130 ended in September 2026; both will ship separately. |
| EIP-8298 | SETCODEFROM | Guo, Adams, Perez, Consigny. An opcode that lets an account adopt another account's code hash. Used for EOA to smart-account migration. |
| EIP-8151 | Account Code Restricted ecRecover | Guo, Consigny. ecRecover returns zero if the recovered address has regular deployed code. Closes the `permit` hole after migration. |

There is no EIP for an SLH-DSA precompile. I searched eips.ethereum.org and Ethereum Magicians and found none. "EIP-8053 for Dilithium", which one secondary source mentions, does not resolve; ML-DSA is EIP-8051. The EF's hash-based work for accounts avoids a precompile on purpose (next paragraph).

### Hash-based signatures for accounts: SPHINCS- and leanSPHINCS

- "SPHINCS minus" (ethresear.ch, Nicolas Consigny, 12 June 2026). Takes SLH-DSA, swaps SHAKE256 for the EVM's native KECCAK256 opcode, and drops the 2^64 signature budget to 2^14 to 2^20 per key (an average address does ~431 transactions per year). It reuses WOTS+C / FORS+C compression ideas. Variants: C13 at 3,704 B and ~127k gas (laptop signers), C11/C12 at 6,512 B and ~276k gas (hardware wallets, slow signing), plus an "SLH-DSA-Keccak-128-24" at 3,856 B and ~94k gas. Verifiers are being proven in Lean 4. It needs no protocol change, which is the point: "the most gas-efficient hash based PQ option deployable today."
- "leanSPHINCS" / sig.golf (github.com/leanEthereum/sig.golf). A draft "autoresearch competition" for "the post-quantum hash-based signature of Ethereum accounts". Metric: signatureBytes x verificationWork. Targets: 32-byte public keys, 1.5 s signing, 64 KiB RAM ceiling (hardware wallets), 124-bit security at 2^20 signatures. Submissions are not open and no baseline is accepted yet (rules v0.22).

### Account abstraction is the migration path

The consistent line from ethresear.ch (asanso, "The road to Post-Quantum Ethereum transaction is paved with Account Abstraction", Feb 2025), pq.ethereum.org and ethereum.org is: do not enshrine a single PQ scheme for all accounts. Give accounts "signature agility" through account code so each can switch on its own schedule with no flag day. EIP-8141 describes itself as "a native off-ramp from the elliptic curve based cryptographic system used to authenticate transactions today, to post-quantum (PQ) secure systems", and says it "decouples accounts from their cryptographic keys, enabling native key rotation". Vitalik's reply in the asanso thread: protocol-level AA is "exactly" what is needed to fully de-enshrine ECDSA.

EIP-7702 alone is not enough. Its delegation is authorised by the secp256k1 key, and that key can later re-delegate, so a quantum attacker who recovers the key can undo the migration. That is why EIP-8298 (adopt real code, so ECDSA transactions from the account become invalid under EIP-3607) and EIP-8151 (ecRecover stops honouring the old key for `permit`-style contract auth) exist as a pair.

## 3. Recursive proof aggregation

### The idea

PQ signatures are big and there is no BLS-style algebraic aggregation for them. The replacement is: prove in a SNARK/STARK that "for all k, Verify(pk_k, msg_k, sig_k) = true", and verify one proof instead of N signatures. Recursion lets many aggregators each prove a batch and then a final proof verifies the child proofs. The EF paper calls this "the folklore method of aggregating signatures via (hash-based) succinct arguments". Hash-based STARKs are themselves post-quantum, so the whole stack stays on the hash assumption.

### Consensus layer (leanVM / leanMultisig)

Devnet history: pq-devnet-0 (Oct 2025, multi-client), devnet-1 (Dec 2025, leanSig integrated), devnet-2 (Jan 2026, SNARK aggregation), devnet-3 (Feb 2026, separate aggregator role), devnet-4 (H1 2026, recursive aggregation), devnet-5 (29 May 2026, one block-level recursive proof, eight clients, 1,024 validators). Eight consensus clients are involved (Ream, Zeam, Qlean, Lantern, a Lighthouse fork, ethlambda, gean, Peam).

leanVM is a minimal hash-based zkVM (WHIR polynomial commitment, sumcheck, logup). The aggregation program verifies raw signatures directly or verifies child proofs of itself. Measured on an M4 Max with Poseidon: ~1,193 signatures/s at the leaf with ~377 KiB proofs; a three-level tree over 5,519 signers gives a 128 KiB proof in 0.635 s (goatresearch survey, secondary). Target is 10,000 signatures in one second; current is 7 to 8x short. The binary-field rewrite after the Poseidon pivot is expected to change these numbers.

### Execution layer (accounts)

The plan on pq.ethereum.org is precompiles first, then PQ transaction types, then "PQ sig aggregation". Vitalik's February post says EIP-8141's "validation frames" allow bundled signatures and proofs to be "replaced with a single compressed proof". The SPHINCS- post describes the intended mechanism: a transaction declares a `(scheme, data_hash, verification_key)` dependency instead of carrying the signature; block builders fold all such claims into one recursive STARK carried in the block, and the per-transaction verification cost drops to roughly 3,000 gas. The post calls this a draft EIP but I could not find it published; the EIP-8141 text as of today only reserves space for it: "The raw `signature` byte strings of protocol-validated schemes are intentionally not introspectable by EVM code to allow future aggregation schemes." Treat the aggregation transaction format as UNVERIFIED / not yet an EIP.

### What this imposes on a shared account core

Nothing here is written as a normative standard yet, but the design constraints fall out of the mechanism:

1. The verification predicate must be cheap inside a proof system. That means a hash-based scheme with a hash the prover is fast at. Keccak was expensive to prove; the SPHINCS- author notes SPHINCS- "could still use the aggregation pipeline, but signers would absorb STARK-wrapping costs client-side". After the August pivot the answer is SHA-2 or BLAKE, with the exact pick open. Lattice schemes (ML-DSA, Falcon) are awkward to prove, so they are handled by precompiles and stay outside the aggregation plan.
2. One hash everywhere. The lean stack uses a single hash for the signature, the Merkle tree, Fiat-Shamir and the recursion verifier. An account scheme that wants to ride the same aggregator should use the same hash family, or accept a wrapping cost.
3. The account must not read its raw signature. If the EVM code needs the signature bytes (to hash them, log them, forward them to another contract), aggregation is impossible. EIP-8141 already hides protocol-validated signatures from the frame code; the account's validation frame sees "approved" or not.
4. The account must accept a proof of validity for a key in place of a signature. Concretely: the account's verification key (a 32-byte root for a hash-based scheme) is what gets committed to, and the block's proof asserts "a valid signature under this key over this data hash exists". Vitalik's minimal keystore rollup design already takes this shape: each keystore entry holds `(data, vk)` and updates are authorised by "a SNARK that passes the verification key stored at state[A].vk".
5. Low signature budgets are acceptable. Both SPHINCS- and leanSPHINCS assume 2^14 to 2^20 signatures per key, so a shared account core should make rotating to a fresh key routine, and should count signatures per key if it wants to warn users.

## 4. Practical migration for an account with a keystore

### Prior art

- Vitalik, "Dedicated minimal rollup for keystores" (notes.ethereum.org). A key-value map: key is a field element, value is `(data, vk)`. Supported key types listed: secp256k1, secp256r1, EdDSA, ZK-email style proofs, and "Winternitz signatures" for quantum safety. A slot is initialised at `hash(data, vk)`, which gives counterfactual addresses, and later updated by a SNARK against the stored `vk`. Accounts on L1/L2 read the keystore through a CREATE2-derived address plus a ZK claim about the stored data.
- EIP-8130 Keystore Accounts. Canonical authenticators k1, p256, passkey, delegate. Actors are authorised and revoked via `AuthorizeActor` / `RevokeActor` under admin scope. "The set is expected to grow over time to enshrine new canonical authenticators as signature algorithms mature." A PQ authenticator would first exist as a contract, then be canonicalised in a fork. It has an account lock with an `unlock_delay` (uint16 seconds, ~18.2 h max) and a "local epoch" counter to invalidate outstanding signatures at once.
- EIP-8141: signature schemes SECP256K1 (2,800 gas), P256 (6,700 gas), ARBITRARY (100 gas, witness bytes interpreted by the account). Any PQ scheme today goes through ARBITRARY plus contract code (or a precompile).
- ERC-8373 "Post-Quantum Anchored Key-Binding" (ethereum/ERCs PR #1932, filed 6 August 2026). Publishes a classical-to-PQ key binding on chain with a consumer-defined cutoff timestamp; after cutoff anything without a PQ signature "fails closed". Supports ML-DSA-65 and SLH-DSA-SHA2-192s. Includes rotation, revocation and three recovery classes. Status: draft PR, UNVERIFIED whether it has an ERC number assigned beyond the thread title.
- "Post-quantum account recovery registry" (ethresear.ch, Dec 2024). User registers `sha256(secret)` now; in an emergency, proves knowledge of the secret in a STARK to migrate. Proposes a 6-month delay on overwrites to detect quantum-driven takeovers.
- Marco López, "Migration Strategies for EOAs under the Quantum Threat" (ethresear.ch, 16 Jan 2026). Lists what breaks after a signature-layer migration: `ecrecover` used as identity in deployed contracts, ERC-2612 `permit`, `tx.origin` checks, L2 identity drift, MEV during the delegation/revocation window.
- Academic: "Post-Quantum Migration for Bitcoin and Ethereum: Hidden-Key Proofs, Finalization, and Enforcement" (eprint 2026/352) and "Post-Quantum Blockchains with Agility in Mind" (eprint 2026/609). Skimmed only.

### What "seamless" requires, put together

The account address is the identity. Keys are rows in a keystore. Rotation changes rows. The address never changes.

1. Rows typed by scheme. Each row is `(scheme id, verification key, scope, added at)`. Today's rows: secp256k1, P-256 passkey. Tomorrow's row: a 32-byte hash-based root (leanSPHINCS / SPHINCS-), or an ML-DSA/Falcon key if precompiles land first. The keystore must accept a row whose verification key is a bare 32 bytes as well as one that is 20 KB (expanded ML-DSA key per EIP-8051), so store a hash of the key and pass the full key as witness.
2. Add before remove. The user adds a PQ row while the classical rows still work, tests it, then retires the classical rows. Migration is a normal key rotation, which is why the EF says no flag day is needed.
3. A delay on removing the last PQ row and on re-adding a classical row. The keystore-rollup and registry proposals both use a time delay so the real owner can notice and cancel a hostile change. EIP-8130's `unlock_delay` is the same shape. The number is a policy choice; the registry post used 6 months, EIP-8130 caps at ~18 hours, so there is no consensus.
4. Kill the classical fallback for real. Removing a row from the keystore is not enough if (a) the account is an EIP-7702 delegated EOA, because the ECDSA key can re-delegate, or (b) any contract still honours `ecrecover(addr)` as authority. EIP-8298 fixes (a) by turning the EOA into a real code account; EIP-8151 fixes (b) at the precompile. Until they ship, address continuity and full quantum safety do not coexist for EOAs. Accounts that were never EOAs (ERC-4337 or native) never had the problem.
5. Signature budget tracking. Hash-based account keys are good for 2^14 to 2^20 signatures. The keystore should hold a counter or force rotation on a schedule; SPHINCS- notes security degrades "predictably" past the budget, so a warning at, say, 80% is enough.
6. Proof-compatible verification. If the account expects to get its PQ verification aggregated later, it must (a) verify via a scheme whose hash the prover supports, (b) never introspect signature bytes, and (c) be happy with "the block proved a signature exists under vk over this hash". That means the account's validation entry point should take `(vk hash, data hash, approval)` in place of `(signature bytes)`.
7. Multi-chain. Vitalik's keystore-rollup answer is one keystore read by every chain through proofs, so a rotation on the keystore reaches all chains at once. Without that, rotation is per chain, which is where most "seamless" claims fall over.

### Open items a writer should not overstate

- No PQ scheme is enshrined for accounts. EIP-8051/8052/7885 are drafts, none is in Glamsterdam or Hegotá.
- EIP-8141 ships (expected) in Hegotá 2027, but it only supplies ARBITRARY validation. The aggregation format is not an EIP yet.
- The hash pick after the Poseidon exit is open. Every performance number for leanVM is pre-pivot.
- EF timelines: L1 upgrades "could be completed by 2029"; user migration runs longer.

## Sources

- https://pq.ethereum.org/
- https://ethereum.org/roadmap/security/quantum-resistance/
- https://leanroadmap.org/
- https://strawmap.org/
- https://csrc.nist.gov/pubs/fips/205/final
- https://nvlpubs.nist.gov/nistpubs/fips/nist.fips.205.pdf
- https://eips.ethereum.org/EIPS/eip-8051
- https://eips.ethereum.org/EIPS/eip-8052
- https://eips.ethereum.org/EIPS/eip-7885
- https://eips.ethereum.org/EIPS/eip-7932
- https://eips.ethereum.org/EIPS/eip-8141
- https://eips.ethereum.org/EIPS/eip-8130
- https://eips.ethereum.org/EIPS/eip-8298
- https://eips.ethereum.org/EIPS/eip-8151
- https://ethereum-magicians.org/t/eip-8052-precompile-for-falcon-support/25860
- https://ethereum-magicians.org/t/eip-8051-ml-dsa-verification/25857
- https://ethereum-magicians.org/t/erc-8373-post-quantum-anchored-key-binding/29225
- https://github.com/ethereum/ERCs/pull/1932
- https://ethereum-magicians.org/t/post-quantum-account-recovery-registry/22256
- https://ethresear.ch/t/the-road-to-post-quantum-ethereum-transaction-is-paved-with-account-abstraction-aa/21783
- https://ethresear.ch/t/migration-strategies-for-eoas-under-the-quantum-threat-breakages-and-open-questions/23864
- https://ethresear.ch/t/sphincs-minus-efficient-stateless-post-quantum-signature-verification-on-the-evm/25165
- https://github.com/leanEthereum/sig.golf
- https://github.com/leanEthereum
- https://github.com/b-wagn/hash-sig
- https://eprint.iacr.org/2025/055.pdf
- https://cic.iacr.org/p/2/1/13
- https://notes.ethereum.org/@vbuterin/minimal_keystore_rollup
- https://eprint.iacr.org/2026/352.pdf
- https://eprint.iacr.org/2026/609.pdf
- https://eprint.iacr.org/2026/1660
- https://x.com/drakefjustin/status/2087905684180418733 (Poseidon exit; I could not fetch it directly)
- https://www.bankless.com/read/news/justin-drake-the-ef-is-moving-away-from-poseidon-for-ethereum-l1
- https://postquantum.com/security-pqc/ethereum-roadmap-drops-poseidon/
- https://hackmd.io/@goatresearch/H1G2tOCwGx
- https://www.coindesk.com/tech/2026/02/26/vitalik-buterin-unveils-ethereum-roadmap-to-counter-quantum-computing-threat
- https://www.coindesk.com/tech/2026/01/24/ethereum-foundation-makes-post-quantum-security-a-top-priority-as-new-team-forms
- https://www.theblock.co/news/ecosystems/2026-09-15-ethereum-base-account-abstraction-proposals-414775
- https://cryptobriefing.com/ethereum-eip-8141-hegota-upgrade/
