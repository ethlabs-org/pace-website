import { useStore } from '../state.jsx';
import { Icon } from '../icons.jsx';
import { ChainDot, ChainStack } from '../ui.jsx';
import { CHAINS, ACCOUNTS, FLAG_TECH, PENDING, TX_BATCH, TX_XCHAIN, TX_PSEND_SAMPLE, providerById, permText, permType, actorIdOf, POLICY_MANAGER } from '../data.js';

// How each network carries the same receipt: the transport, whether the chain runs it natively or a bundler carries
// it, what the transaction assertions cover, and who put the transaction on chain. On a frames chain and on an
// EIP-8130 chain the account sends it itself; on a chain with neither, a bundler wraps it in its own transaction.
// The other networks' tabs show the same receipt as it would run there, and say so.
const TRANSPORT = {
  ethereum: { name: 'EIP-8141 frame', runs: 'Runs natively', check: 'whole transaction', sent: 'The account itself, to any Ethereum node', bundler: false },
  base: { name: 'EIP-8130', runs: 'Runs natively', check: 'each part on its own', sent: 'The account itself, as an EIP-8130 transaction', bundler: false },
  arbitrum: { name: 'ERC-4337 user op', runs: 'Runs through a bundler', check: 'each part on its own', sent: 'An ERC-4337 bundler, inside its own transaction', bundler: true },
  optimism: { name: 'ERC-4337 user op', runs: 'Runs through a bundler', check: 'each part on its own', sent: 'An ERC-4337 bundler, inside its own transaction', bundler: true },
};

function Fact({ icon, tip, children }) { return <span className="fact" title={tip}>{icon && <Icon name={icon} size={13} />}<span>{children}</span></span>; }
// Key/value row whose key is an icon; the tooltip carries the word.
function Kv({ icon, k, id, children }) { return <div className="kv" id={id}><span className="k" role="img" aria-label={k} title={k}><Icon name={icon} size={15} /></span><span className="v">{children}</span></div>; }
function Card({ icon, title, right, children, className = '' }) {
  return <div className={'card ' + className}>{title && <div className="chead"><span className="ct">{icon && <Icon name={icon} size={14} />}{title}</span>{right}</div>}{children}</div>;
}
// Page head: an icon, the title (a hash or address in mono, with a copy button), then status pills.
function PageHead({ icon, title, mono, copy, pills }) {
  return (
    <div className="phead">
      <div className="h1"><Icon name={icon} size={16} className="mut" /><span className={mono ? 'hash' : ''}>{title}</span>{copy && <button type="button" className="cp" title="Copy" onClick={() => navigator.clipboard && navigator.clipboard.writeText(copy)}><Icon name="copy" size={13} /></button>}</div>
      {pills && <div className="pills">{pills}</div>}
    </div>
  );
}
function Status({ ok }) { return ok === null ? <span className="ps w" title="Waiting"><Icon name="clock" size={13} /></span> : ok === false ? <span className="ps x" title="Failed"><Icon name="ban" size={13} /></span> : <span className="ps ok" title="OK"><Icon name="check" size={13} /></span>; }

