import { Fragment, useState, useEffect } from 'react';
import { Icon } from './icons.jsx';
import { CHAINS, APPS, TOKENS, signerOptions, signerSteps, KEEL_RULES, changeState, protectorOf, VERIFY_CHECKS, permText, permUsage, fmtQty } from './data.js';
import { useStore, signerKey } from './state.jsx';

// Chain badge: the network's own logo (src/assets/chains), sized by the caller.
export function ChainDot({ id, size = 18 }) {
  const c = CHAINS.find(x => x.id === id) || CHAINS[0];
  return <span className={'cd cd-' + c.id} title={c.name} role="img" aria-label={c.name} style={{ width: size, height: size }} />;
}
export function ChainStack({ ids, size = 18 }) {
  const list = ids || CHAINS.map(c => c.id);
  return <span className="cds">{list.map(id => <ChainDot key={id} id={id} size={size} />)}</span>;
}
// Token logo with the network's own logo badged on its bottom-left corner.
const TOKEN_ART = {
  eth: <svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#ECEDF3" /><path d="M16 5l6.5 10.8L16 19.7 9.5 15.8z" fill="#343434" /><path d="M16 5v14.7l-6.5-3.9z" fill="#8C8C8C" /><path d="M16 21.1l6.5-3.9L16 27l-6.5-9.8z" fill="#343434" /><path d="M16 21.1V27l-6.5-9.8z" fill="#8C8C8C" /></svg>,
  usdc: <svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#2775CA" /><path d="M12.6 23.4a8 8 0 0 1 0-14.8M19.4 8.6a8 8 0 0 1 0 14.8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /><path d="M16 9.5v13M18.6 13.2c0-1.3-1.2-2-2.6-2s-2.6.7-2.6 1.9c0 2.9 5.2 1.4 5.2 4.3 0 1.3-1.2 2-2.6 2s-2.6-.7-2.6-2" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  tpeth: <svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#1A56C4" /><path d="M7 14c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 3 3M7 20c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 3 3" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" /></svg>,
  tpusdc: <svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#0E6F47" /><path d="M7 14c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 3 3M7 20c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 3 3" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" /></svg>,
};
export function TokenMark({ token, chain, size = 38 }) {
  return (
    <span className="tkw" style={{ width: size, height: size }}>
      <span className="tk">{TOKEN_ART[token] || TOKEN_ART.eth}</span>
      {chain && <span className="net"><ChainDot id={chain} size={Math.round(size * 0.42)} /></span>}
    </span>
  );
}
// App logo: each app's own icon and colour, so a card is recognisable before its name is read.
export function AppMark({ app, size = 34 }) {
  const a = APPS[app] || { icon: 'grid', color: 'var(--ink)' };
  return <span className="appmark" style={{ width: size, height: size, background: a.color }}><Icon name={a.icon} size={Math.round(size * 0.53)} /></span>;
}
export function chainName(id) { const c = CHAINS.find(x => x.id === id); return c ? c.name : id; }

// A co-signer's logo, from src/assets/providers (the organisations' own marks), sized by the caller.
export function ProviderMark({ id, size = 20 }) { return <span className={'plogo pl-' + id} role="img" aria-label={id} style={{ width: size, height: size }} />; }
// A key's icon tile. A protected key wears a shield badge on it: the key keeps its identity, protection is its state.
export function KeyIcon({ k, tone = '', size = 20 }) {
  return <span className={'icn ' + tone}><Icon name={k.icon} size={size} />{protectorOf(k) && <span className="bdg" title={`Protected by ${protectorOf(k).name}`}><Icon name="shield" size={10} /></span>}</span>;
}
export function Chip({ tone = 'n', icon, children, style }) {
  return <span className={'chip ' + tone} style={style}>{icon && <Icon name={icon} size={12} />}{children}</span>;
}
export function Btn({ kind = 'p', icon, onClick, id, children, className = '', style, disabled }) {
  return <button type="button" id={id} className={'btn ' + kind + ' ' + className} onClick={onClick} style={style} disabled={disabled}>{icon && <Icon name={icon} size={20} />}{children}</button>;
}
export function Card({ children, className = '', style }) { return <div className={'card ' + className} style={style}>{children}</div>; }
export function CardHead({ label, right }) { return <div className="cardhead"><span className="label">{label}</span>{right}</div>; }
export function CardFoot({ icon, children }) { return <div className="cardfoot">{icon && <Icon name={icon} size={16} />}<span>{children}</span></div>; }
export function Label({ children, style }) { return <div className="label" style={style}>{children}</div>; }

