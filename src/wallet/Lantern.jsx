import { useStore } from '../state.jsx';
import { Icon } from '../icons.jsx';
import { ChainStack, Toast, FaceId, HwWait, CosignWait } from '../ui.jsx';
import { BatchSheet } from './Sheets.jsx';
import { ACCOUNTS, FLAG_SHORT, providerById, sessionSummary } from '../data.js';

function Step({ state: st, title, sub, children }) {
  const cls = st === 'done' ? 'pt ok' : st === 'now' ? 'pt nx' : 'pt';
  const icon = st === 'done' ? 'check' : st === 'now' ? 'arrowR' : 'dots';
  return (
    <div className="card" style={st === 'todo' ? { opacity: 0.5 } : undefined}>
      <span className={cls}><Icon name={icon} size={16} /></span>
      <span className="grow"><div className="tt">{title}</div><div className="ss">{sub}</div>{children}</span>
    </div>
  );
}

// Opening the account in Lantern. With `lanternVia: 'phrase'` the user brings the seed phrase they already have (the
// tutorial's upgraded EOA); otherwise the passkey they use in Keel. Either key leads Lantern to the address, and the
// rest is read from the chain, so the import sends nothing.
const VIA = {
  passkey: { lead: 'Sign in with the passkey you already use. Any wallet that follows the standard can restore it.', first: 'Sign in with your passkey', done: 'Passkey verified', doneSub: 'iPhone 16 Pro · Face ID', todo: 'Use the same passkey as in Keel', icon: 'face' },
  phrase: { lead: 'Use the seed phrase you already have. Any wallet that follows the standard can open the account.', first: 'Use my seed phrase', done: 'Seed phrase checked', doneSub: '12 words · the phrase you already have', todo: 'The same phrase you use today', icon: 'book' },
};
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
function ImportFlow() {
  const { state, dispatch } = useStore();
  const s = state.lanternStep;
  const via = VIA[state.lanternVia] || VIA.passkey;
  const labels = [via.first, 'Continue', 'Import to Lantern'];
  const next = () => {
    if (s < 2) dispatch({ type: 'set', patch: { lanternStep: s + 1 } });
    else if (state.lanternVia === 'phrase') { dispatch({ type: 'sheet', sheet: { kind: 'lanternImport', hidden: true } }); dispatch({ type: 'approve' }); }
    else dispatch({ type: 'faceId', sheet: { kind: 'lanternImport', hidden: true } });
  };
  const apps = state.sessions.length;
  // what comes with the account: only what it has
  const chips = ['Keys', state.keys.main.some(k => k.limit) && 'Limits', state.keys.main.some(k => k.set && k.set.provider) && 'Co-signer', apps > 0 && 'App access'].filter(Boolean);
  return (
    <>
      <div className="hd">
        <span className="wordmark"><span className="mk"><Icon name="lantern" size={15} /></span>Lantern</span>
        <h1 className="h1">Import your account</h1>
        <p className="lead">{via.lead}</p>
      </div>
      <div className="body">
        <Step state={s >= 1 ? 'done' : 'now'} title={via.done} sub={s >= 1 ? via.doneSub : via.todo} />
        <Step state={s >= 2 ? 'done' : s === 1 ? 'now' : 'todo'} title="Account found" sub={s >= 1 ? `0x8C4e7A0d…62d0F21E · ${plural(state.keys.main.length, 'key', 'keys')} · ${apps ? plural(apps, 'app', 'apps') + ' with access' : 'no app access'}` : 'Lantern works out the address from your key'}>
          {s >= 1 && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}><ChainStack size={18} /><span className="ss">Active on 4 chains</span></div>}
        </Step>
        <Step state={s >= 2 ? 'now' : 'todo'} title="Ready to import" sub="Nothing to send, nothing to pay. Lantern reads your key list from the chain.">
          {s >= 2 && <div className="chips">{chips.map(c => <span className="chip" key={c}>{c}</span>)}</div>}
        </Step>
      </div>
      <div className="foot">
        <button type="button" id="btn-lantern-next" className="btn" onClick={next}><Icon name={s < 2 ? via.icon : 'wallet'} size={20} />{labels[s]}</button>
        <div className="note">Everything comes with you. Your address stays the same.</div>
      </div>
    </>
  );
}

function LanternHome() {
  const { state, dispatch } = useStore();
  const keys = state.keys.main;
  return (
    <>
      <div className="hd" style={{ gap: 10 }}>
        <span className="wordmark"><span className="mk"><Icon name="lantern" size={15} /></span>Lantern</span>
        <div style={{ fontSize: 13, color: '#C9C7E2' }}>Main account · <span className="mono">{ACCOUNTS.main.short}</span></div>
        <div className="h1">{ACCOUNTS.main.total}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#C9C7E2' }}><ChainStack size={16} />Same address on 4 chains</div>
      </div>
      <div className="body">
        <div className="card" style={{ flexDirection: 'column', gap: 6 }}>
          <div className="tt">Devices & access · same as in Keel</div>
          {keys.map(k => <div key={k.id} className="ss" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>{k.name}{k.set && k.set.provider ? ` · protected by ${providerById(k.set.provider).name}` : k.set ? ` · ${k.set.threshold} of ${k.set.members.length}` : k.standalone === false ? ' · only with protection' : ''}</span><span style={{ textAlign: 'right' }}>{k.flags.filter(f => FLAG_SHORT[f]).map(f => FLAG_SHORT[f]).join(' · ')}</span></div>)}
        </div>
        <div className="card" style={{ flexDirection: 'column', gap: 6 }}>
          <div className="tt">App sessions</div>
          {state.sessions.map(s => <div key={s.id} className="ss">{s.name} · {s.what.toLowerCase()} · {sessionSummary(s).limitShort}</div>)}
          {state.sessions.length === 0 && <div className="ss">None</div>}
        </div>
        <div className="card" style={{ flexDirection: 'column', gap: 6 }}>
          <div className="tt">Approvals read the same</div>
          <div className="ss">Lantern renders the clear-signing descriptions Keel uses. Open a Tidepool request to compare.</div>
          <button type="button" id="btn-lantern-batch" className="btn" style={{ height: 40, fontSize: 14, marginTop: 4 }} onClick={() => dispatch({ type: 'sheet', sheet: { kind: 'batch' } })}>Show a Tidepool approval</button>
        </div>
      </div>
      <div className="foot">
        <button type="button" id="btn-lantern-back" className="btn" style={{ background: '#1F1E38' }} onClick={() => dispatch({ type: 'set', patch: { skin: 'keel', sheet: null } })}><Icon name="keel" size={18} />Back to Keel</button>
      </div>
    </>
  );
}

export function LanternPhone() {
  const { state, dispatch } = useStore();
  const showBatch = state.sheet && state.sheet.kind === 'batch';
  return (
    <div className="scr l">
      {state.lanternImported ? <LanternHome /> : <ImportFlow />}
      {showBatch && <div className="k lz"><BatchSheet wallet="Lantern" /></div>}
      <Toast toast={state.toast} />
      {state.faceId && <FaceId />}
      {state.hw && state.hw.active && showBatch && <HwWait onCancel={() => dispatch({ type: 'hwCancel' })} />}
      {state.cosign && showBatch && <CosignWait cosign={state.cosign} onCancel={() => dispatch({ type: 'reject' })} />}
    </div>
  );
}
