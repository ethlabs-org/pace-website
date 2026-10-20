---
# the floating dock is fixed over the content column and covers body text
showAskAi: false
---

# EIP-7906, Safenet, Blockaid, Hypernative, and co-signer standards

Research date: 2026-09-21. Everything below was checked against the live pages listed under Sources. Items I could not confirm are marked UNVERIFIED.

## 1. EIP-7906

### Identity

- Exact title: **EIP-7906: Transaction Assertions via State Diff Opcode**.
- Type: Standards Track, **Core** (not an ERC). It is a protocol change and needs a fork.
- Status: **Draft**.
- Created: 2025-02-21. Last commit to `EIPS/eip-7906.md`: 2026-09-21 (per-topic event views, TXDIFF 0x0B/0x0C). It has been edited eleven times since August 2026, so treat any summary older than a month as stale.
- Authors: Alex Forshtat, Shahaf Nacson, Dror Tirosh, Yoav Weiss, Fredrik Svantes.
- Requires: EIP-2929, EIP-8141.
- Discussion: ethereum-magicians thread 23130. The thread was originally titled "EIP-7906: Restricted Behavior Transaction Type". That was the first design (a transaction type that pre-declared what it may touch). It was rewritten into the current opcode design in 2026.

So the guess "Balance-change assertions" is close but not the name. The EIP number is right. There is no separate EIP for "expected balance change bounds that the account checks after execution". 7906 is that proposal.

### Mechanism

The assertion is a normal contract call that runs after the transaction body. It lives in a **frame** of its own, separate from the main call’s calldata, and no precompile is involved.

- EIP-8141 (Frame Transaction, tx type 0x06) splits a transaction into up to 64 frames. Each frame has a mode, a target, calldata and gas limits. 8141 defines modes DEFAULT (0), VERIFY (1), SENDER (2).
- 7906 adds mode **POST_TX (3)**. POST_TX frames must be a contiguous suffix of `tx.frames`. Caller is ENTRY_POINT. They run as STATICCALL, so they cannot write state.
- Inside a POST_TX frame three new opcodes are legal:
  - `TXTRACE(param, index)`: enumerate the transaction's state diff. Params 0x00 to 0x15 cover counts and per-index values for balance changes (address, before, after), storage changes (address, slot, before, after), deployed contracts (address, codehash), events (emitter, topic count, topics 0 to 3, data length), plus gas pre-charge and payer address.
  - `TXDIFF(param, in2, in3)`: keyed lookup. Params 0x00 to 0x0C: storage slot before/after for (address, slot), balance before/after for an address, codehash before/after, per-address slot and event counts with index mapping back to TXTRACE, an `account_change_flags` bitmask (nonce/balance/storage/code changed), and per-topic event counts.
  - `EVENTDATACOPY(event_index, memOffset, dataOffset, length)`: copy non-indexed event data to memory, same semantics as CALLDATACOPY.
- "Before" values are the transaction prestate. "After" values are the state at the moment the opcode runs.
- If a POST_TX frame reverts or halts, the **entire execution body is reverted**. The transaction stays valid, is included, gas is paid, and the receipt has `status = 0`. The validation prefix (VERIFY frames) is not rolled back. The authors explain this is to avoid a builder DoS vector.
- Gas: direct lookups use EIP-2929 warm/cold costs. Enumeration views cost a flat `TXTRACE_GAS_COST` (still TBD).

### What can be asserted

Anything computable from the diff: ETH balance deltas per address, ERC-20 balances via storage slot before/after (needs the slot key), "nothing else changed" shields via `account_change_flags == 0`, "this exact Transfer event with these topics was emitted", "no new contract was deployed", "codehash of X did not change". Bounds are whatever the assertion contract's Solidity computes. There is no fixed schema of "expected delta" in the protocol. The wallet chooses or writes the assertion contract and passes its parameters as the POST_TX frame's calldata.

### On-chain or off-chain

