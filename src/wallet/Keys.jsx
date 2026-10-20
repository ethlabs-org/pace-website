import { useEffect, useState } from 'react';
import { useStore } from '../state.jsx';
import { Icon } from '../icons.jsx';
import { Btn, Card, CardHead, CardFoot, Row, Cl, Chip, ChainDot, ChainStack, Label, Sheet, ApproveFooter, Sentence, V, Kv, Note, Details, Switch, chainName, KeelRule, KeyIcon, ProviderMark, AppMark } from '../ui.jsx';
import { TOKENS, fmtQty, permText, ORACLE, ORACLES, ORACLE_SUB, oracleOf, LIMIT_PERIODS, LIMIT_DEFAULT, fmtCap, fmtLimit, fmtLimitShort, FLAGS, FLAG_SHORT, FLAG_ORDER, KEY_TYPES, ALGOS, KEY_SOURCES, KEY_PHRASE, KEY_PHRASE_CHECKS, describeKey, CHAINS, ALL_CHAIN_IDS, ACCOUNTS, PROVIDERS, providerById, protectorOf, VERIFY_CHECKS } from '../data.js';

// sky = yours, peach = recovery, lilac = acts on your behalf or together with something, mint = fees only
const toneFor = (k) => k.recovery ? 'a' : (k.delegation || k.manager || k.set) ? 'l' : k.gasOnly ? 'g' : 'b';
const flagChips = (flags) => flags.filter(f => FLAG_SHORT[f]).map(f => <Chip key={f} tone={f === 'admin' ? 'g' : f === 'session' ? 'b' : f === 'recovery' ? 'a' : 'n'}>{FLAG_SHORT[f]}</Chip>);
// Keys that can be members of a set: anything that signs on its own behalf (not a set, not recovery-only, not fees-only, not an app).
const memberable = (keys) => keys.filter(k => !k.set && !k.recovery && !k.gasOnly && !k.manager);
// The sets a key belongs to, by name, for the "only with …" chip.
const setsOf = (keys, id) => keys.filter(k => k.set && k.set.members.includes(id));
const withWord = (keys, k) => { const s = setsOf(keys, k.id); const x = s.find(y => y.set.provider) || s[0]; return x ? (x.set.provider ? providerById(x.set.provider).name : x.short) : 'a set'; };
// Permissions, expiry and networks are defaults most people never touch: folded under one row that states the
// current values, so nothing is hidden blindly. Feature routes that preset one of them open it.
function Advanced({ summary, open = false, children }) {
  const [on, setOn] = useState(open);
  return (
    <>
      <div className={'details' + (on ? ' on' : '')}>
        <button type="button" id="btn-advanced" className="dt" onClick={() => setOn(o => !o)} aria-expanded={on}><Icon name="gear" size={14} /><span className="grow">Advanced settings<span className="ds">{summary}</span></span><Icon name="chevD" size={16} className="chev" /></button>
      </div>
      {on && children}
    </>
  );
}

// One fact of a key card: a plain label on the left, the value on the right, an optional second line under the value.
// Every key shows the same facts in the same order (can · co-signer · spend limit · expiry), so two cards compare.
function KFact({ label, value, sub, lead, tone = '' }) {
  return (
    <span className={'kfact ' + tone}>
      <span className="fk">{label}</span>
      <span className="fv"><span className="v">{lead}{value}</span>{sub && <span className="fs">{sub}</span>}</span>
    </span>
  );
}
// A signing key as a card: who it is and its role, then the facts. Values carry the meaning on their own; a sub line
// only adds what the value can't say (the rest of a limit, what a co-signer does), never a paraphrase of the value.
function KeyCard({ k, keys, signer, onClick }) {
  const prov = protectorOf(k);
  const admin = k.flags.includes('admin');
  const send = k.flags.includes('send'), gas = k.flags.includes('gas'), sponsor = k.flags.includes('sponsor');
  const override = !k.set && k.local && k.standalone !== false && keys.some(x => x.set && x.set.provider);
  const members = k.set ? k.set.members.length + (prov ? 1 : 0) : 0;
  const can = admin ? { value: 'Everything', sub: 'add and remove keys, send, pay fees' }
    : send && gas ? { value: 'Send, pay fees', sub: sponsor ? 'and pay fees for other accounts' : null }
    : send ? { value: 'Send' }
    : gas ? { value: 'Pay fees', sub: sponsor ? 'for this and other accounts' : 'can’t send' }
    : { value: 'Nothing' };
  const cosign = prov ? { lead: <ProviderMark id={prov.id} size={14} />, value: prov.name, sub: 'checks every transaction, then signs' }
    : k.set ? { value: `${k.set.threshold} of ${members} keys`, sub: 'must sign together' }
    : k.standalone === false ? { value: `Only with ${withWord(keys, k)}` }
    : { value: 'None', sub: 'signs on its own' };
  const caps = k.limit ? LIMIT_PERIODS.filter(([id]) => k.limit[id] > 0).map(([id, , word]) => `${fmtCap(k.limit[id])} ${word}`) : [];
  const limit = caps.length ? { value: caps[0], sub: caps.slice(1).join(' · ') || null, lead: <ProviderMark id={oracleOf(k.limit).id} size={14} /> }
    : { value: 'None', sub: admin ? 'full access can’t be capped' : 'can move the whole balance' };
  const role = k.id === signer ? <Chip tone="g">Everyday</Chip> : override ? <Chip tone="a">Override</Chip> : null;
  return (
    <button type="button" id={'keycard-' + k.id} className="keycard act" onClick={onClick}>
      <span className="kh">
        <KeyIcon k={k} tone={k.pq ? 'g' : prov ? 'b' : toneFor(k)} />
        <span className="grow">
          <span className="tt">{k.name}</span>
          <span className="ss">{k.type}{k.pq ? ' · quantum-safe' : ''}{role}</span>
        </span>
        <Icon name="chevR" size={20} className="dim" />
      </span>
      <span className="kfacts">
        <KFact label="Can" {...can} />
        <KFact label="Co-signer" {...cosign} />
        <KFact label="Spend limit" {...limit} />
        {k.expiry && !k.sub.includes('expires') && <KFact label="Expires" value={k.expiry} />}
      </span>
    </button>
  );
}