export function Row({ icon, iconTone = '', lead, title, sub, right, chips, onClick, id, top }) {
  const inner = (
    <>
      {lead || <span className={'icn ' + iconTone}><Icon name={icon} size={20} /></span>}
      <span className="grow">
        <div className="tt">{title}</div>
        {sub && <div className="ss">{sub}</div>}
        {chips && <div className="chips" style={{ marginTop: 5 }}>{chips}</div>}
      </span>
      {right && <span className="rt">{right}</span>}
    </>
  );
  const style = top ? { alignItems: 'flex-start' } : undefined;   // padding comes from .row, on the scale
  return onClick
    ? <button type="button" id={id} className="row act" onClick={onClick} style={style}>{inner}</button>
    : <div className="row" id={id} style={style}>{inner}</div>;
}
export function Cl({ ok = true, children, icon }) {
  const name = icon || (ok ? 'check' : 'ban');
  return <div className="cl"><Icon name={name} size={18} className={icon ? 'mut' : (ok ? 'ok' : 'no')} /><span className="grow">{children}</span></div>;
}
// iOS-style switch. Decorative: put role="switch" and aria-checked on the row button that toggles it.
export function Switch({ on }) { return <span className={'sw' + (on ? ' on' : '')} aria-hidden="true"><i /></span>; }
export function Kv({ k, children, mono }) { return <div className="kv"><span className="kk">{k}</span><span className={'vv' + (mono ? ' mono' : '')}>{children}</span></div>; }
export function Meta({ items }) { return <div className="meta">{items.map((it, i) => <span key={i}><Icon name={it[0]} size={15} />{it[1]}</span>)}</div>; }
export function Sentence({ children, small, size, sub }) {
  const px = size || (small ? 22 : 23);
  return <div><p className="sent" style={{ fontSize: px, lineHeight: Math.round(px * 1.6) + 'px' }}>{children}</p>{sub && <div className="sentsub">{sub}</div>}</div>;
}
export function V({ tone = '', icon, children }) { return <span className={'v ' + tone}>{icon && <Icon name={icon} size={18} />}{children}</span>; }