Fully on-chain. Assertions are enforced by the EVM at execution time. This is the point the authors keep making in the thread: RPC-level or simulation-level checks can be bypassed by rebroadcasting to another node, on-chain assertions cannot.

### Is it statically analyzable / hardware-signer friendly

Partly, and this is the nuance for the site copy.

- The **assertion parameters** are plain calldata to a known contract. If the wallet uses a fixed, audited assertion contract (say "balance of token T at my address must increase by at least N, and no other storage of mine may change"), a hardware signer can render the calldata with an ERC-7730 descriptor without running a simulation. That rendering is exactly what the wallet promised, because the chain enforces it.
- The EIP itself **does not mention** hardware wallets, clear signing, or static analysis. The magicians thread does. Participants point to ERC-7730 (clear signing format) and ERC-8317 (Contract Storage Layout Descriptor Format) as the pieces needed to render storage-slot assertions on a hardware device. The consensus in the thread is that arbitrary assertions still need simulation plus layout metadata to be readable. A fixed assertion vocabulary is readable without simulation.
- Statement that is safe to make: "7906 makes the *outcome* enforceable on-chain; whether the signer can read it without simulating depends on the wallet using a fixed assertion contract with a 7730 descriptor." Statement that is not safe: "7906 is statically analyzable by itself."
- The EIP requires the account's VERIFY frame to check that its required POST_TX frame is present and that the target is an immutable contract. It gives pseudo-code that walks `tx.frames` backwards. EIP-8141 provides the introspection opcodes for this (`FRAMEPARAM`, `FRAMEDATALOAD`, `FRAMEDATACOPY`).

### Roadmap