// An app-controlled key as the same card shape: the app and what it does, then the facts that bound it. A grant from
// an app (state.sessions, ERC-7715) and a session key in the key list (k.manager) are the same thing to the user.
function AppKeyCard({ id, app, name, what, facts, onOpen, onRemove }) {
  return (
    <Card>
      <button type="button" id={'appcard-' + id} className="keycard act" onClick={onOpen}>
        <span className="kh">
          <AppMark app={app} size={38} />
          <span className="grow">
            <span className="tt">{name}</span>
            <span className="ss">{what}</span>
          </span>
          <Icon name="chevR" size={20} className="dim" />
        </span>
        <span className="kfacts">{facts.map((f, i) => <KFact key={i} label={f.label} value={f.value} sub={f.sub} />)}</span>
      </button>
      <div className="cardact">
        <button type="button" id={'appcard-remove-' + id} onClick={onRemove}><Icon name="ban" size={16} />Remove access</button>
      </div>
    </Card>
  );
}
// The facts of a grant: one row per spending permission (the token is the label), the contract it may use, its rule, the end.
function sessionFacts(s) {
  const spend = s.perms.filter(p => p.kind !== 'call'), call = s.perms.find(p => p.kind === 'call');
  return [
    ...spend.map(p => { const t = permText(p); return { label: t.name, value: `${fmtQty(p.token, p.kind === 'stream' ? p.rate : p.amount)} ${TOKENS[p.token].symbol}`, sub: t.sub }; }),   // the label carries the period
    ...(call ? [{ label: 'Can use', value: call.target, sub: 'one contract, nothing else' }] : []),
    ...(s.rule ? [{ label: 'Stops if', value: s.rule.short, sub: 'checked after every run' }] : []),
    { label: 'Until', value: s.expiry, sub: 'or until you remove it' },
  ];
}
const keyFacts = (k) => [
  { label: 'Spend limit', value: k.policy, sub: k.chains.length === 4 ? 'on all 4 networks' : 'on ' + k.chains.map(chainName).join(', ') + ' only' },
  { label: 'Can use', value: k.manager, sub: 'one contract, nothing else' },
  { label: 'Until', value: k.expiry, sub: 'or until you remove it' },
];

export function KeysScreen() {
  const { state, dispatch } = useStore();
  const keys = state.keys[state.accountId] || [];
  const isMain = state.accountId === 'main';
  const open = (sheet) => dispatch({ type: 'sheet', sheet });
  const act = (sheet) => state.locked ? dispatch({ type: 'toast', text: 'Frozen · lift the freeze first', kind: 'warn' }) : open(sheet);
  // Two tabs: the user's own keys, and keys an app controls. `screen: 'apps'` (older routes) opens the second tab.
  const tab = state.screen === 'apps' ? 'apps' : (state.keysTab || 'mine');
  const setTab = (t) => dispatch({ type: 'set', patch: { screen: 'keys', keysTab: t } });
  // One list. A protected key is shown once, as the device with protection on: its member entry (the phone that
  // only acts together with the service) stays out of the list. Sets come first: they are what signs day to day.
  const hidden = (k) => k.standalone === false && setsOf(keys, k.id).some(x => x.set.provider);
  const own = keys.filter(k => !k.recovery && !k.delegation && !k.manager && !hidden(k));
  const main = [...own.filter(k => k.set), ...own.filter(k => !k.set)];
  const recovery = keys.filter(k => k.recovery);
  const delegations = keys.filter(k => k.delegation && !hidden(k));
  const sessions = isMain ? state.sessions : [];
  const sessionKeys = keys.filter(k => k.manager);
  const appCount = sessions.length + sessionKeys.length;
  const keyRow = (k) => (
    <Row key={k.id} id={'keyrow-' + k.id} lead={<KeyIcon k={k} tone={k.pq ? 'g' : protectorOf(k) ? 'b' : toneFor(k)} />} title={k.name} sub={k.type + (k.expiry && !k.sub.includes('expires') ? ' · expires ' + k.expiry : '')}
      chips={[...(protectorOf(k) ? [<Chip key="prot" tone="g" icon="shield">Protected by {protectorOf(k).name}</Chip>] : k.set ? [<Chip key="set" tone="l" icon="set">{k.set.threshold} of {k.set.members.length} · multisig</Chip>] : []), ...(k.standalone === false ? [<Chip key="only" tone="b" icon="link">only with {withWord(keys, k)}</Chip>] : []), ...(k.limit ? [<Chip key="lim" tone="n" icon="coins">{fmtLimitShort(k.limit)}</Chip>] : []), ...flagChips(k.flags)]} top right={<Icon name="chevR" size={20} className="dim" />} onClick={() => open({ kind: 'keyDetail', keyId: k.id })} />
  );
  return (
    <>
      <div className="body">
        <div className="bar"><span className="ttl" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Keys</span></div>
        <div className="segk" role="tablist">
          <button type="button" role="tab" id="keys-tab-mine" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>My keys</button>
          <button type="button" role="tab" id="keys-tab-apps" aria-selected={tab === 'apps'} className={tab === 'apps' ? 'on' : ''} onClick={() => setTab('apps')}>App-controlled keys{appCount > 0 && <span className="cnt">{appCount}</span>}</button>
        </div>
        {tab === 'mine' ? (
          <>
            <p className="sm mut">Everything that can act for {ACCOUNTS[state.accountId].name}. The same list on every network.</p>
            {state.locked && <Note icon="lock" tone="a">Frozen until Oct 11 · nothing can be added, removed or changed. Sending still works.</Note>}
            {delegations.length > 0 && <div><Label style={{ marginBottom: 6 }}>Managed by</Label><Card>{delegations.map(keyRow)}</Card></div>}
            {main.length > 0 && <div className="keylist"><Label>Keys</Label>{main.map(k => <Card key={k.id}><KeyCard k={k} keys={keys} signer={state.signer} onClick={() => open({ kind: 'keyDetail', keyId: k.id })} /></Card>)}</div>}
            {recovery.length > 0 && <div><Label style={{ marginBottom: 6 }}>Recovery</Label><Card>{recovery.map(keyRow)}</Card></div>}
          </>
        ) : (
          <>
            <p className="sm mut">What apps may do for {ACCOUNTS[state.accountId].name}: each permission is a limit you approved, enforced by the network.</p>
            {state.locked && <Note icon="lock" tone="a">Frozen until Oct 11 · access can’t be given or removed. Apps you already allowed keep working.</Note>}
            {appCount === 0 ? (
              <Card><Row icon="check" iconTone="g" title="No app has access" sub="Only your own devices and keys can act for you." top /></Card>
            ) : (
              <>
                <div className="keylist">
                  {sessions.map(s => <AppKeyCard key={s.id} id={s.id} app={s.app} name={s.name} what={s.what} facts={sessionFacts(s)} onOpen={() => open({ kind: 'sessionDetail', sessionId: s.id })} onRemove={() => act({ kind: 'revokeSession', sessionId: s.id })} />)}
                  {sessionKeys.map(k => <AppKeyCard key={k.id} id={k.id} app={k.manager} name={k.name} what={`Trades for you on ${k.manager}`} facts={keyFacts(k)} onOpen={() => open({ kind: 'keyDetail', keyId: k.id })} onRemove={() => act({ kind: 'revokeKey', keyId: k.id })} />)}
                </div>
                <div>
                  <Label style={{ marginBottom: 6 }}>What no app can do</Label>
                  <Card>
                    <Cl ok={false}>Go past the limits you approved</Cl>
                    <Cl ok={false}>Touch money or apps it wasn’t given</Cl>
                    <Cl ok={false}>Change your devices, keys or access</Cl>
                    <CardFoot icon="shield">Enforced by the network, not by the app. A request that breaks one is rejected before it reaches a block.</CardFoot>
                  </Card>
                </div>
                <Note icon="clock">Removing access takes effect at once, on every network.</Note>
                <Details>
                  <Kv k="What these are">App permissions (ERC-7715): each is a Keystore row for the app’s session account, gated to the policy manager (EIP-8130) and redeemed through it (ERC-7710)</Kv>
                  {sessions.map(s => <Kv key={s.id} k={s.app}>{s.tech}</Kv>)}
                  {sessionKeys.map(k => <Kv key={k.id} k={k.name}>{k.tech} · a key with POLICY scope</Kv>)}
                  {sessions.some(s => s.rule) && <Kv k="Outcome rule">A policy written as a result and checked after every use (EIP-7906), not as a list of allowed calls</Kv>}
                  <Kv k="Removing">Keystore.revokeActor per row · the manager refuses from that block, on every chain</Kv>
                </Details>
              </>
            )}
          </>
        )}
      </div>
      <div className="foot">
        {tab === 'mine'
          ? <Btn kind="p" icon="plus" id="btn-add-key" onClick={() => state.locked ? dispatch({ type: 'toast', text: 'Frozen · lift the freeze first', kind: 'warn' }) : open({ kind: 'addKey', preset: 'passkey' })}>Add a device or key</Btn>
          : appCount > 1 && <Btn kind="s" icon="ban" id="btn-revoke-all" onClick={() => act({ kind: 'revokeAll' })}>Remove all app access</Btn>}
        <div className="links">
          <button type="button" id="btn-freeze" onClick={() => open({ kind: state.locked ? 'unlock' : 'lock' })}>{state.locked ? 'Lift the freeze' : 'Freeze changes'}</button>
          <button type="button" id="btn-cancel-pending" onClick={() => open({ kind: 'cancelPending' })}>Cancel unfinished changes</button>
        </div>
      </div>
    </>
  );
}

