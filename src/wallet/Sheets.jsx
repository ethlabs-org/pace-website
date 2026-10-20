// Approval sheets that an app triggers on the wallet. Each is the same consent screen: the app, one sentence,
// what it can and can’t do, the facts, and technical detail under “Under the hood”.
import { useStore } from '../state.jsx';
import { Chip, Sheet, ApproveFooter, AppBar, Sentence, V, Details, Kv, Scopes, Calls, Facts, TxTabs, Card, CardHead, PermRows, PermRule } from '../ui.jsx';
import { KEEL_RULES, STATE_CHANGES, STEPS, TIDEPOOL_REQ, sessionSteps, sessionChanges, dateAfter, expiryTs, permType, POLICY_MANAGER, POLICIES } from '../data.js';

function useApproval() {
  const { state, dispatch } = useStore();
  return { state, dispatch, sign: () => dispatch({ type: 'sign' }), reject: () => dispatch({ type: 'reject' }), close: () => dispatch({ type: 'sheet', sheet: null }) };
}

export function SignInSheet() {
  const { sign, reject, close } = useApproval();
  return (
    <Sheet appBar={<AppBar onClose={close} />} footer={<ApproveFooter label="Sign in with Face ID" onApprove={sign} onReject={reject} />}>
      <Sentence size={20}>Sign in to <V tone="a">Tidepool</V>.</Sentence>
      <Scopes groups={[{ label: 'Tidepool will see', items: [
        [true, 'You’re signing in from this iPhone'],
        [true, 'You can send money'],
        [false, 'You can’t change your devices or who has access'],
      ] }]} foot={['info', 'Tidepool checks this against your account on the network, so it never asks this device for more than it can do.']} />
      <Facts rows={[['Network fee', 'None'], ['Sends', 'Nothing'], ['Valid for', '15 min']]} />
      <Details>
        <Kv k="Standard">ERC-1271 signature with key details (EIP-8130)</Kv>
        <Kv k="Key">#1 · passkey · flags: send, gas, lanes</Kv>
      </Details>
    </Sheet>
  );
}

export function BatchSheet({ wallet }) {
  const { sign, reject, close } = useApproval();
  return (
    <Sheet appBar={<AppBar onClose={close} />} footer={<ApproveFooter onApprove={sign} onReject={reject} note="You cannot spend more than 1,000.09 USDC." />}>
      {wallet && <Chip tone="g" icon="eye" style={{ alignSelf: 'flex-start' }}>Shown by {wallet}, same words as in Keel</Chip>}
      <Sentence size={20} sub="Tidepool deposit #8812 · Ethereum">Swap <V>1,000 USDC</V> for ETH and put it into <V tone="a">ETH Vault</V>.</Sentence>
      <TxTabs steps={STEPS.batch} rule={KEEL_RULES.batch} changes={STATE_CHANGES.batch} />
      <Facts rows={[['Network fee', '0.09 USDC', 'Taken in USDC · about $0.09 on Ethereum today'], ['Tip', '0.005 ETH', 'to tips.tidepool.eth'], ['Expires', 'in 10 min'], ['If anything differs', 'It fails · all or nothing']]} />
      <Details id="det-batch">
        <Kv k="Format">EIP-8141 frame transaction on Ethereum · ERC-8211 smart batch · ERC-7730 intent and fields per step</Kv>
        <Kv k="Simulation">eth_simulateV1 at block 23,481,204 · the guarantees and step 5 are derived from the simulated state diff, then signed with the transaction</Kv>
        <Kv k="Phases">1 · fee (0.09 USDC) · 2 · steps 1–4, atomic · 3 · transaction assertions</Kv>
        <Kv k="Step 3">deposit($swapOut) · value read at execution</Kv>
        <Kv k="Step 5">ERC-8211 predicate appended by Keel: {KEEL_RULES.batch.tech} · if false the batch reverts · a step, so it runs on every transport</Kv>
        <Kv k="Acts as you">USDC, Tidepool Router, ETH Vault · the SENDER frame targets, read from the envelope, not from what the app says about itself</Kv>
        <Kv k="Checks">EIP-7906 POST_TX: the State changes tab as Keel's assertions (4 bounds, plus nothing else changes), Tidepool (1), Sentinel (1) · non-upgradeable, each added without coordinating</Kv>
        <Kv k="Fee payer">0x4fE1…9b2C · charges USDC and settles the gas in ETH · 212,410 gas at 0.16 gwei · cannot change the calls</Kv>
        <Kv k="Validity">14:02 – 14:12 UTC · nonce lane 2 · #0 · metadata tidepool:deposit:8812</Kv>
      </Details>
    </Sheet>
  );
}

