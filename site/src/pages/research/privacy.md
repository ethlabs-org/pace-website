---
# the floating dock is fixed over the content column and covers body text
showAskAi: false
---

# Ethereum privacy efforts: Kohaku, CROPS, FHE, shielded pools and stealth addresses

Research date: 2026-09-21. Primary sources preferred. Anything I could not confirm in a primary source is marked UNVERIFIED.

## 1. Kohaku

### What it is

Kohaku is an Ethereum Foundation project inside the EF "Privacy cluster". The EF blog post of 8 October 2025 defines it as "a new reference implementation of a privacy-preserving wallet and an open-source wallet SDK, built to make strong cryptography accessible for all." The same post says the Privacy cluster is "coordinated by Igor Barinov and is composed of 47 of the top researchers, engineers, coordinators and cryptographers in the blockchain industry" and lists Kohaku next to the PSE tracks (Private Reads & Writes, Private Proving, Private Identities, Privacy Experience) and the Institutional Privacy Task Force.

The Kohaku roadmap (HackMD, notes.ethereum.org) states the three goals directly:

> "Kohaku is a set of primitives that provides wallets with security and privacy. Kohaku's core goals are : an SDK that exposes strong privacy/security primitives; a power-user-oriented reference implementation wallet that ships on top of that SDK to showcase these features; collaborations with other wallets to implement the SDK either in full or in parts that they care about"

So it is all three: SDK, reference wallet, and roadmap. The reference wallet is a browser extension forked from Ambire: "The browser extension is a fork of Ambire. Development on both the wallet and the SDK will be mainnet first, and progressively add support for Layer 2s." The roadmap also says "This reference implementation will not be a consumer oriented product."

### Repos and packages

- github.com/ethereum/kohaku (SDK). README lists `@kohaku-eth/railgun`, `@kohaku-eth/tornado-cash`, `@kohaku-eth/privacy-pools`, `@kohaku-eth/plugins` ("shielded pool protocols standardized plugin interface"), `@kohaku-eth/provider` ("provider abstraction (ethers, viem, helios, colibri)") and `@kohaku-eth/pq-account` ("post-quantum 4337 account implementation").
- github.com/ethereum/kohaku-extension (the Ambire fork).
- Docs: ethereum.github.io/kohaku. Many pages are still `TODO` stubs (Privacy Pools PPOI/shielding/unshielding/transacting, Railgun accounts). The docs are thin; the READMEs and PRs are more informative.

### Status (September 2026)

- Packages are alpha. Latest GitHub releases on 21 August 2026: `@kohaku-eth/railgun@0.0.1-alpha.30`, `@kohaku-eth/privacy-pools@0.0.2-alpha.16`, `@kohaku-eth/tornado-cash@0.0.2-alpha.21`, `@kohaku-eth/plugins@0.0.1-alpha.13`, `@kohaku-eth/provider@0.1.0-alpha.9`. The README warns: "Some parts of this project are work in progress and NOT READY FOR PRODUCTION USE. Packages contain UNAUDITED CODE."
- Press coverage (The Defiant, Crypto Briefing, 25 May 2026) reports an SDK release with "4337 relaying now operational" for Railgun and production wallets (Ambire, a breadcoop extension) preparing integrations. I could not find an EF blog post for that release. UNVERIFIED as an EF statement, but consistent with the repo.
- The ERC-4337 flow is confirmed by repo issues and PRs. Issue #277 (Railgun) describes unshields "through the Kohaku 4337 flow (Pimlico public bundler, fee paid privately via the paymaster)". PR #280 (merged 14 September 2026) adds the Privacy Pools paymaster path (details below).
- The pq-account package is a 4337 account that verifies "two signatures rather than only one" (ECDSA or P256 plus Falcon/ML-DSA), deployed on L1 Sepolia and Arbitrum Sepolia only. Gas is 1.69M to 8.4M per op depending on the scheme.
- The EF restructure post of 23 June 2026 does not mention the Privacy cluster or Kohaku by name; it lists "L1 privacy" under the Protocol layer. Where Kohaku sits organisationally after that restructure is UNVERIFIED.

### Stated requirements for accounts

**Account abstraction.** The roadmap is explicit:

> "To achieve a secure and private wallet we need the ethereum network to implement native account abstraction. We will be working in that direction over 2026."

> "Bringing privacy-preserving account abstraction, which requires client-side ZK-EVM (or perhaps ZK-RISC-V) proving that you control a given wallet. This lets you have the same wallet control public and private funds."

