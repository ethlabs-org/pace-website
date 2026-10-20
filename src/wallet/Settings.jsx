import { useStore } from '../state.jsx';
import { Icon } from '../icons.jsx';
import { Btn, Card, CardHead, CardFoot, Row, Cl, Chip, ChainDot, Kv, Bar, Label, Details } from '../ui.jsx';
import { CHAINS, PENDING } from '../data.js';

function NetworksPage({ back }) {
  const rows = [['Multi-step approvals', '✓', '✓', '✓'], ['Approvals in plain words', '✓', '✓', '✓'], ['One approval across networks', '✓', '✓', '✓'], ['Guarantees checked on-chain', 'Full', 'Partial', 'Partial'], ['Fee-free waiting mode', '—', '✓', '—'], ['Private sends', '✓', '—', 'Relay']];
  return (
    <div className="body">
      <Bar title="Networks" onBack={back} />
      <p className="sm mut">One address, one set of devices, everywhere. Keel handles the differences for you.</p>
      <Card>
        {CHAINS.map(c => <div className="chainrow" key={c.id} style={{ justifyContent: 'space-between' }}><span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}><ChainDot id={c.id} size={18} />{c.name}</span><span className="sm mut">{c.plain}</span></div>)}
        <CardFoot icon="globe">Add a network later and it will be the same there too.</CardFoot>
      </Card>
      <Details id="det-networks">
        <div className="sm" style={{ padding: '0 0 6px', fontWeight: 600 }}>How Keel sends on each network</div>
        {CHAINS.map(c => <Kv key={c.id} k={c.name}>{c.transport}</Kv>)}
        <div className="sm" style={{ padding: '10px 0 4px', fontWeight: 600 }}>What differs by transport</div>
        <table className="mini" style={{ margin: '0 -14px', width: 'calc(100% + 28px)' }}><thead><tr><th></th><th>8141</th><th>8130</th><th>4337</th></tr></thead><tbody>
          {rows.map(r => <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>)}
        </tbody></table>
        <div className="xs mut" style={{ paddingTop: 8 }}>Batches, clear signing and cross-chain bundles work the same everywhere. Transaction assertions cover the whole transaction on 8141 and each part on its own elsewhere; the rule Keel appends to every transaction (an ERC-8211 check step) runs the same on all three. Nonce-free mode exists only on L2s that support it. Private sends need the withdrawal proof checked before anything runs, which only 8141 can do; on 8130 a named relayer would have to send them, and on 4337 a bundler does.</div>
      </Details>
    </div>
  );
}

function PendingPage({ back }) {
  const { dispatch } = useStore();
  return (
    <div className="body">
      <Bar title="Pending payments" onBack={back} />
      <p className="sm mut">Keel sends your payments independently, so one that gets stuck never holds up the others.</p>
      <Card>
        {PENDING.map(p => <Row key={p.id} icon={p.status === 'stuck' ? 'clock' : 'refresh'} title={p.title} sub={p.status === 'stuck' ? `Stuck · ${p.why}` : 'Almost there'} right={p.status === 'stuck' ? <Chip tone="g" icon="speed">Speed up</Chip> : <Chip tone="n">confirming</Chip>} onClick={p.status === 'stuck' ? () => dispatch({ type: 'toast', text: 'Speeding up isn’t part of this mockup' }) : undefined} />)}
        </Card>
      <Details id="det-pending">
        <div className="sm" style={{ paddingBottom: 6, fontWeight: 600 }}>Nonce lanes (EIP-8130 / EIP-8141)</div>
        <Kv k="Lane 0">next #42 · #41 stuck (0.2 ETH to alice.eth)</Kv>
        <Kv k="Lane 1">next #8 · #7 confirming (Orbit game move)</Kv>
        <Kv k="Lane 2">next #0 · idle</Kv>
        <pre className="code" style={{ margin: '8px 0 0' }}>{`eth_getNonceLanes("0x8C4e…F21E")
→ { "0": 42, "1": 8, "2": 0 }`}</pre>
        <div className="xs mut" style={{ paddingTop: 8 }}>Independent nonce sequences per account. Only keys with the “lanes” flag may use lanes other than 0. The same RPC call works on every chain.</div>
      </Details>
    </div>
  );
}