// A permission request from an app (ERC-7715): one session account, several permissions, each shown as it will be
// stored. Amounts the app marked adjustable can be changed here; the values approved are what the app gets back.
export function SessionSheet() {
  const { state, dispatch, sign, reject, close } = useApproval();
  const req = state.sheet.req || TIDEPOOL_REQ();
  const n = req.perms.length;
  // An adjustment patches the open sheet; a stream keeps the shape the app asked for, so its cap scales with the rate.
  const change = (id, patch) => dispatch({ type: 'sheetPatch', patch: { req: { ...req, perms: req.perms.map(p => {
    if (p.id !== id) return p;
    const q = { ...p, ...patch };
    if (p.kind === 'stream' && patch.rate !== undefined && p.rate > 0) q.max = Number((patch.rate * (p.max / p.rate)).toFixed(4));
    return q;
  }) } } });
  const call = req.perms.find(p => p.kind === 'call');
  return (
    <Sheet appBar={<AppBar onClose={close} />} footer={<ApproveFooter label={`Allow for ${req.term || req.days + ' days'}`} reject="Not now" onApprove={sign} onReject={reject} />}>
      {req.ask
        ? <Sentence size={20}>Let <V tone="a">{req.app}</V> {req.ask} for <V>{req.term}</V>.</Sentence>
        : <Sentence size={20}>Let <V tone="a">{req.app}</V> {req.what.toLowerCase()} for you for <V>{req.days} days</V>, with <V>{n} permission{n === 1 ? '' : 's'}</V>.</Sentence>}
      <Card>
        <CardHead label={`${req.app} asks for`} />
        <PermRows perms={req.perms} onChange={change} app={req.app} />
        {req.rule && <PermRule rule={req.rule} />}
        <div style={{ height: 6 }} />
      </Card>
      <Scopes groups={[{ label: `${req.app} can’t`, items: [[false, 'Move anything else'], [false, call ? 'Use any other contract' : 'Call any contract'], [false, 'Change your devices or access']] }]} />
      <TxTabs steps={sessionSteps(req)} rule={KEEL_RULES.change} changes={sessionChanges(req)} />
      <Facts rows={[['Network fee', `Paid by ${req.app}`, 'Its session account sends and pays'], ['Acts as', req.to.name, req.to.short], ['Ends', dateAfter(req.days, true)]]} />
      <Details>
        <Kv k="Request">wallet_requestExecutionPermissions (ERC-7715) · to {req.to.short} · chainId 0x1 · {req.perms.map(permType).join(', ')} · rules: expiry {expiryTs(req.days)}{req.rule ? ', outcome (Keel rule type)' : ''}</Kv>
        <Kv k="Keystore">one row per permission (EIP-8130) · actor id from ({req.to.short}, slot) · authenticator EXTERNAL_POLICY · scope POLICY · the expiry · {POLICY_MANAGER.short} ‖ keccak(binding)</Kv>
        <Kv k="Policies">{req.perms.map((p, i) => `slot ${i} · ${POLICIES[p.kind].name} (${POLICIES[p.kind].tech})`).join(' · ')}</Kv>
        <Kv k="Response">per permission: context = abi.encode(binding, slot) · delegationManager {POLICY_MANAGER.short} · dependencies [] · adjusted values echoed back (a stream’s cap keeps the ratio the app asked for)</Kv>
        <Kv k="Use">{req.to.name} calls redeemDelegations on the manager (ERC-7710); the manager checks the row, runs the policy, then executeBatch on your account</Kv>
        <Kv k="Relay">{req.app} relays the signed batch (local channel, sequenced) and pays its gas · your admin signature inside the batch is the authorization</Kv>
        {req.rule && <Kv k="Rule">{req.rule.tech}</Kv>}
        <Kv k="Keel rule">ERC-8211 predicate appended to the key change: {KEEL_RULES.change.tech}</Kv>
      </Details>
    </Sheet>
  );
}