- EIP-8081 (Hardfork Meta: Hegotá) lists EIP-8141 as **Scheduled for Inclusion** and EIP-7906 as **Proposed for Inclusion**.
- The EF Protocol tier list of 2026-09-07 rates 8141 S tier ("must ship") and 7906 A tier ("expected to ship"), noting 7906 is "currently running with Frames on a public devnet". Ethrex has an implementation PR (#6891, June 2026).
- Bankless (2026-09-02) says Hegotá mainnet is possible in 2027 and 7906 may slip to the following fork.

### Fit with EIP-8141 and EIP-8130

- 8141: 7906 is an extension of 8141. It cannot run in legacy or 1559 transactions. A frame transaction from a contract account would look like: VERIFY frame (account checks signature and checks that the POST_TX frame is present), SENDER frame(s) (the actual calls), POST_TX frame (assertion).
- 8130 (Keystore Accounts, Base, Draft, created 2025-10-14, author Chris Hunter, tx type 0x79): 8130 is a different account model and **does not include 7906 or frames**. In September 2026 Ethereum and Base announced they had stopped trying to merge 8130 and 8141. 8141 goes to L1 in Hegotá; 8130 proceeds on Base. So a keystore account on Base today has no protocol hook for post-execution assertions. The nearest 8130 concept is the POLICY scope: a policy-gated actor may only call its `manager` contract, and the manager enforces "what the call may do" before execution only. If the site wants to show 7906 assertions on an 8130 account it should say that is a proposal, UNVERIFIED as any concrete design.

## 2. Safenet (Safe)

### What it is today

Two things carry the name, and the docs site mixes them.

1. The older design (2024, still on docs.safe.global/safenet): a cross-chain "guarantee" network with Processor, Validator, Liquidity Provider, Resource Lock, Universal Balance, settlement and challenge flows. Those pages did not render through my fetch tool, so the current wording is UNVERIFIED. The nav items (chains, architecture, validator, guarantee, challenge, universal balance) are confirmed to exist.
2. The product that launched: **Safenet Beta**, announced 2026-04-02 at EthCC. This is a **decentralized transaction validation network**. Mechanism:
   - A network of validators evaluates each proposed Safe transaction against security rules.
   - If it passes, validators produce a cryptographic attestation. The network is BFT; up to one third dishonest validators tolerated.
   - A **Safe Guard** installed on the user's Safe verifies the attestation on-chain in `checkTransaction`. Without a valid attestation the transaction does not execute.
   - Users keep self-custody: an unattested transaction can be executed anyway with explicit additional owner approval after a time delay.
   - Beta checks are configuration-protection rules: block unexpected delegatecalls, restrict upgrades to trusted contracts, block untrusted module installs, restrict fallback handler and guard changes. Bankless lists five, the Safe Foundation post groups them as three.
   - Genesis validators: Greenfield, Gnosis, Safe Labs, Rockaway, Blockchain Capital, Core Contributors GmbH, each staking at least 3.5M SAFE. Staking UI for SAFE holders went live the same day. Rewards and slashing wait on SafeDAO vote SEP-55.
   - Chains: not stated in any launch material I could load. UNVERIFIED.

So the honest one-liner is: Safenet is a co-signer network. It is "a threshold of staked validators signs an attestation; a Guard requires it". It is not a single co-signer key and it is not (yet) a general policy engine; the beta rules cover the Safe's own configuration and say nothing about token flows.

### Public co-signing API

- I found **no public API** for third parties to request a Safenet attestation for an arbitrary account. The launch posts talk about "users and integrators" paying fees in the long run, nothing more. UNVERIFIED whether an integrator API exists behind a partner agreement.
- What Safe does publish for do-it-yourself co-signing:
  - Safe Research blog "Cosigners: Safety Nets for Self-Custody" (2025-07-23): defines a cosigner as an independent extra signer whose signature a Guard verifies. The checks run off chain and the enforcement is on chain.
  - **Varangian** template (github.com/safe-research/varangian-template): a self-hosted cosigner running in GitHub Actions. It polls the Safe transaction service, signs with its own key, and the Safe has a "Safenet Guard" contract that checks that signature (EIP-1271 or EOA encoding).
  - **Fiducia** (2025-08-21, github.com/safe-research/fiducia): a Guard with allowlists of (target, selector, call type). Anything not on the list either waits a configurable delay (example: 24 hours) or executes immediately if a cosigner signature is attached. It is research; there is no product.

## 3. Blockaid and Hypernative

### Blockaid

- Core business: transaction simulation and threat detection API (dApp, token and transaction scanning, used by wallets and by Fordefi, Coinbase etc.).
- **Cosigner** (launched 2025-04-15, page blockaid.io/cosigner): an actual co-signer of a threshold key set.
  - It is "a fully native signer within a multisig wallet". Supported: Safe, Fireblocks, Squads, Utila (site lists these as out-of-the-box).
  - Implementation for Safe: Cosigner is itself a Safe with a 1-of-2 threshold. Owner 1 is the Blockaid Signer (key held by Blockaid, signs only after simulation plus policy pass). Owner 2 is an Override Signer held by the customer for manual approvals. That nested Safe is added as an owner of the customer's Safe. Blockaid says it can be configured as optional or mandatory in the signing policy, which in Safe terms means whether the threshold is set so the quorum cannot be reached without it.
  - Policy engine: "label-based" custom rules (treasury transfers, unknown contracts, value thresholds). In 2026 they added "Recommended Policies", AI-drafted from wallet history, approved by the team.
  - Chains: Ethereum mainnet plus 6+ EVM chains (Base, Optimism, Polygon named in a customer quote). Squads implies Solana.
  - API: docs.blockaid.io sits behind a login, so I could not verify a public Cosigner API. The scanning APIs and Node/Python SDKs are public on GitHub. Cosigner onboarding appears to be dashboard/sales driven. UNVERIFIED that a third-party wallet can call "cosign this hash" programmatically.
- Answer to the question "can Blockaid act as a co-signer of a threshold key": yes, that is literally the product, for multisig and MPC wallets. For a native keystore account (8130) or an 8141 frame account there is no announced integration.

### Hypernative

- Products as of today: Platform (monitoring plus automated response), **Transaction Guard** (formerly marketed as Guardian; the current product page uses "Transaction Guard"), Fraud Prevention API, Wallet Protection, Screening & Intelligence. The "Hypernative Firewall" page exists and describes an **on-chain oracle** that protected protocol contracts query before letting an unknown address interact (allow/deny). That enforcement sits on the protocol side; the wallet is not involved.
- Transaction Guard / Guardian: pre-signing simulation plus policy engine. Sub-second. Native in Safe (safe.global/safeshield, partnership announced 2025-11-20, 70+ networks) and Fordefi; via API into Fireblocks, Utila, Copper and other MPC wallets. Policies can auto-approve, route to manual review, or reject.
- **Does it co-sign?** The product page says it "intercepts and inspects it before any signatures are collected", operates "as an intelligence layer within your signing workflow", and "No changes to your custody architecture required". The Safe partnership post says final approval stays with the Safe signers. So Hypernative does not hold a key in the quorum. In MPC wallets it plugs into the wallet's policy or callback layer (Fireblocks-style API co-signer callbacks) and holds no key of its own. The Edge Capital case study talks about Guardian "blocking" transactions; that is policy enforcement at the wallet and involves no signature. UNVERIFIED whether any deployment gives Hypernative an actual key.
- Summary line for the site: Blockaid = signer in the quorum; Hypernative = gate before signing plus on-chain firewall oracle for protocols; Safenet = staked validator network whose attestation a Guard demands.

## 4. Standards for co-signer / guardian / policy signatures

### Safe Guards

- Interface: `checkTransaction(...)` before execution, `checkAfterExecution(txHash, success)` after. A Guard can revert in either. Introduced in Safe v1.3.0. Safe v1.5.0 adds **module guards** that filter module calls too.
- Co-signer pattern: put the cosigner signature in the Safe `signatures` blob or in a side channel; the Guard verifies it in `checkTransaction`. This is what Safenet, Varangian, Fiducia and Blockaid-style guards do. Blockaid instead uses the plain owner route (nested Safe as owner), which needs no Guard.
- Warning from Safe docs: a broken Guard is a denial of service on the Safe, so guards need a removal path (Fiducia schedules removal through the same delay).

### ERC-7579 (Minimal Modular Smart Accounts)

- Status Draft, created 2023-12-14, authors zeroknots, Konrad Kopp, Taek Lee, Fil Makarov, Elim Poon, Lyu Min.
- Module types: Validator (1), Executor (2), Fallback (3), Hook (4). Hooks: `preCheck(msgSender, value, msgData) returns hookData` and `postCheck(hookData)`.
- "Key + co-signer both sign" is done inside a **validator**: the validator decodes two signatures from `userOp.signature` and requires both (Rhinestone's OwnableValidator with threshold, Smart Sessions with policies). The standard itself says nothing about multiple validators or policy modules; that lives in extensions such as ERC-7780 (policy/signer modules) and the Smart Sessions module. Hooks give the "after execution" check but only see the account's own calls and never the global diff. That gap is what 7906 fills.

### ERC-6900

- Status Draft, created 2023-04-18, Alchemy-led. Types: validation functions, validation hooks, execution functions, execution hooks (pre and post). A co-signer maps to a **validation hook** that runs before the main validation and can require a second signature, or to a validation function that checks two signatures.

### Modelling it in a native keystore (EIP-8130)

- 8130 has one `sender_auth` per transaction. The authenticator contract returns one `actorId`. There is no threshold or two-signature concept in the protocol. Options within the spec:
  1. **Custom authenticator.** "Any contract implementing `IAuthenticator` can be permissionlessly deployed and registered". On L1 profile any authenticator is accepted on the transaction path; on the L2 (canonical-only) profile only k1, p256, passkey, delegate are accepted at the protocol level. A "key AND co-signer" authenticator would parse two signatures from `data` and return the actorId only if both verify. On Base that authenticator would not be usable on the native tx path today. UNVERIFIED whether Base plans to allow more.
  2. **POLICY scope + manager.** Register the key as a policy-gated actor. The manager contract is the only allowed target. The manager can require a co-signer signature in its calldata (Blockaid or Safenet style attestation), check spend limits, then forward the call. This is the closest thing to a Guard in 8130 and it is pre-execution only.
  3. **Delegate authenticator.** Register the co-signer's own account as a delegate actor. That gives "either key" semantics, so it does not model a co-signer requirement, which needs both keys.
- In an EIP-8141 account the same two options exist (a VERIFY frame that checks two signatures, or a VERIFY frame that checks one key plus a co-signer attestation over the frame list), plus 7906 for the post-execution check.

## Getting the wording right

- Say "EIP-7906, Transaction Assertions via State Diff Opcode, Draft, Core". Not an ERC.
- Assertions run in a POST_TX frame of an EIP-8141 transaction and revert the whole body if they fail. The check runs on chain, with no simulation involved.
- Do not claim 7906 alone gives hardware-signer readability. Pair it with a fixed assertion contract and an ERC-7730 descriptor.
- 8130 accounts have no 7906 today; the two proposals split in September 2026.
- Safenet: staked validator network, attestation checked by a Guard, beta since 2026-04-02, rules are Safe-config protection, no public co-sign API found.
- Blockaid Cosigner is a real signer (nested 1-of-2 Safe as owner). Hypernative is a pre-sign gate and holds no key.

## Sources

- https://eips.ethereum.org/EIPS/eip-7906
- https://github.com/ethereum/EIPs/blob/master/EIPS/eip-7906.md
- https://github.com/ethereum/EIPs/commits/master/EIPS/eip-7906.md
- https://ethereum-magicians.org/t/eip-7906-transaction-assertions-via-state-diff-opcode/23130
- https://www.bankless.com/read/what-eip-7906-would-change-about-ethereum-transactions
- https://eips.ethereum.org/EIPS/eip-8141
- https://github.com/ethereum/EIPs/blob/master/EIPS/eip-8141.md
- https://eips.ethereum.org/EIPS/eip-8130
- https://github.com/ethereum/EIPs/blob/master/EIPS/eip-8130.md
- https://ethereum-magicians.org/t/eip-8130-account-abstraction-by-account-configurations/25952
- https://eips.ethereum.org/EIPS/eip-8081
- https://blog.ethereum.org/en/2026/09/07/protocol-hegota-eips
- https://crypto.news/ethereum-and-base-abandon-joint-account-abstraction-standard/
- https://safefoundation.org/blog/safe-launches-safenet-beta
- https://www.bankless.com/read/the-1-4b-hack-that-safenet-was-built-to-prevent
- https://www.theblock.co/post/396147/non-custodial-wallet-safe-security-safenet-tokens
- https://safefoundation.org/blog/safe-research-cosigners-safety-nets-for-self-custody
- https://safefoundation.org/blog/safe-research-fiducia-onchain-trust-rules-and-cosigning
- https://github.com/safe-research/varangian-template
- https://docs.safe.global/safenet/chains (did not render, UNVERIFIED)
- https://docs.safe.global/safenet/architecture (did not render, UNVERIFIED)
- https://docs.safe.global/advanced/smart-account-guards
- https://blockaid.io/cosigner
- https://www.blockaid.io/blog/cosigner-the-onchain-security-layer-your-multisig-is-missing-blind-signing
- https://www.hypernative.io/products/hypernative-guardian
- https://www.hypernative.io/products/hypernative-firewall
- https://www.hypernative.io/products/hypernative-platform
- https://www.hypernative.io/insights/blog/safe-and-hypernative-partner-to-bring-enterprise-grade-security-to-multisig
- https://www.hypernative.io/blog/hypernative-guardian-for-web3s-institutional-moment
- https://eips.ethereum.org/EIPS/eip-7579
- https://github.com/ethereum/ERCs/blob/master/ERCS/erc-7579.md
- https://eips.ethereum.org/EIPS/eip-6900