function RecoveryPage({ back }) {
  const { state, dispatch } = useStore();
  const type = state.recoveryPath || 'secp';   // in the store, so the tutorial sees the pick
  const setType = (recoveryPath) => dispatch({ type: 'set', patch: { recoveryPath } });
  const path = { secp: "m / 44' / 60' / 8130' / 0' / 0", p256: "m / 44' / 60' / 8130' / 1' / 0", pq: "m / 44' / 60' / 8130' / 2' / 0" }[type];
  const r = state.recovery;
  return (
    <div className="body">
      <Bar title="Backup key" onBack={back} />
      <Card>
        <Row icon="book" iconTone="a" title="Backup key" sub="Made from your seed phrase · added Sep 2, 2026" right={<Chip tone="a">Recovery only</Chip>} />
        <Cl>Can start a recovery if you lose your devices. It takes 48 hours.</Cl>
        <Cl ok={false}>Can’t send money or change anything on its own</Cl>
        <CardFoot icon="info">During the 48 hours, any of your devices can cancel the recovery.</CardFoot>
      </Card>
      {!r && <Btn kind="s" icon="hourglass" id="btn-recovery-try" onClick={() => { dispatch({ type: 'sheet', sheet: { kind: 'recovery', hidden: true } }); dispatch({ type: 'approve' }); }}>Try it: I lost my phone</Btn>}
      {r && (
        <Card>
          <CardHead label={r.status === 'done' ? 'Recovered' : 'Recovery in progress'} right={<Chip tone={r.status === 'done' ? 'g' : 'a'}>{r.status === 'done' ? 'done' : '47 h 12 m left'}</Chip>} />
          <Cl>Sep 11, 14:02 · started with your seed phrase</Cl>
          <Cl ok={r.status === 'done'} icon={r.status === 'done' ? undefined : 'clock'}>48-hour wait · any of your devices can cancel</Cl>
          <Cl ok={r.status === 'done'} icon={r.status === 'done' ? undefined : 'key'}>Sep 13, 14:02 · your new iPhone gets full access</Cl>
          <div style={{ display: 'flex', gap: 8, padding: '8px 16px 12px' }}>
            {r.status !== 'done' && <Btn kind="s" id="btn-recovery-skip" style={{ height: 40, fontSize: 14 }} onClick={() => { dispatch({ type: 'set', patch: { recovery: { status: 'done' } } }); dispatch({ type: 'toast', text: 'Recovered · the new phone has full access' }); }}>Skip ahead 48 h</Btn>}
            {r.status !== 'done' && <Btn kind="s" id="btn-recovery-cancel" style={{ height: 40, fontSize: 14 }} onClick={() => dispatch({ type: 'set', patch: { recovery: null, toast: { text: 'Recovery cancelled from a device you still have', kind: 'ok', id: Date.now() } } })}>Cancel from a device</Btn>}
            {r.status === 'done' && <Btn kind="s" id="btn-recovery-done" style={{ height: 40, fontSize: 14 }} onClick={() => dispatch({ type: 'set', patch: { recovery: null } })}>Done</Btn>}
          </div>
        </Card>
      )}
      <Details id="det-recovery">
        <div className="sm" style={{ paddingBottom: 6, fontWeight: 600 }}>Derivation (BIP-44 · SLIP-0010)</div>
        <div className="segk" style={{ marginBottom: 8 }}>
          {[['secp', 'secp256k1'], ['p256', 'P-256'], ['pq', 'SPHINCS+']].map(([id, label]) => <button type="button" key={id} id={'path-' + id} className={type === id ? 'on' : ''} onClick={() => setType(id)}>{label}</button>)}
        </div>
        <div className="mono" style={{ fontSize: 13 }}>{path}</div>
        <div className="xs mut">phrase → master key ({type === 'secp' ? 'secp256k1' : type === 'p256' ? 'P-256' : 'post-quantum'}) → address 0x8C4e…F21E</div>
        <div className="xs mut" style={{ paddingTop: 8 }}>The path selects the key type, so the master key can be secp256k1, P-256 or post-quantum, and an account can have no secp256k1 key at all. One phrase finds and controls every account it created. The seed key is registered recovery-only (EIP-8130): it works only through the 48-hour process.</div>
      </Details>
    </div>
  );
}