Feature list items that touch accounts: "One account per dApp. When connecting to a dApp the default behavior is to prompt to use a new address", "Spending policies account policies with spending limits for different signers", "Post-Quantum killswitch with an option to enable Post-Quantum accounts with optimized Falcon / Dilithium solidity verifiers", "Social recovery options through ZKemail, ZKpassport, Anon adhar".

**Homogeneity of account configuration.** I found no Kohaku statement that all accounts must share the same configuration or bytecode to enlarge the anonymity set. UNVERIFIED as a Kohaku requirement. The closest primary statements are:

- Kohaku docs, "Many accounts, many you": "The process to create a new account, top it up, and get going should be as seamless as possible. A good first step would be to have a 'create new' button, when connecting to a dApp. In addition to a privacy-friendly way to top up the your newly created account."
- Kohaku docs, "One account to rule them all": "Spreading your identity across multiple accounts, by for example having one address per dApp could already be a good start."
- Vitalik's "A maximally simple L1 privacy roadmap" (ethereum-magicians, 11 April 2025): "Move the ecosystem toward 'one address per application' by default", "Incorporate privacy tools (eg. Railgun, Privacy Pools) into existing wallets" with a "send from shielded balance" option on by default, and "Make send-to-self privacy-preserving by default".
- EIP-8250 (Keyed Nonces, Draft, April 2026) gives the protocol-level version of the idea: "To avoid binding onchain activity to a unique public sender, users transact through a single shared sender address." The EF "Protocol priorities" post (7 September 2026) lists it for Hegotá so "many users share the same sender for better anonymity".
- PSE roadmap thread: a commenter notes "abstracting gas payments is critical" to prevent privacy leaks from funding empty accounts with ETH.

The inference a writer can safely make: if every fresh account is funded the same way (from a pool, via a paymaster) and looks the same on chain (same implementation, same first transaction shape), the funding transaction does not single it out. But that sentence is mine. Kohaku has not said it.

**Batch execution after private funding.** This is implemented, in PR #280 ("feat: privacy pools v1 paymaster", merged 2026-09-14):

> "The withdrawal is executed as an ERC-4337 userOp from an ephemeral EOA delegated to the user's Simple7702 account; the withdrawal proof rides in `paymasterData` and is executed on-chain by the deployed `PrivacyPoolsFeeAdapter` during paymaster validation. The on-chain paymaster fee is priced via the paymaster oracle, so users pay the withdrawn amount minus fee — no gas of their own."

> "Tail calls (tornado-cash style): pass `tailCalls` to run arbitrary calls (via 7702 `execute`/`executeBatch`) in the userOp's execution phase, atomically with the withdrawal — e.g. a native withdrawal forwarded to another address, or an ERC20 withdrawal batching two token transfers."

> "Ephemeral recoverable signer derived per (deposit, withdraw) pair — no long-lived key per user"

The Tornado equivalent (dyzz/tornado-4337-relayer, referenced as the "tornado-cash style") uses Simple7702Account v0.8 by default, and says "The off-chain relayer signs; its on-chain paymaster verifies the signature and sponsors gas." It also warns: "Atomic does not mean free failure. If execution reverts, the withdrawal, fee and TORN charge roll back, but the paymaster can still lose gas."

So the current Kohaku account model for "receive privately, then act" is: ephemeral EOA, EIP-7702 delegation to a Simple7702 account, gas paid by a paymaster out of the withdrawn amount, and follow-up calls batched into the same UserOperation. There is no pre-deployed contract and no ETH from a linkable source.

**Plugin/keystore requirements.** The plugins README defines what a host wallet must provide: `Host = { network, storage, keystore, provider }` with `Keystore.deriveAt(path)`. "Plugins will derive all new key material from the `Keystore` interface and therefore the host's mnemonic. This makes all such material portable." Example paths: Railgun `m/420'/1984'/0'/0'/x`. The plugin interface exposes `prepareShield`, `prepareTransfer`, `prepareUnshield` (single and multi-asset), `balance`, and `broadcastPrivateOperation`.

## 2. CROPS

Verified. Source: EF Mandate, published 13 March 2026, by the Ethereum Foundation Board.

Blog post sentence: "Ethereum must, above all, remain censorship resistant, open source, private, and secure (CROPS)."

The mandate page (ethereum.org/foundation/mandate/) lists the four as:

- Censorship Resistance
- Open Source and Free, as in Freedom
- Privacy
- Security

And: "We hold that these properties - CROPS - must remain, as an indivisible whole, the sine qua non of all Ethereum's development priorities, which cannot be displaced."