export function XChainSheet() {
  const { sign, reject, close } = useApproval();
  return (
    <Sheet appBar={<AppBar onClose={close} />} footer={<ApproveFooter onApprove={sign} onReject={reject} note="One approval covers both networks." />}>
      <Sentence size={20} sub="Tidepool bridge #2201 · Base and Arbitrum">Move <V>2,000 USDC</V> from Base to Arbitrum and put it into <V tone="a">USDC Vault</V>.</Sentence>
      <TxTabs steps={STEPS.xchain} rule={KEEL_RULES.xchain} changes={STATE_CHANGES.xchain} />
      <Facts rows={[['Network fee', '0.02 USDC', 'Taken on Base · covers Arbitrum too'], ['Valid for', '24 hours'], ['Asked again on Arbitrum', 'No'], ['If anything differs', 'It fails · on both networks']]} />
      <Details>
        <Kv k="Format">ERC-8211 cross-chain program · ERC-7964 message listing each chain’s entry</Kv>
        <Kv k="Simulation">Base now, Arbitrum against the state the Base part produces · the guarantees and step 4 are derived from both simulated diffs</Kv>
        <Kv k="Arbitrum part">conditioned on balanceOf(USDC) ≥ 2,000 · each chain verifies only its own entry</Kv>
        <Kv k="Step 4">ERC-8211 predicate appended by Keel: {KEEL_RULES.xchain.tech} · if false, the Arbitrum part reverts and nothing is deposited</Kv>
      </Details>
    </Sheet>
  );
}

// A rewards claim: one change comes in and the fee goes out. The last assertion covers everything else, so a claim
// that moves anything more on chain is undone (in the mockup it moves the account's tpETH, see TX_CLAIM).
export function ClaimSheet() {
  const { sign, reject, close } = useApproval();
  return (
    <Sheet appBar={<AppBar onClose={close} />} footer={<ApproveFooter onApprove={sign} onReject={reject} note="Only these changes can happen." />}>
      <Sentence size={20} sub="Tidepool rewards · Ethereum">Claim <V>18.40 USDC</V> of rewards from <V tone="a">ETH Vault</V>.</Sentence>
      <TxTabs steps={STEPS.claim} rule={KEEL_RULES.claim} changes={STATE_CHANGES.claim} />
      <Facts rows={[['Network fee', '0.000015 ETH', 'About $0.05 on Ethereum today'], ['Expires', 'in 10 min'], ['If anything else changes', 'It fails · all or nothing']]} />
      <Details>
        <Kv k="Format">EIP-8141 frame transaction on Ethereum · one call · ERC-7730 intent and fields</Kv>
        <Kv k="Simulation">eth_simulateV1 at block 23,481,204 · the assertions and step 2 are derived from the simulated state diff, then signed with the transaction</Kv>
        <Kv k="Checks">EIP-7906 POST_TX: USDC at least +18.40, ETH down by at most the fee, and nothing else of yours changes: any other Transfer or Approval from your account fails the check</Kv>
        <Kv k="Step 2">ERC-8211 predicate appended by Keel: {KEEL_RULES.claim.tech}</Kv>
      </Details>
    </Sheet>
  );
}

export function OrderSheet() {
  const { sign, reject, close } = useApproval();
  return (
    <Sheet appBar={<AppBar onClose={close} />} footer={<ApproveFooter label="Sign with Face ID" onApprove={sign} onReject={reject} />}>
      <Sentence size={20}>Place an order with <V tone="a">Tidepool</V> on <V>2 networks</V>.</Sentence>
      <Calls items={STEPS.order} />
      <Facts rows={[['Signature', 'One, for both networks'], ['Sends', 'Nothing now'], ['Expires', 'Sep 18']]} />
      <Details>
        <Kv k="Format">ERC-7964 cross-chain message, accepted by the account’s signature check</Kv>
        <Kv k="Off-chain">No outcome guarantee: a message, not a transaction</Kv>
      </Details>
    </Sheet>
  );
}