function TxView() {
  const { state, dispatch } = useStore();
  const samples = [TX_BATCH, TX_XCHAIN, TX_PSEND_SAMPLE].filter(s => !state.txs.some(t => t.id === s.id));
  const all = [...state.txs, ...samples];
  const tx = all.find(t => t.id === state.fxTx) || all[0];
  const chain = state.fxChain;
  const t = TRANSPORT[chain];
  const withReceipt = all.filter(t => t.phases && t.phases.length > 0);
  const hash = tx.hash.length > 24 ? tx.hash.slice(0, 12) + '…' + tx.hash.slice(-8) : tx.hash;
  const gas = tx.gas.split(' · ').slice(0, 2).join(' · ');
  return (
    <div className="wrap">
      <PageHead
        icon="hash" title={hash} mono copy={tx.hash}
        pills={<>
          {tx.kind === 'xchain'
            ? <><span className="pill g"><ChainDot id="base" size={13} /><Icon name="check" size={13} />Base</span><span className="pill a"><ChainDot id="arbitrum" size={13} /><Icon name="clock" size={13} />Arbitrum</span></>
            : tx.status === 'failed'
              ? <span className="pill x" title="Included, and its execution reverted by an assertion"><Icon name="ban" size={13} />Undone by an assertion</span>
              : <span className="pill g"><Icon name="check" size={13} />Success</span>}
          <span className="pill b"><Icon name="layers" size={13} />{t.name}</span>
        </>}
      />
      <div className="sel">
        <label htmlFor="fx-tx" title="Receipt"><Icon name="list" size={14} /></label>
        <select id="fx-tx" aria-label="Receipt" value={tx.id} onChange={e => dispatch({ type: 'set', patch: { fxTx: e.target.value } })}>{withReceipt.map(t => <option key={t.id} value={t.id}>{t.title} · {t.time}</option>)}</select>
      </div>
      <div className="segbar">
        <span className="tabs">{CHAINS.map(c => <button type="button" key={c.id} id={'fx-net-' + c.id} className={'tb' + (chain === c.id ? ' on' : '')} title={c.name} onClick={() => dispatch({ type: 'set', patch: { fxChain: c.id } })}><ChainDot id={c.id} size={14} /><span className="tn">{c.name}</span></button>)}</span>
        <div className="facts">
          <Fact icon="layers" tip="How it reaches the chain">{t.runs}</Fact>
          <Fact icon="shield" tip="Transaction assertions">Assertions · {t.check}</Fact>
        </div>
        {chain !== (tx.chain || 'ethereum') && !(tx.nets && tx.nets[chain]) && (
          <div className="xs mut fx-whatif">This ran on {CHAINS.find(c => c.id === (tx.chain || 'ethereum')).name}. Shown here as it would run on {CHAINS.find(c => c.id === chain).name}.</div>
        )}
      </div>
      <div className="kpis">
        <div className="kpi"><div className="l"><Icon name="block" size={12} />Block</div><div className="v mono">23,481,205</div></div>
        <div className="kpi"><div className="l"><Icon name="clock" size={12} />Time</div><div className="v">{tx.time} UTC</div></div>
        <div className="kpi"><div className="l"><Icon name="bolt" size={12} />Gas</div><div className="v mono" title={tx.gas}>{gas}</div></div>
        <div className="kpi"><div className="l"><Icon name="wallet" size={12} />Paid by</div><div className="v">{tx.sponsor ? <><span className="mono">0x71b2c9E4…3f9a0aC4</span><span className="tag b">Sponsor · {tx.app}</span></> : tx.payer ? <><span className="mono">{tx.payer.addr}</span><span className="tag b" title={tx.payer.tag}>{tx.payer.tag.split(' · ')[0]}</span></> : <><span className="mono">{ACCOUNTS.main.short}</span><span className="tag">self</span></>}</div></div>
      </div>
      <Card>
        <div className="kvgrid">
          {tx.from
            ? <Kv icon="user" k="From" id="fx-from"><span className="mono">{tx.from.addr.slice(0, 10)}…{tx.from.addr.slice(-8)}</span><span className="tag b">{tx.from.name}</span>{!tx.from.alone && <><span className="mut">for</span><a className="mono" href="#account" onClick={e => { e.preventDefault(); dispatch({ type: 'set', patch: { fxTab: 'account' } }); }}>{ACCOUNTS.main.short}</a></>}</Kv>
            : <Kv icon="user" k="From"><a className="mono" href="#account" onClick={e => { e.preventDefault(); dispatch({ type: 'set', patch: { fxTab: 'account' } }); }}>{ACCOUNTS.main.address.slice(0, 10)}…{ACCOUNTS.main.address.slice(-8)}</a><span className="tag g">Canonical</span></Kv>}
          {!(tx.nets && tx.nets[chain]) && <Kv icon="send" k="Sent by" id="fx-sent">{t.sent}<span className={'tag' + (t.bundler ? '' : ' g')}>{t.bundler ? 'bundler' : 'no bundler'}</span></Kv>}
          <Kv icon="key" k="Signed with">{tx.keyUsed}</Kv>
          {tx.validity !== '—' && <Kv icon="clock" k="Valid"><span className="mono">{tx.validity}</span> · {tx.lane}</Kv>}
          <Kv icon="code" k="Metadata"><span className="mono">{tx.metadata}</span></Kv>
        </div>
      </Card>
      {/* a private send only runs natively on frames; on the other transports the explorer says what it would take */}
      {tx.nets && tx.nets[chain] && <Card icon="info" title={`On ${CHAINS.find(c => c.id === chain).name}`}><div className="rbody">{tx.nets[chain]}</div></Card>}
      <div className="two">
        <div className="stack">
          <Card icon="layers" title="Phases">
            {tx.phases.map(p => (
              <div className="phase" key={p.n}>
                <span className="n">{p.n}</span>
                <div className="grow">
                  <div className="nm">{p.name}</div>
                  <div className="calls">{p.calls.map((c, i) => <div key={i}>{c}</div>)}</div>
                </div>
                <Status ok={p.ok} />
              </div>
            ))}
            {tx.context && (
              <div className="ctx">
                <div className="st"><Icon name="eye" size={13} className="mut" />{tx.from ? 'Transaction context' : 'Fee payer context'} <span className="tag">EIP-8130</span></div>
                <div className="ctxg"><span>sender</span><span className="mono">{tx.context.sender}</span><span>payer</span><span className="mono">{tx.context.payer}</span><span>key</span><span>{tx.context.key}</span><span>calls</span><span>{tx.context.calls} in the batch</span></div>
              </div>
            )}
          </Card>
        </div>
        <div className="stack">
          <Card icon="swap" title="Balance changes">
            <table><thead><tr><th>Balance</th><th style={{ textAlign: 'right' }}>Change</th></tr></thead><tbody>{tx.changes.length ? tx.changes.map(([k, v]) => <tr key={k}><td>{k}</td><td className={'mono ' + (v.startsWith('−') ? 'neg' : 'pos')} style={{ textAlign: 'right' }}>{v}</td></tr>) : <tr><td colSpan="2" className="mut">None</td></tr>}</tbody></table>
          </Card>
          <Card icon="list" title="Events">
            <table className="events"><tbody>{tx.events.map((e, i) => <tr key={i}><td className="mono">{e}</td></tr>)}</tbody></table>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AccountView() {
  const { state } = useStore();
  const keys = state.keys.main;
  const num = (id) => '#' + (keys.findIndex(k => k.id === id) + 1);
  // A set's members, as the Keystore stores them: registered keys by number, a service by its authenticator.
  const membersOf = (k) => [...k.set.members.map(num), ...(k.set.provider ? [k.set.provider === 'safenet' ? 'safenet:oracle 0x5aFe…c0de' : k.set.provider + ':k1'] : [])];
  const kind = (k) => k.set ? `threshold ${k.set.threshold}-of-${membersOf(k).length} [${membersOf(k).join(', ')}]` : (k.tech || k.type).split(' · ')[0];
  const events = [...keys.map((k, i) => `KeyAdded(#${i + 1}, ${kind(k)}, [${k.flags.join(', ')}])${k.expiry ? ' · expires ' + k.expiry : ''}`)];
  keys.filter(k => k.standalone === false).forEach(k => events.push(`KeyRevoked(${num(k.id)}) · stays a member of ${keys.filter(x => x.set && x.set.members.includes(k.id)).map(x => num(x.id)).join(', ')}`));
  // App permissions (ERC-7715): one Keystore row per permission of each app's session account, and the rows removed since.
  state.sessions.forEach(s => s.perms.forEach(p => events.push(`ActorAuthorized(slot ${p.slot} · ${s.to.short}, EXTERNAL_POLICY, POLICY, expiry ${s.expiry}, ${POLICY_MANAGER.short} ‖ ${p.commitment})`)));
  state.revoked.forEach(r => events.push(`ActorRevoked(${actorIdOf(r.to, r.slot)}) · ${r.app} · ${r.title}`));
  if (state.locked) events.push('AccountLocked(until Oct 11)');
  if (state.pendingCancelled) events.push('KeyChangesInvalidated(nonce 3 → 4)');
  const perms = state.sessions.flatMap(s => s.perms.map(p => ({ s, p })));
  // Nonce lanes, each with its next nonce. The sample pending items (a stuck payment, an app's move) only show while
  // the account still carries the sample app grant, so the tutorial's account shows none.
  const lanes = [[0, 42, state.sessions.length ? PENDING[0] : null], [1, 8, state.sessions.length ? PENDING[1] : null], [2, 0, null]];
  return (
    <div className="wrap">
      <PageHead
        icon="user" title={ACCOUNTS.main.address} mono copy={ACCOUNTS.main.address}
        pills={<><span className="pill g"><Icon name="check" size={13} />New Ethereum Account</span><span className="pill n"><ChainStack size={13} />One address, {CHAINS.length} chains</span></>}
      />
      <div className="two acct">
        <div className="stack">
          <Card icon="key" title="Keys">
            <table className="keys">
              <thead><tr><th>Key</th><th>Flags</th><th>Expiry</th></tr></thead>
              <tbody>{keys.map((k, i) => <tr key={k.id}><td><div className="kc"><span className="kt"><Icon name={k.icon || 'key'} size={14} /></span><div><div className="strong">{k.name}{k.set && k.set.provider && <span className="tag g" style={{ marginLeft: 6 }}>protected · {providerById(k.set.provider).name}</span>}{k.standalone === false && <span className="tag" style={{ marginLeft: 6 }}>member only</span>}</div><div className="mut"><span className="mono">#{i + 1}</span> · {k.set ? `threshold ${k.set.threshold} of ${membersOf(k).length} · members ${membersOf(k).join(', ')}` : (k.tech || k.type)}</div></div></div></td><td><span className="tags">{k.flags.map(f => <span key={f} className="tag">{FLAG_TECH[f] || f}</span>)}</span></td><td className="mono">{k.expiry || '—'}</td></tr>)}</tbody>
            </table>
          </Card>
          <Card icon="list" title="Nonce lanes">
            <table><thead><tr><th>Lane</th><th>Next</th><th>Pending</th></tr></thead><tbody>
              {lanes.map(([lane, next, p]) => <tr key={lane}><td className="mono">{lane}</td><td className="mono">{next}</td><td>{p ? <span className="pend"><span className={'pill ' + (p.status === 'stuck' ? 'a' : 'b')} title={p.why || p.status}><Icon name={p.status === 'stuck' ? 'hourglass' : 'clock'} size={12} />{p.status}</span>{p.title}</span> : <span className="mut">—</span>}</td></tr>)}
            </tbody></table>
          </Card>
        </div>
        <div className="stack">
          <Card icon="grid" title="App permissions" right={<span className="tag b">ERC-7715</span>}>
            <table className="keys">
              <thead><tr><th>Row</th><th>Policy</th><th>Expiry</th></tr></thead>
              <tbody>{perms.length ? perms.map(({ s, p }) => <tr key={s.id + p.id}><td><div className="kc"><span className="kt"><Icon name={p.kind === 'call' ? 'lock' : p.kind === 'stream' ? 'trend' : 'coins'} size={14} /></span><div><div className="strong">{s.app} · slot {p.slot}</div><div className="mut"><span className="mono">{s.to.short}</span> · {permText(p).title}</div></div></div></td><td><span className="tags"><span className="tag">{p.policy.name}</span><span className="tag" title={p.commitment}>{permType(p)}</span></span></td><td className="mono">{s.expiry}</td></tr>) : <tr><td colSpan="3" className="mut">None</td></tr>}</tbody>
            </table>
          </Card>
          <Card icon="code" title="Events">
            <table className="events"><tbody>{events.map((e, i) => <tr key={i}><td className="mono">{e}</td></tr>)}</tbody></table>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RpcView() {
  const calls = [
    ['eth_getNonceLanes', 'list', 'Nonce lanes', '{ "address": "0x8C4e…F21E" }', '{ "0": 42, "1": 8, "2": 0 }'],
    ['eth_estimateFrameGas', 'bolt', 'Gas estimate', '{ "sender": "0x8C4e…F21E", "payer": "0x4fE1…9b2C", "phases": [ [validate], [swap, deposit, tip], [check] ] }', '{ "gas": 212410, "perPhase": [41200, 158100, 13110] }'],
    ['keystore_getKeys', 'key', 'Key list', '{ "address": "0x8C4e…F21E" }', '[ { "id": 2, "type": "P-256", "flags": ["admin","send","gas"] },\n   { "id": 6, "type": "threshold", "required": 2, "members": [ { "id": 1, "type": "P-256" }, { "auth": "safenet", "oracle": "0x5aFe…c0de" } ], "flags": ["admin","send","gas","lanes"] }, … ]'],
    ['keystore_getActorWithPolicy', 'grid', 'An app permission', '{ "account": "0x8C4e…F21E", "actorId": "keccak(0x7d1E…4aF0 ‖ 1)" }', '{ "authenticator": "EXTERNAL_POLICY", "expiry": 1789740120, "scope": "POLICY",\n   "manager": "0x3aF1…9c02", "commitment": "0x8f2a…c41e" }'],
  ];
  return (
    <div className="wrap">
      <PageHead icon="code" title="RPC extensions" pills={<span className="pill b"><Icon name="layers" size={13} />EIP-8130</span>} />
      <div className="rpc">
        {calls.map(([name, icon, note, req, res]) => (
          <Card key={name} icon={icon} title={<span className="mono">{name}</span>} right={<span className="mut" style={{ fontWeight: 400 }}>{note}</span>}>
            <div className="rbody">
              <pre className="code">{`→ ${req}\n← ${res}`}</pre>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function Framescan() {
  const { state, dispatch } = useStore();
  const tabs = [['tx', 'Transaction', 'hash'], ['account', 'Account', 'user'], ['rpc', 'RPC', 'code']];
  const net = CHAINS.find(c => c.id === state.fxChain);
  return (
    <div className="scr f">
      <div className="bar">
        <span className="wm"><span className="mk">[ ]</span>Framescan</span>
        <span className="srch"><Icon name="search" size={15} /><span>Search</span></span>
        <span className="net" title={net.name}><ChainDot id={state.fxChain} size={16} /><span className="tn">{net.name}</span><Icon name="chevD" size={14} /></span>
      </div>
      <div className="subnav">{tabs.map(([id, l, icon]) => <button type="button" key={id} id={'fx-tab-' + id} className={state.fxTab === id ? 'on' : ''} title={l} onClick={() => dispatch({ type: 'set', patch: { fxTab: id } })}><Icon name={icon} size={14} /><span className="tl">{l}</span></button>)}</div>
      <div className="main">{state.fxTab === 'account' ? <AccountView /> : state.fxTab === 'rpc' ? <RpcView /> : <TxView />}</div>
    </div>
  );
}