function PlainPage({ back }) {
  const { dispatch } = useStore();
  const ops = [
    ['key', 'Add a device', 'Add MacBook Pro (Touch ID). It can send money and pay fees.'],
    ['grid', 'Give an app access', 'Let Tidepool charge your Tidepool Pro subscription for 1 year: up to 49.90 USDC a month.'],
    ['bolt', 'Let an app pay your fees', 'Tidepool pays the network fee. It can’t change what you’re approving.'],
    ['swap', 'A multi-step action', 'Swap 1,000 USDC for ETH, then put everything you receive into ETH Vault.'],
    ['link', 'Something across networks', 'Move 2,000 USDC from Base to Arbitrum, then put it into USDC Vault.'],
    ['sigma', 'Amounts set when it runs', 'Everything you receive, at least 0.312 ETH.'],
    ['shield', 'What Keel makes sure of', 'You spend at most 1,000.09 USDC.'],
    ['shield', 'A rule Keel adds to every transaction', 'Check you received at least 0.312 tpETH.'],
    ['set', 'Keys that work together', 'Add iPhone + Anchor. Both must approve everything it signs.'],
    ['shield', 'Turning protection on', 'Protect iPhone 16 Pro with Safenet. Safenet verifies every transaction before it counts; it can only say no.'],
  ];
  return (
    <div className="body">
      <Bar title="Plain-language approvals" onBack={back} />
      <p className="sm mut">What you’re approving, always in words, never in code.</p>
      <Card>
        {ops.map(([icon, t, s]) => <Row key={t} icon={icon} title={t} sub={`“${s}”`} top />)}
      </Card>
      <Btn kind="s" icon="lantern" id="btn-plain-lantern" onClick={() => dispatch({ type: 'set', patch: { skin: 'lantern', lanternImported: true, lanternStep: 3, sheet: { kind: 'batch' } } })}>See the same words in Lantern</Btn>
      <Details>
        <Kv k="Standard">ERC-7730 clear-signing registry: one display description per operation the account can do, written once, rendered by every wallet and hardware signer</Kv>
        <Kv k="Computed values">Shown as the rule and bounds (ERC-8211 arguments, ERC-7964 per-chain entries, EIP-7906 guardrail limits)</Kv>
      </Details>
    </div>
  );
}