export function AddKeySheet() {
  const { state, dispatch } = useStore();
  const sh = state.sheet;
  // The choices so far live in this sheet's own state and are copied to `sh.ui` (below). When the sheet mounts again
  // with `ui` already set (the tutorial put a step back), it picks up from those choices.
  const u = sh.ui || {};
  const [step, setStep] = useState(u.step || sh.step || 1);
  const [type, setType] = useState(u.type || sh.preset || 'passkey');
  const [algo, setAlgo] = useState(u.algo || sh.algo || 'ecdsa');
  const [source, setSource] = useState(u.source || sh.source || 'own');
  const [flags, setFlags] = useState(u.flags || sh.flags || ['send', 'gas']);
  const [expiry, setExpiry] = useState(u.expiry || sh.expiryPreset || 'never');
  const [chains, setChains] = useState(ALL_CHAIN_IDS);
  const [shown, setShown] = useState(false);
  const [picks, setPicks] = useState({});
  const [name, setName] = useState(sh.name || null); // null until the user edits: the field then follows the wallet's default name
  const keys = state.keys[state.accountId] || [];
  const candidates = memberable(keys);
  const phone = (candidates.find(k => k.local && !k.hardware) || candidates[0] || {}).id;
  const anchor = (candidates.find(k => k.hardware) || candidates[1] || candidates[0] || {}).id;
  // A multisig: which existing keys are in and how many must approve.
  const [members, setMembers] = useState(sh.members || [phone, anchor].filter(Boolean));
  const [threshold, setThreshold] = useState(sh.threshold || 2);
  // Protection: any new key can be added with a co-signer. The first service not already in use is preselected.
  const used = keys.filter(k => k.set && k.set.provider).map(k => k.set.provider);
  const [protect, setProtect] = useState(!!(u.protect ?? sh.protect));
  const [provider, setProvider] = useState(u.provider || sh.provider || (PROVIDERS.find(pv => !used.includes(pv.id)) || PROVIDERS[0]).id);
  // Spend limit: dollar caps the network enforces on what the key can move, priced by Chainlink. Full access can't be capped.
  const [limitOn, setLimitOn] = useState(!!(u.limitOn ?? sh.limit));
  const [limit, setLimit] = useState(sh.limitPreset || LIMIT_DEFAULT);
  const [oracle, setOracle] = useState(u.oracle || ORACLE.id);   // where the limit gets its prices
  const setCap = (id, v) => setLimit(l => ({ ...l, [id]: Math.min(9999999, parseInt(String(v).replace(/\D/g, ''), 10) || 0) }));
  const close = () => dispatch({ type: 'sheet', sheet: null });
  const toggleFlag = (f) => setFlags(fs => fs.includes(f) ? fs.filter(x => x !== f) : [...fs, f]);
  const toggleChain = (c) => setChains(cs => cs.includes(c) ? cs.filter(x => x !== c) : [...cs, c]);
  const isAdmin = flags.includes('admin');
  const lim = limitOn && !isAdmin && LIMIT_PERIODS.some(([id]) => limit[id] > 0) ? { ...limit, oracle } : null;
  const expiryLabel = { never: null, '30d': 'Oct 11, 2026', '1y': 'Sep 11, 2027' }[expiry];
  // Only a phrase or a hardware wallet can produce a SPHINCS+ key; a passkey is always P-256, another account signs for itself.
  const pickAlgo = type === 'seed' || type === 'hardware';
  const quantum = type === 'quantum';   // Keel makes it: always SPHINCS+, always full access
  const pq = quantum || (pickAlgo && algo === 'sphincs');
  // The account's first passkey is this phone's (Face ID); after that a passkey is another device.
  const firstPhone = type === 'passkey' && !keys.some(k => k.icon === 'phone');
  // Picking a type sets the access that goes with it: a quantum-safe key from Keel has full access.
  const pickType = (id) => { setType(id); if (id === 'quantum') setFlags(['admin', 'send', 'gas']); else if (type === 'quantum') setFlags(['send', 'gas']); };
  const newPhrase = type === 'seed' && source === 'new';
  const isSet = type === 'multisig';
  const need = Math.max(1, Math.min(threshold, members.length));
  const d = describeKey({ keyType: type, algo: pickAlgo ? algo : 'ecdsa', source, protect, provider, threshold: need, members, phone: firstPhone });
  const prov = d.prov;
  const shortOf = (id) => (keys.find(k => k.id === id) || {}).short || 'key';
  const setLabel = members.map(shortOf).join(' + ');
  const keyName = (name ?? (isSet ? setLabel : d.name)).trim() || d.name;
  const toggleMember = (id) => setMembers(ms => ms.includes(id) ? ms.filter(x => x !== id) : [...ms, id]);
  const approve = () => dispatch({ type: 'sign', sheet: { ...sh, keyType: type, algo: pickAlgo ? algo : quantum ? 'sphincs' : 'ecdsa', source: type === 'seed' ? source : null, flags, expiry: expiryLabel, chains, name: keyName, members: isSet ? members : [], threshold: need, protect, provider: protect ? provider : null, limit: lim, phone: firstPhone } });
  // The choices so far, copied to the sheet for the tutorial to read (`sheet.ui`), only when one changed. They stay under
  // `ui`: SheetHost keys this sheet on its top-level presets (step, source, flags, …), so writing those would remount it.
  const ui = { step, type, algo, source, protect, provider, limitOn: !!lim, oracle, expiry, flags };
  const uiKey = JSON.stringify(ui);
  useEffect(() => { if (JSON.stringify(sh.ui || null) !== uiKey) dispatch({ type: 'sheetPatch', patch: { ui: JSON.parse(uiKey) } }); }, [uiKey, sh.ui, dispatch]);
  if (step === 1) {
    return (
      <Sheet title="Add a device or key" onClose={close} footer={<Btn kind="p" icon="arrowR" id="btn-key-type-continue" onClick={() => setStep(2)}>Continue</Btn>}>
        <p className="sm mut">Any of these can act for your account. You can mix them freely.</p>
        <Card>
          {KEY_TYPES.map(k => <Row key={k.id} id={'type-' + k.id} icon={k.pick || k.icon} iconTone={type === k.id ? 'g' : ''} title={k.id === 'passkey' && !keys.some(x => x.icon === 'phone') ? 'Face ID on this phone' : k.name} sub={k.id === 'passkey' && !keys.some(x => x.icon === 'phone') ? 'A passkey in this iPhone, unlocked by your face' : k.sub} right={<Icon name={type === k.id ? 'check' : 'chevR'} size={20} className={type === k.id ? 'ok' : 'dim'} />} onClick={() => pickType(k.id)} />)}
        </Card>
        {type === 'quantum' && <Note icon="shield" tone="g">Keel makes a SPHINCS+ key on this phone and backs it up with your account. It gets full access, so it can replace your old keys later.</Note>}
        {type === 'seed' && <Note icon="shield" tone="g">A phrase can give you a quantum-safe key too. You choose that next. Your address and everything else stay exactly the same.</Note>}
        {type === 'account' && <Note icon="wallet">Whoever can use that account will be able to use this one too, within the limits you set next.</Note>}
        {type === 'hardware' && <Note icon="device">A hardware wallet shows what each approval guarantees on its own screen, so a hacked computer can’t fool it.</Note>}
        {type === 'multisig' && <Note icon="set">Pick two or more of your keys and how many must approve. The network checks all the signatures; your address doesn’t change.</Note>}
      </Sheet>
    );
  }
  if (step === 3) {
    // A new phrase: shown once, then checked, before anything is signed.
    return (
      <Sheet title="Write down 12 words" onClose={close} footer={<><Btn kind="p" icon="check" id="btn-key-wrote" disabled={!shown} onClick={() => setStep(4)}>I wrote them down</Btn><Btn kind="t" onClick={() => setStep(2)} style={{ height: 36 }}>Back</Btn></>}>
        <p className="sm mut">These words are the only copy of your new {pq ? 'quantum-safe' : ''} key. Write them down in order and keep them offline.</p>
        <Card>
          <CardHead label="12 words" right={<Chip tone="a">Shown once</Chip>} />
          <div className="wordbox">
            <div className={'words' + (shown ? '' : ' hid')} aria-hidden={!shown}>
              {KEY_PHRASE.map((w, i) => <span key={w}><i>{i + 1}</i>{w}</span>)}
            </div>
            {!shown && <div className="reveal"><button type="button" id="btn-key-reveal" onClick={() => setShown(true)}><Icon name="eye" size={16} />Tap to reveal</button></div>}
          </div>
          <CardFoot icon="lock">Keel never asks for these words. Nobody from Keel ever will.</CardFoot>
        </Card>
        <Card>
          <Cl icon="ban">Don’t keep them as a screenshot or in a note on your phone</Cl>
          <Cl icon="ban">Don’t share them with anyone, not even support</Cl>
          <div style={{ height: 8 }} />
        </Card>
        <Details>
          <Kv k="Phrase">BIP-39 · 12 words · 128 bits of entropy generated on this phone</Kv>
          <Kv k="Key">phrase → {d.algo.tech} key · the derivation path selects the key type (BIP-32 · SLIP-0010)</Kv>
        </Details>
      </Sheet>
    );
  }
  if (step === 4) {
    const right = (c) => picks[c.n] === KEY_PHRASE[c.n - 1];
    const wrong = KEY_PHRASE_CHECKS.find(c => picks[c.n] && !right(c));
    const allRight = KEY_PHRASE_CHECKS.every(right);
    return (
      <Sheet title="Check your phrase" onClose={close} footer={<><Btn kind="p" icon="arrowR" id="btn-key-checked" disabled={!allRight} onClick={() => setStep(5)}>Continue</Btn><Btn kind="t" onClick={() => setStep(3)} style={{ height: 36 }}>Back</Btn></>}>
        <p className="sm mut">Pick the right word for each spot, from what you wrote down.</p>
        {KEY_PHRASE_CHECKS.map(c => (
          <Card key={c.n}>
            <CardHead label={`Word ${c.n}`} right={right(c) ? <Chip tone="g" icon="check">Correct</Chip> : null} />
            <div className="segk" style={{ margin: '0 16px 16px' }}>
              {c.options.map(w => <button type="button" key={w} id={`kpick-${c.n}-${w}`} className={picks[c.n] === w ? 'on' : ''} onClick={() => setPicks(p => ({ ...p, [c.n]: w }))}>{w}</button>)}
            </div>
          </Card>
        ))}
        {wrong && <Note icon="ban" tone="a">That’s not word {wrong.n}. Check what you wrote down.</Note>}
        {allRight && <Note icon="check" tone="g">Your phrase matches.</Note>}
      </Sheet>
    );
  }
  const techOf = (id) => { const k = keys.find(x => x.id === id) || {}; return `${k.short} (${(k.tech || '').split(' · ')[0]})`; };
  if (step === 5) {
    // Review: the key in one sentence and a summary of the choices, then what the transaction does, then confirm.
    return (
      <Sheet title="Review" onClose={close} footer={<ApproveFooter label="Confirm with Face ID" reject="Back" onApprove={approve} onReject={() => setStep(newPhrase ? 4 : 2)} />}>
        <Sentence small>Add <V icon={d.icon}>{keyName}</V> to your account{prov && <>, protected by <V tone="c" icon="shield">{prov.name}</V></>}{lim && <>, up to <V tone="g" icon="coins">{fmtLimitShort(lim)}</V></>}.</Sentence>
        <KeelRule what="Add key" fields={[
          ['Key', keyName],
          ['Type', (isSet ? `Multisig · ${need} of ${members.length} must approve` : quantum ? 'Made by Keel' : phone ? 'Face ID · passkey' : d.t.name) + (type === 'seed' ? (newPhrase ? ' · a new phrase' : ' · from your seed phrase') : '') + (pq ? ' · quantum-safe' : '')],
          ...(isSet ? [['Members', members.map(id => (keys.find(k => k.id === id) || {}).name || id).join(', ')]] : []),
          ...(prov ? [['Protected by', prov.name]] : []),
          ['Can', FLAG_ORDER.filter(f => flags.includes(f)).map(f => FLAGS[f].toLowerCase()).join(', ') || 'nothing'],
          ...(lim ? [['Spend limit', fmtLimit(lim) + ` · ${oracleOf(lim).name} prices`]] : []),
          ['Expires', expiryLabel || 'Never'],
          ['Networks', chains.length === ALL_CHAIN_IDS.length ? 'All 4' : chains.map(chainName).join(', ') || 'none'],
        ]} keys={prov ? `+ ${keyName} · protected by ${prov.name}` : `+ ${keyName}`} />
        <Details>
          <Kv k="Key type">{isSet ? `Threshold authenticator (canonical) · ${need + (prov ? 1 : 0)} of ${members.length + (prov ? 1 : 0)} · returns the set’s actor id` : prov ? `Threshold authenticator (canonical) · 2 of 2 · returns the set’s actor id` : d.tech}</Kv>
          {(isSet || prov) && <Kv k="Members">{(isSet ? members.map(techOf) : [`${keyName} (${d.tech.split(' · ')[0]})`]).join(' + ')}{prov ? ` + ${prov.name} (${prov.tech})` : ''}</Kv>}
          {prov && !isSet && <Kv k="Also">{keyName} is registered as a member only · not an actor on its own · the set with {prov.name} is what acts</Kv>}
          <Kv k="Flags">{flags.join(', ') || 'none'}{expiryLabel ? ` · expires ${expiryLabel}` : ''}</Kv>
          {lim && <Kv k="Spend limit">POLICY scope · gated to Keel’s spend-limit policy · {fmtLimit(lim)} across ETH and every token · {oracleOf(lim).tech} · commitment keccak256(limits)</Kv>}
          <Kv k="Message">ERC-7964 typed data listing {chains.length} chain entr{chains.length === 1 ? 'y' : 'ies'} · ERC-7730 display · Keystore.addKey</Kv>
        </Details>
      </Sheet>
    );
  }
  return (
    <Sheet title={isSet ? 'Add a multisig' : 'Add a device or key'} onClose={close} footer={<><Btn kind="p" icon="arrowR" id="btn-key-continue" onClick={() => setStep(newPhrase ? 3 : 5)}>Continue</Btn><Btn kind="t" onClick={() => setStep(1)} style={{ height: 36 }}>Back</Btn></>}>
      <p className="sm mut">Name it and choose what protects it. You review everything before you confirm.</p>
      <Card>
        <CardHead label="Name" />
        <div style={{ padding: '0 16px 12px' }}>
          <input className="inp" id="key-name" value={name ?? (isSet ? setLabel : d.name)} maxLength={32} spellCheck={false} aria-label="Key name" onChange={e => setName(e.target.value)} />
        </div>
      </Card>
      {isSet && (
        <Card>
          <CardHead label="Members" right={<Chip tone="n">{members.length} picked</Chip>} />
          {candidates.map(k => {
            const on = members.includes(k.id);
            return <Row key={k.id} id={'member-' + k.id} icon={k.icon} iconTone={on ? 'g' : ''} title={k.name} sub={k.type} right={<Icon name={on ? 'check' : 'plus'} size={20} className={on ? 'ok' : 'dim'} />} onClick={() => toggleMember(k.id)} />;
          })}
          <CardFoot icon="key">Any of your keys can be a member. Each signs in turn.</CardFoot>
        </Card>
      )}
      {isSet && (
        <Card>
          <CardHead label="How many must approve" />
          <div className="segk" style={{ margin: '0 16px 12px' }}>
            {members.map((_, i) => <button type="button" key={i} id={'threshold-' + (i + 1)} className={need === i + 1 ? 'on' : ''} onClick={() => setThreshold(i + 1)}>{i + 1} of {members.length}</button>)}
          </div>
        </Card>
      )}
      {quantum && (
        <Card>
          <CardHead label="Signs with" right={<Chip tone="g">quantum-safe</Chip>} />
          <Row icon="shield" iconTone="g" title="SPHINCS+" sub="Built only on hash functions" right={<Icon name="check" size={20} className="ok" />} />
          <div id="pq-note" style={{ padding: '0 16px 12px' }}><Note icon="clock" tone="a">Not live yet. No quantum-safe check fits in a transaction’s gas today, so this key can’t sign yet. Your account takes it now and it works as soon as one does.</Note></div>
        </Card>
      )}
      {pickAlgo && (
        <Card>
          <CardHead label="Signs with" right={pq ? <Chip tone="g">quantum-safe</Chip> : null} />
          <div className="segk" style={{ margin: '0 16px 12px' }}>
            {ALGOS.map(a => <button type="button" key={a.id} id={'algo-' + a.id} className={algo === a.id ? 'on' : ''} onClick={() => setAlgo(a.id)}>{a.name}</button>)}
          </div>
          {type === 'hardware' && <CardFoot icon="device">Anchor generates the key and keeps it. Its own seed phrase backs it up.</CardFoot>}
          {type === 'seed' && <CardFoot icon="book">{pq ? 'The phrase produces a SPHINCS+ key alongside its usual one.' : 'The phrase produces a secp256k1 key, like any other EVM key.'}</CardFoot>}
        </Card>
      )}
      {type === 'seed' && (
        <Card>
          <CardHead label="Key comes from" />
          {KEY_SOURCES.map(k => <Row key={k.id} id={'source-' + k.id} icon={k.icon} iconTone={source === k.id ? 'g' : ''} title={k.name} sub={k.sub} right={<Icon name={source === k.id ? 'check' : 'chevR'} size={20} className={source === k.id ? 'ok' : 'dim'} />} onClick={() => setSource(k.id)} />)}
          <CardFoot icon={newPhrase ? 'eye' : 'lock'}>{newPhrase ? 'You write down 12 new words before you confirm.' : 'Derived from the phrase you already wrote down. No new backup.'}</CardFoot>
        </Card>
      )}
      <Card>
        <CardHead label="Protection" right={prov ? <Chip tone="g" icon="shield">verifies every transaction</Chip> : null} />
        <button type="button" id="flag-protect" role="switch" aria-checked={protect} className="cl act tg" onClick={() => setProtect(v => !v)}>
          <span className="grow">Protected by a co-signer</span>
          <Switch on={protect} />
        </button>
        {protect && PROVIDERS.map(pv => {
          const on = provider === pv.id;
          return <Row key={pv.id} id={'provider-' + pv.id} lead={<span className={'icn' + (on ? ' g' : '')}><ProviderMark id={pv.id} size={22} /></span>} title={pv.name} sub={pv.sub} right={<Icon name={on ? 'check' : 'chevR'} size={20} className={on ? 'ok' : 'dim'} />} onClick={() => setProvider(pv.id)} />;
        })}
        <CardFoot icon={prov ? 'shield' : 'key'}>{prov ? `${prov.name} checks every transaction ${keyName} signs, then adds its signature, or it doesn’t count. It can only say no.` : 'Off: this key acts on its own.'}</CardFoot>
      </Card>
      <Card>
        <CardHead label="Spend limit" right={isAdmin ? <Chip tone="a">full access can’t be limited</Chip> : lim ? <span className="who" style={{ fontSize: 12 }}><ProviderMark id={oracle} size={16} />{oracleOf(lim).name} prices</span> : null} />
        <button type="button" id="flag-limit" role="switch" aria-checked={!!lim} disabled={isAdmin} className="cl act tg" onClick={() => setLimitOn(v => !v)}>
          <span className="grow">Limit what it can spend</span>
          <Switch on={!!lim} />
        </button>
        {limitOn && !isAdmin && LIMIT_PERIODS.map(([id, label]) => (
          <div key={id} className="cl tg">
            <span className="grow">{label}</span>
            <span className="usdin"><i>$</i><input className="inp" id={'limit-' + id} inputMode="numeric" value={limit[id] ? limit[id].toLocaleString('en-US') : ''} placeholder="no cap" aria-label={label} onChange={e => setCap(id, e.target.value)} /></span>
          </div>
        ))}
        {limitOn && !isAdmin && (
          <div id="oracle-pick">
            <div className="cl tg"><span className="grow sm mut">Prices from</span></div>
            {ORACLES.map(o => { const on = oracle === o.id; return <Row key={o.id} id={'oracle-' + o.id} lead={<span className={'icn' + (on ? ' g' : '')}><ProviderMark id={o.id} size={22} /></span>} title={o.name} sub={ORACLE_SUB[o.id]} right={<Icon name={on ? 'check' : 'chevR'} size={20} className={on ? 'ok' : 'dim'} />} onClick={() => setOracle(o.id)} />; })}
          </div>
        )}
        {lim ? <div className="cardfoot"><ProviderMark id={oracle} size={16} /><span>Counts ETH and every token at its dollar value, priced by {oracleOf(lim).name}. Over a cap, the limit contract rejects the transaction.</span></div>
          : <CardFoot icon="coins">{isAdmin ? 'A key with full access can’t be capped. Take full access away to set a limit.' : 'Off: this key can move anything its permissions allow.'}</CardFoot>}
      </Card>
      <Advanced open={!!(sh.expiryPreset || sh.flags)} summary={[FLAG_ORDER.filter(f => flags.includes(f)).map(f => FLAG_SHORT[f].toLowerCase()).join(', ') || 'no permissions', expiryLabel ? `expires ${expiryLabel}` : 'never expires', chains.length === ALL_CHAIN_IDS.length ? 'all networks' : `${chains.length} network${chains.length === 1 ? '' : 's'}`].join(' · ')}>
        <Card>
          <CardHead label="It can" />
          {FLAG_ORDER.map(f => (
            <button type="button" key={f} id={'flag-' + f} role="switch" aria-checked={flags.includes(f)} className="cl act tg" onClick={() => toggleFlag(f)}>
              <span className="grow">{FLAGS[f]}</span>
              <Switch on={flags.includes(f)} />
            </button>
          ))}
          <div style={{ height: 6 }} />
        </Card>
        <Card>
          <CardHead label="Expires" right={isAdmin ? <Chip tone="a">full access never expires</Chip> : null} />
          <div className="segk" style={{ margin: '0 16px 12px' }}>
            {[['never', 'Never'], ['30d', '30 days'], ['1y', '1 year']].map(([id, label]) => <button type="button" key={id} id={'expiry-' + id} className={expiry === id ? 'on' : ''} disabled={isAdmin && id !== 'never'} onClick={() => setExpiry(id)}>{label}</button>)}
          </div>
        </Card>
        <Card>
          <CardHead label="Works on" right={<Chip tone="n">one approval</Chip>} />
          {CHAINS.map(c => (
            <button type="button" key={c.id} className="chainrow act" onClick={() => toggleChain(c.id)}>
              <ChainDot id={c.id} size={18} />{c.name}<Icon name={chains.includes(c.id) ? 'check' : 'ban'} size={18} className={chains.includes(c.id) ? 'ok' : 'no'} />
            </button>
          ))}
          <CardFoot icon="link">One approval covers every network you pick. Each network only applies its own part.</CardFoot>
        </Card>
      </Advanced>
    </Sheet>
  );
}