On privacy defaults, relevant to wallets: "We strongly advocate for maximal privacy to become the default for user data to the greatest extent possible: first in any tools that sit above the protocol that the Ethereum Foundation builds, and then ultimately in the protocol itself from the very core on out."

Note: "Open Source" is expanded on the page as "Open Source and Free, as in Freedom". The one-line version in the blog post is just "open source". Both are EF text.

## 3. FHE on Ethereum: Zama, Fhenix, Inco

### Zama Protocol (FHEVM)

Architecture (docs.zama.org): FHEVM Solidity library; host contracts on the EVM chain that "manage access control and trigger off-chain encrypted computation"; coprocessors that "verify encrypted inputs, run FHE computations, and commit results"; a Gateway that "validates encrypted inputs, manages access control lists (ACLs), bridges ciphertexts across chains, and coordinates coprocessors and the KMS"; a KMS that is "a threshold MPC network that generates and rotates FHE keys, and handles secure, verifiable decryption"; and a Relayer, "a lightweight off-chain service that helps users interact with the Gateway by forwarding encryption or decryption requests." The delegated-decryption guide says the Gateway runs on Arbitrum.

What a wallet has to do:

1. Encrypted inputs. An input is a handle plus `inputProof` (bytes) that "contains the ciphertext and the associated zero-knowledge proof used for validation." "Each encrypted input is accompanied by a proof verifying that the user knows the plaintext value of the ciphertext, preventing replay attacks or misuse." The client calls `createEncryptedInput(contractAddress, userAddress)`, so the proof is bound to the target contract and the sender. The contract calls `FHE.fromExternal`, which "ensures that the input is a valid ciphertext with a corresponding ZKPoK." For a contract account this means the userAddress bound in the proof must be the account address that ends up as msg.sender. Binding it to the signer key does not work.
2. ACL. `FHE.allow(ct, addr)` grants persistent access; `allowThis` is shorthand for the contract itself; `allowTransient` grants access "only for the duration of the current transaction". `isSenderAllowed` checks msg.sender.
3. User decryption. Wallet flow from the docs: generate a transport keypair (`generateKeypair`), build an EIP-712 request (`createEIP712`) naming the contracts, sign it with the wallet, call `userDecrypt`. The KMS re-encrypts under the transport public key and the client decrypts locally. The wallet guide says: "the user authorizes the wallet's session via an EIP-712 signature, after which the SDK performs user decryption to obtain the cleartext value. The session signature is cached." And a UX rule: "Don't trigger the first signature automatically. Gate the initial EIP-712 prompt behind an explicit user action."
4. Delegated user decryption. On-chain `delegateUserDecryption(delegate, contractAddress, expiration)` (or without expiration). "The delegate never receives the delegator's private keys — they use their own transport key pair and a delegated EIP-712 flow to prove they have permission." Expiry must be at least 1 hour out. The changelog lists "Complete end-to-end support for delegated user decryption" in v0.11 (Feb 2026) and "All-contracts delegation via sentinel address 0xfff...fff" in v0.13 (June 2026).
5. Public decryption. Contracts request decryption via the oracle and receive a callback; the older `FHE.requestDecryption` path was marked deprecated in v0.9.
6. Tokens. Confidential tokens follow ERC-7984; the SDK exposes `Token.confidentialTransfer`. Wallets should "Always show current operator approvals with expiry and a one-tap revoke."

Smart-account concern: the EIP-712 signature for user decryption is verified off-chain by the relayer/KMS. Whether it accepts ERC-1271 contract signatures is not stated in the pages I read. UNVERIFIED.

Status: changelog says mainnet and testnet both run FHEVM v0.13 (June 2026). zama.org says the protocol is live on Ethereum mainnet with confidential USDC/USDT deployments. Exact mainnet launch date not pinned down in primary docs. UNVERIFIED date.

### Fhenix (CoFHE)

CoFHE is "Fhenix's FHE coprocessor for EVM-compatible blockchains. It processes encrypted data off-chain and returns encrypted results to any EVM chain." Status from fhenix.io: "CoFHE is currently live on public testnets — Ethereum Sepolia, Arbitrum Sepolia, and Base Sepolia — with mainnet planned to follow." No mainnet date.

Wallet integration via cofhejs: encrypt "Packs plaintext values, generates a ZKPoK, and submits them to the CoFHE verifier's batch endpoint." Decryption is authorised by permits: the SDK "manages the EIP-712 Access Control Permissions (ACPs) that authorize those decryptions". Unseal returns plaintext locally, or with a "Teecryptor signature for onchain verification". So Fhenix has the same shape as Zama (ZKPoK on input, ACL on chain, EIP-712 permit for read), with a TEE-backed decryptor.