export function Bar({ title, onBack, right }) {
  return (
    <div className="bar">
      {onBack && <button type="button" id="btn-bar-back" className="ib" onClick={onBack} aria-label="Back"><Icon name="chevL" size={24} /></button>}
      <span className="ttl">{title}</span>
      {right}
    </div>
  );
}
export function AppBar({ app = 'Tidepool', domain = 'tidepool.fi', onClose, icon = 'wave' }) {
  return (
    <div className="bar">
      <span className="appid"><span className="mark"><Icon name={icon} size={18} /></span>
        <span><div className="n">{app}</div><div className="d">{domain} <Icon name="check" size={12} className="ok" /></div></span>
      </span>
      {onClose && <button type="button" id="btn-sheet-close" className="xbtn" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>}
    </div>
  );
}
export function Sheet({ title, appBar, children, footer, onClose, tag }) {
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label={title || 'Approval'}>
        <div className="grab" />
        <div className="sbody">
          {appBar || (
            <div className="bar"><span className="ttl">{title}</span>{tag && <Chip tone="o">{tag}</Chip>}
              {onClose && <button type="button" id="btn-sheet-close" className="xbtn" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>}
            </div>
          )}
          {children}
        </div>
        {footer && <div className="sfoot">{footer}</div>}
      </div>
    </>
  );
}
// The approve control is a split button: the action on the left, and on the right the key that signs it, which opens
// the key menu (Material 3 / Fluent split button; NN/g: fine when there is a strong default, which the everyday key is).
// The line under it names the key and its factors, so the choice is visible without opening the menu.
// `signer` fixes the key instead: a private transaction is signed by a key that exists for that one address, so there
// is nothing to pick and no co-signer; the line under the button names that key.
const FACTOR_WORDS = { face: 'Face ID', hw: 'Anchor' };
function stepWords(key, keys) { return signerSteps(key, keys).map(st => st.kind === 'provider' ? `${st.provider.name} verifies it` : FACTOR_WORDS[st.kind]).join(', then '); }
// `blocked`: the simulation found the transaction can't go through (a key's spend limit); the main button says why and
// can't be pressed.
export function ApproveFooter({ label = 'Approve with Face ID', reject = 'Reject', onApprove, onReject, icon = 'face', note, signer, blocked }) {
  const { state, dispatch } = useStore();
  const keys = state.keys.main || [];
  const cur = signerKey(state);
  const options = signer ? [] : signerOptions(keys);
  const [open, setOpen] = useState(!!(state.sheet && state.sheet.pick));
  const steps = signer ? [{ kind: 'face' }] : signerSteps(cur, keys);
  const first = steps[0].kind;
  const simulating = !!(state.sim && state.sim.phase === 'running');   // nothing can be approved before the simulation is done
  const prot = signer ? null : protectorOf(cur);
  const pick = (id) => { dispatch({ type: 'set', patch: { signer: id } }); setOpen(false); };
  return (
    <>
      {prot && (
        // the protected key's note, above the action: a co-signer verifies this transaction, with the service's mark
        <div className="protnote" role="status"><span className="pt"><Icon name="shield" size={18} /><span><b>Protected by a co-signer</b><span className="ps">Verifies this transaction before it counts</span></span></span><span className="who"><ProviderMark id={prot.id} size={22} />{prot.name}</span></div>
      )}
      <div className={'split' + (open ? ' open' : '')}>
        {simulating
          ? <Btn kind="p" id="btn-approve" className="main" disabled><span className="spin" aria-hidden="true" />Simulating…</Btn>
          : blocked ? <Btn kind="p" id="btn-approve" className="main" icon="ban" disabled>{blocked}</Btn>
          : <Btn kind="p" id="btn-approve" className="main" icon={first === 'hw' ? 'device' : icon} onClick={onApprove}>{first === 'hw' ? 'Review on Anchor' : label}</Btn>}
        {cur && options.length > 1 && (
          <button type="button" id="btn-key" className="keyseg" aria-haspopup="menu" aria-expanded={open} aria-label={`Signing with ${cur.name}${protectorOf(cur) ? `, protected by ${protectorOf(cur).name}` : ''}. Change key`} title={`Signing with ${cur.name} · change`} onClick={() => setOpen(o => !o)}>
            <span className="ki"><Icon name={cur.icon} size={18} />{protectorOf(cur) && <span className="bdg"><Icon name="shield" size={9} /></span>}</span><Icon name="chevD" size={14} className="chev" />
          </button>
        )}
        {open && (
          <>
            <div className="kmenu-bd" onClick={() => setOpen(false)} />
            <div className="kmenu" role="menu" aria-label="Sign with">
              <div className="kh">Sign with</div>
              {options.map(k => (
                <button type="button" role="menuitemradio" aria-checked={k.id === cur.id} key={k.id} id={'signer-' + k.id} className={'ki' + (k.id === cur.id ? ' on' : '')} onClick={() => pick(k.id)}>
                  <KeyIcon k={k} tone={protectorOf(k) ? 'g' : k.set ? 'l' : 'b'} size={18} />
                  <span className="grow"><div className="tt">{k.name}{protectorOf(k) && <span className="prot">Protected</span>}</div><div className="ss">{stepWords(k, keys)}</div></span>
                  {k.id === cur.id && <Icon name="check" size={18} className="ok" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {reject && <Btn kind="t" id="btn-reject" onClick={onReject} style={{ height: 36 }}>{reject}</Btn>}
      {signer && <div className="reassure"><b>{signer.name}</b> · {signer.words}.{note ? ' ' + note : ''}</div>}
      {!signer && cur && (prot
        ? (note ? <div className="reassure">{note}</div> : null)
        : <div className="reassure"><b>{cur.name}</b> · {stepWords(cur, keys)}.{note ? ' ' + note : ''}</div>)}
    </>
  );
}
// The service verifying a protected key's transaction: its checks tick one by one, then the pass is shown before the
// transaction goes, so the user sees that a verification happened, not only a wait.
// `flagged`: the transaction goes to an address the service lists as a drainer, so its second check fails, the ticking
// stops there and the service says no (Phone.jsx then dispatches `cosignBlock`).
const FAILS_AT = 1;
export function CosignWait({ cosign, flagged, onCancel }) {
  const { provider, phase } = cosign;
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (phase !== 'checking') return undefined;
    const ts = VERIFY_CHECKS.map((_, i) => (flagged && i > FAILS_AT ? null : setTimeout(() => setDone(i + 1), 300 + i * 350)));
    return () => ts.forEach(t => t && clearTimeout(t));
  }, [phase, flagged]);
  const passed = phase === 'passed';
  const refused = flagged && done > FAILS_AT;
  return (
    <div className="faceid" aria-live="polite">
      <div className={'ring co' + (passed ? ' ok' : refused ? ' no' : '')}>{passed ? <Icon name="check" size={40} /> : refused ? <Icon name="ban" size={40} /> : <ProviderMark id={provider.id} size={48} />}</div>
      <div style={{ fontWeight: 600 }}>{passed ? `Verified by ${provider.name}` : refused ? `${provider.name} said no` : `${provider.name} is verifying`}</div>
      <div className="vchecks">
        {VERIFY_CHECKS.map((c, i) => {
          if (refused && i > FAILS_AT) return null;
          const bad = refused && i === FAILS_AT;
          const ok = !bad && (passed || done > i);
          return <div key={c} className={'vc' + (ok ? ' ok' : bad ? ' no' : '')}><span className="vi">{ok ? <Icon name="check" size={13} /> : bad ? <Icon name="ban" size={13} /> : <span className="spin sm" aria-hidden="true" />}</span>{bad ? 'Recipient is a known drainer address' : c}</div>;
        })}
      </div>
      <div className="sm mut" style={{ textAlign: 'center', padding: '0 44px' }}>{passed ? 'Its signature is added. Sending.' : refused ? `${provider.name} won’t sign, so this key can’t send it.` : provider.id === 'safenet' ? 'Its validators check the transaction and sign it together. Without their signature it doesn’t count.' : 'It checks the transaction and signs it. Without its signature it doesn’t count.'}</div>
      {!passed && !refused && <button type="button" className="btn t" style={{ height: 36, width: 'auto', padding: '0 16px' }} onClick={onCancel}>Cancel</button>}
    </div>
  );
}
export function Toast({ toast }) {
  if (!toast) return null;
  return <div className="toast" key={toast.id}><Icon name={toast.kind === 'warn' ? 'ban' : 'check'} size={16} />{toast.text}</div>;
}
export function FaceId({ sub = 'Signing with iPhone 16 Pro' }) {
  return (
    <div className="faceid" aria-live="polite">
      <div className="ring"><Icon name="face" size={44} /></div>
      <div style={{ fontWeight: 600 }}>Face ID</div>
      <div className="sm mut">{sub}</div>
    </div>
  );
}
// With an `id`, opening the box is also recorded in the store (`opened`), so the tutorial can tell it was read.
export function Details({ title = 'Under the hood', children, open = false, id }) {
  const { dispatch } = useStore();
  const [on, setOn] = useState(open);
  const toggle = () => { if (!on && id) dispatch({ type: 'opened', id }); setOn(o => !o); };
  return (
    <div className={'details' + (on ? ' on' : '')}>
      <button type="button" id={id} className="dt" onClick={toggle} aria-expanded={on}><Icon name="code" size={14} /><span className="grow">{title}</span><Icon name="chevD" size={16} className="chev" /></button>
      {on && <div className="dc">{children}</div>}
    </div>
  );
}
// Keel waiting on the Anchor: for a signature, or (`connect`) for the device to let Keel see its accounts.
export function HwWait({ onCancel, connect }) {
  return (
    <div className="faceid" aria-live="polite">
      <div className="ring hw"><Icon name="device" size={40} /></div>
      <div style={{ fontWeight: 600 }}>{connect ? 'Confirm on your Anchor' : 'Check your Anchor'}</div>
      <div className="sm mut" style={{ textAlign: 'center', padding: '0 44px' }}>{connect ? 'Keel asked to connect. Approve on the device to see the accounts on it.' : 'Your hardware wallet shows exactly what this approval guarantees. Approve or reject there.'}</div>
      <button type="button" className="btn t" style={{ height: 36, width: 'auto', padding: '0 16px' }} onClick={onCancel}>Cancel</button>
    </div>
  );
}
// --- Consent primitives ------------------------------------------------------
// Every app request is the same screen: who is asking, one sentence with the values slotted in,
// then short lists and facts in cards. The wallet renders these from the request; nothing is written per app.
// Scopes: grouped one-line permissions. An item is [true|false|iconName, text].
export function Scopes({ groups, foot }) {
  return (
    <Card className="scopes">
      {groups.map(g => (
        <div className="grp" key={g.label}>
          <div className="label">{g.label}</div>
          {g.items.map(([m, text], i) => (
            <div key={i} className={'scope ' + (m === true ? 'ok' : m === false ? 'no' : 'x')}><Icon name={m === true ? 'check' : m === false ? 'ban' : m} size={16} /><span>{text}</span></div>
          ))}
        </div>
      ))}
      {foot && <CardFoot icon={foot[0]}>{foot[1]}</CardFoot>}
    </Card>
  );
}
// Steps: nodes on a rail, in order. Each is one call as its ERC-7730 descriptor renders it: the intent as the title,
// under it where it runs (the protocol that owns the descriptor, or what kind of rule it is, and the network when the
// request spans several), then the descriptor's fields as a definition list (a token amount with its own ticker, a
// name for an address, a date). The wallet composes no sentence. A node with kind 'check' is an ERC-8211 predicate
// step (the app's, or the one Keel appended last), marked with a shield instead of a number.
export function CallRows({ items }) {
  const multi = new Set(items.map(c => c.chain).filter(Boolean)).size > 1;
  return items.map((c, i) => {
    const where = [c.protocol || c.note, multi && c.chain ? chainName(c.chain) : null].filter(Boolean).join(' · ');
    return (
      <div className={'call' + (c.kind === 'check' ? ' chk' : '')} key={i}>
        <span className="nd">{c.kind === 'check' ? <Icon name={c.icon || 'shield'} size={15} /> : i + 1}{c.chain && <span className="net"><ChainDot id={c.chain} size={14} /></span>}</span>
        <span className="grow">
          <div className="tt">{c.intent}</div>
          {where && <div className="ss">{where}</div>}
          {c.fields && c.fields.length > 0 && <div className="cf">{c.fields.map(([l, v], j) => <Fragment key={j}><span className="fl">{l}</span><span className="fv">{v}</span></Fragment>)}</div>}
        </span>
      </div>
    );
  });
}
export function Calls({ items, foot }) {
  return <Card><CallRows items={items} />{foot && <CardFoot icon={foot[0]}>{foot[1]}</CardFoot>}</Card>;
}
// State changes: one row per asset on one account, with its net change and the bound the assertion fixes it to. The
// sub line names the account (yours, or one you transfer to) and may state a fact about the number, never a purpose.
function ChangeRows({ changes }) {
  return changes.map((c, i) => (
    <div className="chg" key={i}>
      {c.token ? <TokenMark token={c.token} chain={c.chain} size={34} /> : <span className={'icn ' + (c.tone || 'l')}><Icon name={c.icon || 'layers'} size={18} /></span>}
      <span className="grow"><div className="tt">{c.label}</div><div className="ss">{[c.account, c.note].filter(Boolean).join(' · ') || c.sub}</div></span>
      <span className="val"><div className={'tt' + ((c.delta || '').startsWith('+') ? ' ok' : '')}>{c.delta || c.value}</div>{c.bound && <div className="ss">{c.bound}</div>}</span>
    </div>
  ));
}
// Two views of one transaction in one card. State changes first: what the simulation says will change, one asset on
// one account with its net change, fixed as assertions the network checks and the hardware wallet shows. Then Steps:
// each call as its descriptor renders it, with Keel's rule last. Both wait for the simulation. The open tab is the
// sheet's (`sheet.tab`), so a feature route can open Steps and the tutorial can see the switch.
export function TxTabs({ steps, changes, rule }) {
  const { state, dispatch } = useStore();
  const ready = useSim();
  const tab = state.sheet && state.sheet.tab === 'steps' ? 'steps' : 'state';
  const setTab = (t) => dispatch({ type: 'sheetPatch', patch: { tab: t } });
  const items = ready && rule ? [...steps, { kind: 'check', intent: rule.intent, fields: rule.fields, note: 'Rule added by Keel · checked last', chain: rule.chain }] : steps;
  return (
    <Card className="txtabs">
      <div className="ctabs" role="tablist">
        <button type="button" role="tab" id="tab-state" aria-selected={tab === 'state'} className={tab === 'state' ? 'on' : ''} onClick={() => setTab('state')}><Icon name="swap" size={16} />State changes{ready ? <span className="cnt">{changes.length}</span> : <span className="spin sm" aria-hidden="true" />}</button>
        <button type="button" role="tab" id="tab-steps" aria-selected={tab === 'steps'} className={tab === 'steps' ? 'on' : ''} onClick={() => setTab('steps')}><Icon name="list" size={16} />Steps<span className="cnt">{items.length}</span></button>
      </div>
      {tab === 'steps' && <CallRows items={items} />}
      {tab === 'state' && (ready
        ? <><ChangeRows changes={changes} /><CardFoot icon="shield">Nothing else changes. Fixed by transaction assertions: if the real result differs, the transaction fails. Checked on-chain and shown on your hardware wallet.</CardFoot></>
        : <div className="simbox"><span className="spin" aria-hidden="true" /><span className="grow"><div className="tt">Simulating…</div><div className="ss">Keel runs the transaction first, then fixes what it changes.</div></span></div>)}
    </Card>
  );
}
// Every transaction is simulated before it can be approved: the wallet runs it, then derives the guarantees (EIP-7906
// bounds) and the end rule (ERC-8211) from the simulated result. `state.sim` runs from the moment the sheet opens;
// the hook ends it after a moment and says whether the sheet may show what it derived.
export function useSim() {
  const { state, dispatch } = useStore();
  const sim = state.sim;
  const running = !!(sim && sim.phase === 'running');
  const at = sim ? sim.at : 0;
  useEffect(() => {
    if (!running) return undefined;
    const t = setTimeout(() => dispatch({ type: 'simDone' }), 1300);
    return () => clearTimeout(t);
  }, [running, at, dispatch]);
  return !running;
}
// What the simulation produces sits behind this gate: a placeholder while it runs, the children once it is done.
export function SimGate({ children }) {
  const ready = useSim();
  if (ready) return children;
  return (
    <Card className="simbox" aria-live="polite">
      <span className="spin" aria-hidden="true" />
      <span className="grow"><div className="tt">Simulating…</div><div className="ss">Keel runs the transaction first, then adds what it can guarantee.</div></span>
    </Card>
  );
}
// A key or settings change as the same tabbed card: the change is step 1 (its intent and fields, on the Keystore),
// Keel's rule is step 2 once the simulation is done, and the state changes say what the key list will hold afterwards.
export function KeelRule({ what, fields = [], keys = 'only this change', rule = KEEL_RULES.change }) {
  return <TxTabs steps={[{ intent: what, fields, note: 'Keystore · every network' }]} changes={changeState(keys)} rule={rule} />;
}
// A permission an app asks for or holds (ERC-7715), one row: the token (a lock for contract access), what it allows, and
// on the right its number. Where the app marked it adjustable the number is a live control the user can change before
// approving (green with a pen, like everything tappable in Keel); a stream's cap follows its rate and is stated in the
// sub line. A spending row the app fixed shows its number in ink and says so under it. On a grant's detail `usage`
// shows what is left and `onRemove` offers to revoke that one row.
export function PermRows({ perms, onChange, usage, onRemove, app = 'the app' }) {
  const num = (v) => { const n = Number(String(v).replace(/[^\d.]/g, '')); return Number.isFinite(n) ? n : 0; };
  return perms.map(p => {
    const t = permText(p);
    const s = p.kind === 'call' ? '' : TOKENS[p.token].symbol;
    const key = p.kind === 'stream' ? 'rate' : 'amount';
    const edit = !!onChange && p.adjust && p.kind !== 'call';
    const fixed = !!onChange && !p.adjust && p.kind !== 'call';
    return (
      <div className={'prow' + (edit ? ' edit' : '')} key={p.id} id={'perm-' + p.id}>
        {p.kind === 'call' ? <span className="icn l"><Icon name="lock" size={17} /></span> : <TokenMark token={p.token} size={34} />}
        <span className="grow"><div className="tt">{edit || fixed ? t.name : t.title}</div>{(usage || t.sub) && <div className="ss">{usage && p.kind !== 'call' ? permUsage(p) : t.sub}</div>}</span>
        {edit && (
          <label className="pval">
            <span className="pn"><span className="padj"><Icon name="pen" size={14} /><input id={'perm-input-' + p.id} aria-label={`${t.name} in ${s}`} defaultValue={p[key]} size={Math.max(1, String(p[key]).length)} inputMode="decimal" onChange={e => { e.target.size = Math.max(1, e.target.value.length); onChange(p.id, { [key]: num(e.target.value) }); }} /></span><span className="u">{s}</span></span>
          </label>
        )}
        {fixed && <span className="pval"><span className="pn"><span className="pfix">{fmtQty(p.token, p[key])}</span><span className="u">{s}</span></span><span className="pp">set by {app}</span></span>}
        {!!onChange && p.kind === 'call' && <span className="pset">Set by {app}</span>}
        {onRemove && <span className="rt"><button type="button" id={'perm-remove-' + p.id} className="rm" onClick={() => onRemove(p)}>Remove</button></span>}
      </div>
    );
  });
}
// The app's own rule on its grant, as the last row of the same list: a mark and the rule in one quiet line.
export function PermRule({ rule }) {
  return <div className="prow rule"><span className="icn"><Icon name="trend" size={17} /></span><span className="grow"><div className="rtext">{rule.text}</div></span></div>;
}
// Facts: key on the left, value on the right, an optional note under the key.
export function Facts({ rows }) {
  return (
    <Card>
      {rows.map(([k, v, sub]) => (
        <div className="fact" key={k}><span className="grow"><div className="fk">{k}</div>{sub && <div className="fs">{sub}</div>}</span><span className="fv">{v}</span></div>
      ))}
    </Card>
  );
}
export function Note({ icon = 'info', children, tone = '' }) {
  return <div className={'note ' + tone}><Icon name={icon} size={16} /><span>{children}</span></div>;
}