export function KeyDetailSheet() {
  const { state, dispatch } = useStore();
  const key = (state.keys[state.accountId] || []).find(k => k.id === state.sheet.keyId);
  const close = () => dispatch({ type: 'sheet', sheet: null });
  if (!key) return <Sheet title="Key" onClose={close}><p className="mut">This key was removed.</p></Sheet>;
  const has = (f) => key.flags.includes(f);
  const keys = state.keys[state.accountId] || [];
  const prov = key.set && key.set.provider ? providerById(key.set.provider) : null;
  const memberKeys = key.set ? key.set.members.map(id => keys.find(k => k.id === id)).filter(Boolean) : [];
  const inSets = setsOf(keys, key.id);
  const override = !key.set && key.local && key.standalone !== false && keys.some(k => k.set && k.set.provider);
  return (
    <Sheet title={key.name} tag={prov ? `Protected by ${prov.name}` : undefined} onClose={close} footer={<><Btn kind="s" icon={prov ? 'unlock' : 'ban'} id="btn-key-remove" onClick={() => dispatch({ type: 'sheet', sheet: { kind: 'revokeKey', keyId: key.id } })}>{prov ? 'Turn protection off' : 'Remove'}</Btn><Btn kind="t" id="btn-key-close" onClick={close} style={{ height: 36 }}>Close</Btn></>}>
      <p className="sm mut">{key.type} · added {key.added}</p>
      {prov && (
        <Card>
          <CardHead label="Protection" right={<span className="who"><ProviderMark id={prov.id} size={18} />{prov.name}<Chip tone="g" icon="check">Active</Chip></span>} />
          <Cl icon="shield">{prov.name} verifies every transaction before it counts, then adds its signature</Cl>
          {VERIFY_CHECKS.map(c => <Cl key={c}>{c}</Cl>)}
          <Cl ok={false}>Can’t send anything or change your keys · it can only say no</Cl>
          <CardFoot icon="device">If {prov.name} is offline or says no, sign with your Anchor instead. It doesn’t need {prov.name}.</CardFoot>
        </Card>
      )}
      {key.set && (!prov || memberKeys.length > 1) && (
        <Card>
          <CardHead label={`${key.set.threshold} of ${memberKeys.length + (prov ? 1 : 0)} must sign`} right={<Chip tone="l" icon="set">together</Chip>} />
          {memberKeys.map((m, i) => <Row key={m.id} icon={m.icon} iconTone="b" title={m.name} sub={i === 0 ? 'Signs first' : 'Signs next'} right={<Icon name="check" size={18} className="ok" />} />)}
          {prov && <Row icon="shield" iconTone="l" title={prov.name} sub="Checks it, then signs · can only say no" right={<Icon name="check" size={18} className="ok" />} />}
          <CardFoot icon="shield">{prov ? `Without ${prov.name}’s signature nothing this key signs counts.` : 'Without every signature nothing this key signs counts.'}</CardFoot>
        </Card>
      )}
      {key.recovery ? (
        <Card><CardHead label="Recovery only" right={<Chip tone="a">48-hour wait</Chip>} /><Cl>Can start a recovery that completes after 48 hours</Cl><Cl ok={false}>Can’t send money</Cl><Cl ok={false}>Can’t change devices or access directly</Cl><CardFoot icon="info">Any of your devices can cancel a recovery during the wait.</CardFoot></Card>
      ) : key.manager ? (
        <Card><CardHead label="App access" /><Cl>Can only use {key.manager}</Cl><Cl>{key.policy}</Cl><Cl ok={false}>Can’t use anything else or change access</Cl><CardFoot icon="shield">The limits are enforced by the network, not by the app.</CardFoot></Card>
      ) : (
        <Card>
          <CardHead label="It can" />
          {FLAG_ORDER.map(f => <Cl key={f} ok={has(f)}>{FLAGS[f]}</Cl>)}
          <div style={{ height: 8 }} />
        </Card>
      )}
      {key.limit && (
        <Card>
          <CardHead label="Spend limit" right={<span className="who" style={{ fontSize: 12 }}><ProviderMark id={oracleOf(key.limit).id} size={16} />{oracleOf(key.limit).name} prices</span>} />
          {LIMIT_PERIODS.filter(([id]) => key.limit[id] > 0).map(([id, , word]) => <Cl key={id} icon="coins">Up to {fmtCap(key.limit[id])} {word}</Cl>)}
          <Cl>ETH and every token count, at their dollar value</Cl>
          <Cl ok={false}>Can’t go over a cap · the network refuses the transaction, not the app</Cl>
          <CardFoot icon="info">Prices come from {oracleOf(key.limit).name}. If a price is missing, that token can’t be spent until it is back.</CardFoot>
        </Card>
      )}
      <Card>
        <Kv k="Expires">{key.expiry || (has('admin') ? 'Never · full access can’t expire' : 'Never · remove it any time')}</Kv>
        <Kv k="Works on"><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><ChainStack ids={key.chains} size={16} />{key.chains.length === 4 ? 'All 4 networks' : key.chains.map(chainName).join(', ')}</span></Kv>
      </Card>
      {key.hardware && <Note icon="device">Before you approve, Anchor shows what the approval guarantees on its own screen. If the guarantee can’t be met, the transaction fails and nothing moves.</Note>}
      {key.gasOnly && <Note icon="bolt">This key only pays network fees, for this account and for your Trading account. It can’t move money or change anything.</Note>}
      {key.otherSeed && <Note icon="book">Added from a different seed phrase. Keel found it on the network when you set up this phone.</Note>}
      {key.delegation && <Note icon="wallet">Anyone who can use {key.name} can use this account, within the limits above.</Note>}
      {key.pq && <Note icon="shield" tone="g">Quantum-safe key. {{ own: 'Your seed phrase backs it up.', new: 'Its own phrase backs it up, the 12 words you wrote down when you added it.', hardware: 'Anchor keeps it and its own seed phrase backs it up.', wallet: 'Keel made it and backs it up with your account. It can’t sign until quantum-safe checks fit in a transaction’s gas.' }[key.backup] || ''} Your address and everything else stay the same.</Note>}
      {prov && memberKeys.length === 1 && <Note icon="link">Your {memberKeys[0] ? memberKeys[0].short : 'key'} signs only together with {prov.name}. Turning protection off lets it act on its own again.</Note>}
      {key.set && !prov && <Note icon="set">Each member approves in turn. Removing this key doesn’t touch the members.</Note>}
      {key.standalone === false && <Note icon="link">Only acts together with {withWord(keys, key)} ({inSets.map(x => x.name).join(', ')}). Remove that key to let {key.short} act on its own again.</Note>}
      {override && <Note icon="key">Override key: acts on its own, without Safenet, and can remove or change the protected keys. Keep it somewhere safe.</Note>}
      <Details>
        <Kv k="Type">{key.tech || key.type}</Kv>
        {key.set && <Kv k="Authenticator">threshold (canonical) · verifies each member through its own authenticator · returns this set’s actor id{prov && prov.id === 'safenet' ? ' · Safenet member: FROST group key read from the Safenet oracle, epoch 41 · rotates each epoch, entry unchanged' : ''}</Kv>}
        {key.standalone === false && <Kv k="Registered">as a member only · not an actor on its own (Keystore.removeKey applied when the set was added)</Kv>}
        {key.backup && <Kv k="Backup">{{ own: 'seed phrase A · same seed, its own derivation path', new: 'seed phrase B · new seed', hardware: 'Anchor secure element · device phrase' }[key.backup]}</Kv>}
        <Kv k="Flags">{key.flags.join(', ')}</Kv>
        {key.limit && <Kv k="Spend limit">POLICY scope · gated to Keel’s spend-limit policy · {fmtLimit(key.limit)} · {oracleOf(key.limit).tech}</Kv>}
        <Kv k="Event">KeyAdded(#{key.id.replace(/\D/g, '') || '?'}) · same on every chain</Kv>
      </Details>
    </Sheet>
  );
}

export function RevokeKeySheet() {
  const { state, dispatch } = useStore();
  const key = (state.keys[state.accountId] || []).find(k => k.id === state.sheet.keyId);
  const close = () => dispatch({ type: 'sheet', sheet: null });
  if (!key) return null;
  const keys = state.keys[state.accountId] || [];
  const prov = protectorOf(key);
  const freed = prov ? keys.find(k => k.id === key.set.members[0]) : null;
  if (prov) return (
    <Sheet title="Turn protection off" onClose={close} footer={<ApproveFooter label="Turn off with Face ID" reject="Keep it on" onApprove={() => dispatch({ type: 'sign' })} onReject={close} />}>
      <Sentence small>Turn off <V tone="c" icon="shield">{prov.name}</V> protection for <V icon={key.icon}>{key.name}</V>.</Sentence>
      <Card><Cl ok={false}>{prov.name} no longer verifies what {key.short} signs</Cl><Cl>{key.short} acts on its own again</Cl><Cl>Your money doesn’t move</Cl><div style={{ height: 8 }} /></Card>
      <Note icon="key">This is a change to your keys, so it needs {prov.name}’s OK or a key that acts on its own, like your Anchor.</Note>
      <KeelRule what="Turn protection off" fields={[['Key', key.name], ['Co-signer', prov.name]]} keys={`${key.short} acts on its own`} />
    </Sheet>
  );
  return (
    <Sheet title="Remove" onClose={close} footer={<ApproveFooter label="Remove with Face ID" reject="Keep it" onApprove={() => dispatch({ type: 'sign' })} onReject={close} />}>
      <Sentence small>Remove <V icon={key.icon}>{key.name}</V> from your account.</Sentence>
      <Card><Cl>It stops working right away, on every network</Cl>{freed && freed.standalone === false && <Cl>{freed.short} acts on its own again</Cl>}<Cl>All your other devices keep working</Cl><Cl>Your money doesn’t move</Cl><div style={{ height: 8 }} /></Card>
      <KeelRule what="Remove key" fields={[['Key', key.name]]} keys={`− ${key.name}`} />
    </Sheet>
  );
}

export function LockSheet() {
  const { state, dispatch } = useStore();
  const unlocking = state.sheet.kind === 'unlock';
  const [days, setDays] = useState('30');
  const close = () => dispatch({ type: 'sheet', sheet: null });
  return (
    <Sheet title={unlocking ? 'Lift the freeze' : 'Freeze changes'} onClose={close} footer={<ApproveFooter label={unlocking ? 'Lift with Face ID' : 'Freeze with Face ID'} reject="Cancel" onApprove={() => dispatch({ type: 'sign', sheet: { ...state.sheet, days } })} onReject={close} />}>
      {unlocking ? <Sentence small>Allow changes to devices & access again.</Sentence> : <Sentence small>Freeze devices & access for <V>{days} days</V>.</Sentence>}
      {!unlocking && <div className="segk">{['7', '30', '90'].map(d => <button type="button" key={d} id={'lock-' + d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{d} days</button>)}</div>}
      <Card>
        <Cl icon="lock">No device, key or app can be added, removed or changed until then, not even with your Face ID</Cl>
        <Cl icon="send">Sending, receiving and the apps you already allowed keep working</Cl>
        <Cl icon="bolt">Because nothing can change, apps that pay your fees can trust your account for a lot of activity</Cl>
        <div style={{ height: 8 }} />
      </Card>
      <KeelRule what={unlocking ? 'Lift the freeze' : 'Freeze devices & access'} fields={unlocking ? [] : [['For', `${days} days`]]} keys={unlocking ? 'changeable again' : `frozen for ${days} days`} />
      <Details><Kv k="Standard">Account lock (EIP-8130): key list frozen for a set period; the network treats the account as safe for high-volume sending and sponsoring</Kv></Details>
    </Sheet>
  );
}

export function CancelPendingSheet() {
  const { state, dispatch } = useStore();
  const close = () => dispatch({ type: 'sheet', sheet: null });
  const done = state.pendingCancelled;
  return (
    <Sheet title="Unfinished changes" onClose={close} footer={done ? <Btn kind="s" onClick={close}>Close</Btn> : <ApproveFooter label="Cancel them with Face ID" reject="Keep them" onApprove={() => dispatch({ type: 'sign' })} onReject={close} />}>
      <p className="sm mut">Changes you approved earlier that haven’t taken effect yet. Cancelling them doesn’t touch anything that is already active.</p>
      <Card>
        {done ? <Row icon="check" iconTone="g" title="Nothing waiting" sub="Everything you approved earlier is void" /> : (
          <>
            <Row icon="laptop" title="Add “Old laptop”" sub="Approved Aug 30 · never applied" chips={[<Chip key="a" tone="a">waiting</Chip>]} top />
            <Row icon="grid" title="Give “Beta app” access" sub="Approved Sep 1 · never applied" chips={[<Chip key="a" tone="a">waiting</Chip>]} top />
          </>
        )}
      </Card>
      {!done && <KeelRule what="Cancel unfinished changes" fields={[['Changes', 'Add “Old laptop” · Access for “Beta app”']]} keys="nothing active changes" />}
      {!done && <Details><Kv k="How">Bumps the account’s key-change nonce (EIP-8130), invalidating every signed but unapplied key change at once</Kv></Details>}
    </Sheet>
  );
}