### Inco (Lightning)

Inco Lightning is TEE-based. It does not use FHE. Components page: "The Confidential Compute Server runs inside a Trusted Execution Environment (TEE) and securely handles all confidential operations." Inputs page: "Inco will decrypt the corresponding ciphertext safely inside its TEE after the transaction has been included onchain." Live "on Base" per docs.inco.org; Solana in beta. An FHE mode ("Atlas") is mentioned in secondary coverage only. UNVERIFIED.

Wallet-relevant details: inputs are ciphertext bytes, no ZK proof; `newEuint256(bytes, msg.sender)` binds the input to the caller and "This account should always be the one that created the input, it will be given decryption right over the handle." A per-ciphertext fee is required: `msg.value >= inco.getFee() * ciphertextCount`. A contract account calling this must therefore forward ETH. Access via `e.allow(ct, addr)` and `e.allowThis`. The JS library "Handles ephemeral key and EIP-712 signature generation for decryption requests" and "Decrypts results locally for the user."

### Common wallet requirements across the three

- Client-side encryption under a network public key, with a ZKPoK (Zama, Fhenix) or without (Inco).
- The input is bound to (contract, user address). For a contract account the bound address must be the account.
- On-chain ACL; the app grants the account address read rights.
- Read = EIP-712 signature over an ephemeral transport key; response re-encrypted to that key.
- Delegated read: Zama has it on chain with expiry; Fhenix permits can be scoped; Inco has session-key vouchers (docs title "Allowance Voucher", content not read).

## 4. Privacy Pools, Railgun, stealth addresses: what a shared account core must do

### Privacy Pools (0xbow)

Live on Ethereum mainnet: Entrypoint proxy `0x6818809eefce719e480a7526d76bd3e561526b46`, `PrivacyPool ETH` `0xf241d57c6debae225c0f2e6ea1529373c9a9c9fb`. Only mainnet is listed on the deployments page. Design: deposits are screened by an Association Set Provider; withdrawals prove membership in the approved set; "Ragequit Mechanism: Allows original depositors to recover funds if their funds are not approved by the ASP by publicly exiting the privacy pool."

Withdrawal has two modes. Direct: "User pays directly", "no fees". Relayed: "Relayer pays, takes fee", with `recipient`, `feeRecipient`, `relayFeeBPS`. The proof is bound to the withdrawal data through `context = keccak256(abi.encode(withdrawal, pool.SCOPE()))`. Kohaku's PR #280 adds a third mode: 4337 paymaster, described above.

### Railgun