// The Anchor, and what every transaction carries: the lock Keel writes from its test run (EIP-7906 assertions), which
// the account requires before it approves anything. There is nothing to pick: what may change comes
// from each transaction's test run.
function HardwarePage({ back }) {
  return (
    <div className="body">
      <Bar title="Hardware wallet" onBack={back} />
      <Card>
        <Row icon="device" iconTone="l" title="Anchor" sub="Added Sep 4 · full access" right={<Chip tone="g" icon="check">connected</Chip>} />
        <Cl>Anchor shows what an approval guarantees on its own screen, worked out from what it signs</Cl>
        <Cl>If a guarantee can’t be met, the transaction fails and nothing moves</Cl>
        <Cl icon="key">Acts on its own: it doesn’t need Safenet, and it can switch protection off for the phone</Cl>
        <CardFoot icon="info">Pick “Anchor hardware wallet” as the key on any approval to see it.</CardFoot>
      </Card>
      <div>
        <Label style={{ marginBottom: 6 }}>Every transaction</Label>
        <Card>
          <Cl>Keel tests it first, then adds transaction assertions: what you get, what you spend, and nothing else</Cl>
          <Cl>Any other change to your tokens, approvals or ETH undoes the whole transaction</Cl>
          <Cl>Your account won’t approve a transaction without them</Cl>
          <CardFoot icon="info">On Ethereum. Base and the other networks can’t check “nothing else” yet.</CardFoot>
        </Card>
      </div>
      <Details id="det-hardware">
        <Kv k="Device">Parses the frame transaction it signs, renders each assertion from its parameters (a fixed vocabulary), knows the assertion contract’s address and code hash, and checks descriptor signatures with a key in its firmware</Kv>
        <Kv k="Assertions">EIP-7906 POST_TX frame to the assertion contract: a bound for each change the test run found, then “nothing else changes”, which fails on any other Transfer or Approval from your account, any other ETH out beyond the fee, or new code</Kv>
        <Kv k="Required">The account’s VERIFY frame rejects a transaction whose last frame isn’t that check. There is no list to keep: each test run says what may change.</Kv>
        <Kv k="Not covered">Tokens that move without a Transfer event, positions kept inside other contracts, and what a position is worth</Kv>
      </Details>
    </div>
  );
}

export function Settings() {
  const { state, dispatch } = useStore();
  const back = () => dispatch({ type: 'set', patch: { settingsPage: null } });
  const open = (settingsPage) => dispatch({ type: 'set', patch: { settingsPage } });
  switch (state.settingsPage) {
    case 'networks': return <NetworksPage back={back} />;
    case 'pending': return <PendingPage back={back} />;
    case 'recovery': return <RecoveryPage back={back} />;
    case 'plain': return <PlainPage back={back} />;
    case 'hardware': return <HardwarePage back={back} />;
    default: break;
  }
  return (
    <div className="body">
      <div className="bar"><span className="ttl" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Settings</span></div>
      <Card>
        <Row id="set-networks" icon="globe" iconTone="b" title="Networks" sub="Ethereum, Base, Arbitrum, Optimism" right={<Icon name="chevR" size={20} className="dim" />} onClick={() => open('networks')} />
        <Row id="set-recovery" icon="book" iconTone="a" title="Backup key" sub="From your seed phrase · recovery only" right={<Icon name="chevR" size={20} className="dim" />} onClick={() => open('recovery')} />
        <Row id="set-hardware" icon="device" iconTone="l" title="Hardware wallet" sub="Anchor · reads each transaction’s assertions" right={<Icon name="chevR" size={20} className="dim" />} onClick={() => open('hardware')} />
        <Row id="set-plain" icon="eye" iconTone="g" title="Plain-language approvals" sub="Words, never code" right={<Icon name="chevR" size={20} className="dim" />} onClick={() => open('plain')} />
        <Row id="set-pending" icon="clock" iconTone="a" title="Pending payments" sub="1 stuck" right={<Icon name="chevR" size={20} className="dim" />} onClick={() => open('pending')} />
        <Row id="set-lock" icon="lock" iconTone="l" title="Freeze changes" sub={state.locked ? 'Frozen until Oct 11' : 'Devices & access can’t be changed'} right={<Icon name="chevR" size={20} className="dim" />} onClick={() => dispatch({ type: 'set', patch: { screen: 'keys', sheet: { kind: state.locked ? 'unlock' : 'lock' } } })} />
      </Card>
      <Card>
        <Row id="set-lantern" icon="wallet" iconTone="b" title="Open this account in another wallet" sub="Lantern picks it up without a transaction" right={<Icon name="chevR" size={20} className="dim" />} onClick={() => dispatch({ type: 'set', patch: { skin: 'lantern' } })} />
        <Row id="set-startover" icon="reset" title="Start over" right={<Icon name="chevR" size={20} className="dim" />} onClick={() => dispatch({ type: 'set', patch: { onboarded: false, welcomeFlow: null } })} />
      </Card>
    </div>
  );
}