On-chain on Ethereum, BSC, Polygon, Arbitrum. Users hold a `0zk` address. Gas: "Broadcasters" submit for you and "a user would not need to hold a small balance of ETH to submit gas for interactions on the Ethereum network and could instead choose to only hold and spend a stablecoin like DAI". Kohaku docs quote the premium as "generally they are ~10% of the total gas". Private Proofs of Innocence add a wait: "this Unshield-Only Standby Period will be 1 hour, meaning tokens in new shields will have to wait 1 hour before they can be used". Wallets must auto-generate the PPOI proof after shielding and after every unshield (Kohaku issue #277 shows what breaks when that queue is lost).

Kohaku docs warn about the naive unshield: "This transaction can be sent from an EOA ... Do note that this EOA will be the submitter of the tx, and thus linked to the recipient." That is the whole reason for the 4337 path.

### Stealth addresses (ERC-5564, ERC-6538)

Both Final. ERC-5564: meta-address `st:eth:0x<spendingPubKey><viewingPubKey>`, a singleton `ERC5564Announcer` emitting `Announcement(schemeId, stealthAddress, ephemeralPubKey, metadata)`, a one-byte view tag so the recipient skips 255/256 of announcements. Private key: `p_stealth = p_spend + s_h`. On gas, the spec only says: "The sender may attach a small amount of ETH to each stealth address transaction, thereby sponsoring subsequent transactions of the recipient." ERC-6538 is the registry at `0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538`; `registerKeysOnBehalf` accepts EIP-712 signatures and ERC-1271 for contract accounts, with per-registrant nonces.

Note the stealth private key is an EOA key. A contract account can only receive at a stealth address if the stealth EOA then delegates (EIP-7702) or deploys a counterfactual account owned by that key. Kohaku's PR #280 shows the same trick for pool withdrawals.

### Requirements for a shared account core, derived from the above

1. Counterfactual or 7702-delegated accounts. The receiving address must exist before any on-chain action and must cost nothing to set up. Kohaku uses an ephemeral EOA plus Simple7702 delegation; a CREATE2 factory account works the same way through 4337 `initCode`.
2. Sponsored gas from the funds themselves. A fresh account has no ETH. Funding it from a known address links it (PSE thread comment). So the first UserOperation must be paid by a paymaster that takes its fee from the withdrawn asset (Privacy Pools paymaster) or a broadcaster paid in shielded tokens (Railgun), or the sender must attach ETH (ERC-5564).
3. Atomic batch after funding. The withdrawal/unshield and the first action must land in one UserOperation (`tailCalls`, `executeBatch`). Two transactions would give an observer a second linkage point and a second gas problem.
4. No linkable key setup. Key material for each account should derive from the wallet's keystore (`Keystore.deriveAt`) so nothing is registered on chain, and per-(deposit, withdraw) signers should be ephemeral. ERC-6538 registration of a meta-address is a public, one-time act tied to the main identity; that is fine because it is meant to be looked up.
5. One address per app by default (Vitalik, Kohaku roadmap, Kohaku docs).
6. Uniformity of the on-chain footprint (same implementation, same first-op shape) so the account does not stand out. Reasonable inference, but UNVERIFIED as a stated requirement anywhere. EIP-8250 is the protocol-side plan for shared senders.
7. Signature-scheme flexibility. Kohaku pq-account and the EF’s frames work both push accounts that can swap schemes ("native account abstraction lets signature schemes be swapped without a hard fork per scheme").
8. For FHE apps: the account address must be the party bound in the input proof and granted in the ACL, since the signer key never appears as the sender; the wallet must be able to produce EIP-712 signatures for decryption sessions, ideally with delegation so a backend can read balances without the user's key.

## Sources

Kohaku
- https://blog.ethereum.org/2025/10/08/privacy-commitment
- https://blog.ethereum.org/2025/10/01/privacy-cluster-leads
- https://notes.ethereum.org/@niard/KohakuRoadmap
- https://github.com/ethereum/kohaku
- https://github.com/ethereum/kohaku/blob/master/packages/plugins/README.md
- https://github.com/ethereum/kohaku/blob/master/packages/pq-account/README.md
- https://github.com/ethereum/kohaku/pull/280
- https://github.com/ethereum/kohaku/issues/277
- https://github.com/ethereum/kohaku/releases
- https://github.com/ethereum/kohaku-extension
- https://ethereum.github.io/kohaku/ and https://ethereum.github.io/kohaku/llms-full.txt
- https://ethereum.org/apps/kohaku
- https://github.com/dyzz/tornado-4337-relayer
- https://ethereum-magicians.org/t/pse-roadmap-2025-and-beyond/25423
- https://ethereum-magicians.org/t/a-maximally-simple-l1-privacy-roadmap/23459
- https://blog.ethereum.org/2026/09/07/protocol-priorities
- https://blog.ethereum.org/2026/06/23/ef-structure
- https://eips.ethereum.org/EIPS/eip-8250
- Secondary (SDK release coverage): https://thedefiant.io/news/blockchains/ethereum-foundation-kohaku-sdk-privacy-wallet-integration-bb4t52 , https://cryptobriefing.com/kohaku-sdk-wallet-privacy-integration/

CROPS
- https://blog.ethereum.org/2026/03/13/ef-mandate
- https://ethereum.org/foundation/mandate/
- https://ethereum.foundation/ef-mandate.pdf

FHE
- https://docs.zama.org/protocol/protocol/overview
- https://docs.zama.org/protocol/solidity-guides/smart-contract/inputs
- https://docs.zama.org/protocol/solidity-guides/smart-contract/acl
- https://docs.zama.org/protocol/sdk/getting-started/wallet-exchange-integration
- https://docs.zama.org/protocol/sdk/beta/guides/delegated-decryption
- https://docs.zama.org/protocol/changelog
- https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984
- https://www.fhenix.io/
- https://cofhe-docs.fhenix.zone/cofhejs/introduction/overview
- https://docs.inco.org/architecture/components
- https://docs.inco.org/guide/input
- https://docs.inco.org/guide/guide-access-control

Shielded pools and stealth addresses
- https://docs.privacypools.com/
- https://docs.privacypools.com/protocol/withdrawal
- https://docs.privacypools.com/deployments
- https://docs.railgun.org/wiki
- https://docs.railgun.org/wiki/learn/using-private-tokens/gasless-interactions
- https://docs.railgun.org/wiki/assurance/private-proofs-of-innocence
- https://docs.railgun.org/wiki/learn/railgun-deductions
- https://eips.ethereum.org/EIPS/eip-5564
- https://eips.ethereum.org/EIPS/eip-6538
