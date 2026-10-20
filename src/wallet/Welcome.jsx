import { useEffect, useState } from 'react';
import { useStore } from '../state.jsx';
import { SETUP_METHODS, SETUP_PHRASE, SETUP_CHECKS, ACCOUNTS, HW_ACCOUNTS, totalUsd } from '../data.js';
import { Icon } from '../icons.jsx';
import { Btn, Card, CardHead, CardFoot, Row, Cl, ChainStack, Chip, Bar, Note, Details, Kv } from '../ui.jsx';

// First-time setup. The user picks what unlocks the account (Face ID, a seed phrase or a hardware wallet),
// then finishes that path: Face ID is one tap, the phrase is shown and checked, the hardware wallet confirms on its own screen.
const back = (dispatch, welcomeFlow) => () => dispatch({ type: 'set', patch: { welcomeFlow } });

function Options() {
  const { dispatch } = useStore();
  const go = (welcomeFlow) => dispatch({ type: 'set', patch: { welcomeFlow } });
  return (
    <div className="body">
      <div className="bar"><span className="wordmark"><span className="mk"><Icon name="keel" size={16} /></span>Keel</span></div>
      <h1 className="h1">Your devices are your keys.</h1>
      <p className="lead">Create an account, keep the address you already have, or bring an account from another wallet.</p>
      <Card>
        <Row icon="plus" iconTone="g" title="Create a new account" sub="With Face ID, a seed phrase or a hardware wallet" right={<Icon name="chevR" size={20} className="dim" />} onClick={() => go('create')} id="btn-create" />
        <Row icon="key" id="btn-upgrade" title="Keep the address I already have" sub="Your current address gets everything Keel can do." right={<Icon name="chevR" size={20} className="dim" />} onClick={() => go('upgrade')} />
        <Row icon="device" id="btn-connect-hw" title="Connect a hardware wallet" sub="Bring the address on your Anchor, and keep it." right={<Icon name="chevR" size={20} className="dim" />} onClick={() => dispatch({ type: 'hwConnect' })} />
        <Row icon="layers" id="btn-import4337" title="Bring my ERC-4337 account" sub="One approval. Nothing moves." right={<Icon name="chevR" size={20} className="dim" />} onClick={() => go('import4337')} />
        <Row icon="wallet" id="btn-restore" title="Restore an account" sub="From any wallet that follows the standard." right={<Icon name="chevR" size={20} className="dim" />} onClick={() => go('restore')} />
      </Card>
    </div>
  );
}

const SETUP_NOTE = {
  passkey: <Note icon="face" tone="g">Your phone keeps the key. Face ID unlocks it. You can add a seed phrase or a hardware wallet later.</Note>,
  phrase: <Note icon="book" tone="a">Keel shows you 12 words once. Anyone who has them can take over the account, so write them down and keep them offline.</Note>,
  hardware: <Note icon="device">The key is made on the device and never leaves it. Every approval is shown on its own screen, so a hacked phone can’t fool it.</Note>,
};
const SETUP_CTA = { passkey: ['face', 'Set up with Face ID'], phrase: ['book', 'Create my seed phrase'], hardware: ['device', 'Connect a hardware wallet'] };

function Create() {
  const { state, dispatch } = useStore();
  const sel = state.setupMethod;
  const method = SETUP_METHODS.find(m => m.id === sel) || SETUP_METHODS[0];
  const [ctaIcon, ctaLabel] = SETUP_CTA[method.id];
  const next = () => {
    if (method.id === 'passkey') dispatch({ type: 'faceId', sheet: { kind: 'create', method: 'passkey', hidden: true } });
    else dispatch({ type: 'set', patch: { welcomeFlow: method.id } });
  };
  return (
    <>
      <div className="body">
        <Bar title="Set up your account" onBack={back(dispatch, null)} />
        <p className="lead">Choose what unlocks your account. You can add the others any time.</p>
        <Card>
          <CardHead label="Unlock with" />
          {SETUP_METHODS.map(m => (
            <Row key={m.id} icon={m.icon} iconTone={sel === m.id ? 'g' : ''} title={m.name} sub={m.sub} right={<Icon name={sel === m.id ? 'check' : 'chevR'} size={20} className={sel === m.id ? 'ok' : 'dim'} />} onClick={() => dispatch({ type: 'set', patch: { setupMethod: m.id } })} id={'setup-' + m.id} />
          ))}
        </Card>
        {SETUP_NOTE[method.id]}
        <Card>
          <CardHead label="Your address" right={<Chip tone="g" icon="globe">Reserved on 4 networks</Chip>} />
          <div style={{ padding: '0 16px 12px' }}><div className="mono" style={{ fontSize: 15, lineHeight: '22px', letterSpacing: '0.02em' }}>0x8C4e 7A0d 3B9f 2c61 E58a<br />D07c 4b1F 9e3A 62d0 F21E</div></div>
          <CardFoot icon={null}><span className="cds" style={{ marginRight: 8, verticalAlign: 'middle' }}><ChainStack size={16} /></span>You can receive money right away. Nothing goes on the network until your first payment.</CardFoot>
        </Card>
        <Details>
          <Kv k="First key">{method.tech}</Kv>
          <Kv k="Address">Computed from the first key by the Keystore, the same deployer on every chain (EIP-8130). Counterfactual until the first transaction deploys it (EIP-8141).</Kv>
          {method.id === 'phrase' && <Kv k="Later">Once a passkey is added, the phrase key can be demoted to recovery-only (EIP-8130): it then works only through the 48-hour recovery.</Kv>}
        </Details>
      </div>
      <div className="foot">
        <Btn kind="p" icon={ctaIcon} id="btn-setup-next" onClick={next}>{ctaLabel}</Btn>
      </div>
    </>
  );
}

function Phrase() {
  const { dispatch } = useStore();
  const [shown, setShown] = useState(false);
  return (
    <>
      <div className="body">
        <Bar title="Your seed phrase" onBack={back(dispatch, 'create')} />
        <p className="lead">These 12 words unlock your account. Write them down in order and keep them somewhere safe.</p>
        <Card>
          <CardHead label="12 words" right={<Chip tone="a" icon="eye">Shown once</Chip>} />
          <div className="wordbox">
            <div className={'words' + (shown ? '' : ' hid')} aria-hidden={!shown}>
              {SETUP_PHRASE.map((w, i) => <span key={w}><i>{i + 1}</i>{w}</span>)}
            </div>
            {!shown && <div className="reveal"><button type="button" id="btn-reveal" onClick={() => setShown(true)}><Icon name="eye" size={16} />Tap to reveal</button></div>}
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
          <Kv k="Key">phrase → master key → address 0x8C4e…F21E · the derivation path selects the key type (BIP-32 · SLIP-0010)</Kv>
        </Details>
      </div>
      <div className="foot">
        <Btn kind="p" icon="check" id="btn-wrote" disabled={!shown} onClick={() => dispatch({ type: 'set', patch: { welcomeFlow: 'phraseCheck' } })}>I wrote them down</Btn>
      </div>
    </>
  );
}

function PhraseCheck() {
  const { dispatch } = useStore();
  const [picks, setPicks] = useState({});
  const right = (c) => picks[c.n] === SETUP_PHRASE[c.n - 1];
  const wrong = SETUP_CHECKS.find(c => picks[c.n] && !right(c));
  const allRight = SETUP_CHECKS.every(right);
  const finish = () => { dispatch({ type: 'sheet', sheet: { kind: 'create', method: 'phrase', hidden: true } }); dispatch({ type: 'approve' }); };
  return (
    <>
      <div className="body">
        <Bar title="Check your phrase" onBack={back(dispatch, 'phrase')} />
        <p className="lead">Pick the right word for each spot, from what you wrote down.</p>
        {SETUP_CHECKS.map(c => (
          <Card key={c.n}>
            <CardHead label={`Word ${c.n}`} right={right(c) ? <Chip tone="g" icon="check">Correct</Chip> : null} />
            <div className="segk" style={{ margin: '0 16px 16px' }}>
              {c.options.map(w => <button type="button" key={w} id={`pick-${c.n}-${w}`} className={picks[c.n] === w ? 'on' : ''} onClick={() => setPicks(p => ({ ...p, [c.n]: w }))}>{w}</button>)}
            </div>
          </Card>
        ))}
        {wrong && <Note icon="ban" tone="a">That’s not word {wrong.n}. Check what you wrote down.</Note>}
        {allRight && <Note icon="check" tone="g">Your phrase matches. It’s the only copy, so keep it safe.</Note>}
      </div>
      <div className="foot">
        <Btn kind="p" icon="check" id="btn-finish-phrase" disabled={!allRight} onClick={finish}>Finish</Btn>
      </div>
    </>
  );
}

function Hardware() {
  const { state, dispatch } = useStore();
  const [found, setFound] = useState(false);
  useEffect(() => { const t = setTimeout(() => setFound(true), 1200); return () => clearTimeout(t); }, []);
  const waiting = !!(state.hw && state.hw.active);
  const confirm = () => { dispatch({ type: 'set', patch: { signer: 'k2' } }); dispatch({ type: 'sign', sheet: { kind: 'create', method: 'hardware' } }); };
  return (
    <>
      <div className="body">
        <Bar title="Connect your hardware wallet" onBack={back(dispatch, 'create')} />
        <p className="lead">Plug it in or pair it. It makes the key itself and shows your new address on its own screen.</p>
        <Card>
          {found
            ? <Row icon="device" iconTone="g" title="Anchor found" sub="Connected by USB · genuine device" right={<Icon name="check" size={20} className="ok" />} />
            : <Row icon="hourglass" title="Looking for a device…" sub="USB or Bluetooth" right={<Chip tone="o">searching</Chip>} />}
          <Row icon="eye" iconTone={found ? 'b' : ''} title="Confirm on Anchor" sub="Check the address on the device matches the one below, then approve there" right={waiting ? <Chip tone="a">on the device</Chip> : null} />
        </Card>
        <Card>
          <CardHead label="Your address" right={<Chip tone="g" icon="globe">Reserved on 4 networks</Chip>} />
          <div style={{ padding: '0 16px 12px' }}><div className="mono" style={{ fontSize: 15, lineHeight: '22px', letterSpacing: '0.02em' }}>0x8C4e 7A0d 3B9f 2c61 E58a<br />D07c 4b1F 9e3A 62d0 F21E</div></div>
        </Card>
        <Note icon="device">The key never leaves the device. Keel only learns the address. Add Face ID later for everyday payments and keep Anchor for the big ones.</Note>
        <Details>
          <Kv k="Key">P-256 in the secure element · attested as genuine before Keel trusts it</Kv>
          <Kv k="Approval">The device renders the account creation from the bytes it signs (EIP-7906): the address, the key and its flags, the networks</Kv>
        </Details>
      </div>
      <div className="foot">
        <Btn kind="p" icon="device" id="btn-confirm-hw" disabled={!found || waiting} onClick={confirm}>{waiting ? 'Waiting for Anchor…' : 'Confirm on Anchor'}</Btn>
      </div>
    </>
  );
}

// An EOA upgrades in place: the address shown is the one the rest of the mockup uses, so the home screen after the
// approval shows the same address and the same balance.
const spaced = (a) => a.slice(2).match(/.{4}/g);
function Upgrade() {
  const { state, dispatch } = useStore();
  const g = spaced(ACCOUNTS.main.address);
  return (
    <>
      <div className="body">
        <Bar title="Keep your address" onBack={() => dispatch({ type: 'set', patch: { welcomeFlow: null } })} />
        <Card>
          <CardHead label="Your current address" />
          <div style={{ padding: '0 16px 12px' }}><div className="mono" style={{ fontSize: 15 }}>0x{g[0]} {g[1]} … {g[8]} {g[9]}</div><div className="sm mut">{totalUsd(state.assets.main || [])} · 214 payments so far</div></div>
        </Card>
        <Card>
          <CardHead label="What happens" />
          <Cl>Your address, money and history stay. Nothing moves.</Cl>
          <Cl>Your seed phrase keeps working. Its key keeps full access.</Cl>
          <Cl>You can add more keys: Face ID, a hardware wallet, a backup.</Cl>
          <Cl>New keys can have spending limits and a co-signer.</Cl>
          <div style={{ height: 8 }} />
        </Card>
        <Details><Kv k="How">EIP-7702 delegation to the shared account code; the existing key becomes the first key in the Keystore</Kv></Details>
      </div>
      <div className="foot"><Btn kind="p" icon="key" id="btn-upgrade-approve" onClick={() => dispatch({ type: 'faceId', sheet: { kind: 'upgrade', hidden: true } })}>Approve with your current key</Btn></div>
    </>
  );
}

// An EOA whose key is on a hardware wallet. Keel asks the Anchor to connect, and the device shows the request until
// its Approve key is pressed (the HwWait overlay covers this screen meanwhile). Then Keel lists the accounts on the
// device with their balances, and the visitor picks one to upgrade: the Anchor signs the upgrade (EIP-7702). The key
// never leaves the device and stays the account's first key. The mockup's account is the first one; the others only
// say so.
function HwImport() {
  const { state, dispatch } = useStore();
  const waiting = !!(state.hw && state.hw.active);
  return (
    <>
      <div className="body">
        <Bar title="Connect a hardware wallet" onBack={() => dispatch({ type: 'set', patch: { welcomeFlow: null } })} />
        <Card>
          <Row icon="device" iconTone={state.hwLinked ? 'g' : ''} title="Anchor hardware wallet"
            sub={state.hwLinked ? 'Connected over USB' : waiting ? 'Waiting for you to approve on the device' : 'Not connected'}
            right={state.hwLinked ? <Icon name="check" size={20} className="ok" /> : null} />
        </Card>
        {state.hwLinked ? (
          <>
            <p className="lead">Choose the account to bring into Keel. It keeps its address and its money.</p>
            <Card>
              <CardHead label="Accounts on your Anchor" right={<Chip tone="a">EOA</Chip>} />
              {HW_ACCOUNTS.map((x, i) => (
                <Row key={x.n} id={'hw-acct-' + i} icon="wallet" iconTone={i === 0 ? 'g' : ''} title={`Account ${x.n}`} sub={<><span className="mono">{x.short}</span> · {x.used}</>}
                  right={<><b style={{ fontWeight: 650 }}>{i === 0 ? totalUsd(state.assets.main || []) : x.total}</b><Icon name="chevR" size={20} className="dim" /></>}
                  onClick={() => (i === 0 ? dispatch({ type: 'set', patch: { welcomeFlow: 'hwUpgrade' } }) : dispatch({ type: 'toast', text: 'In the mockup, Account 1 is the one to upgrade', kind: 'warn' }))} />
              ))}
            </Card>
            <Note icon="device">Keel only reads the addresses. Each key stays on the Anchor.</Note>
          </>
        ) : null}
      </div>
      {!state.hwLinked && !waiting && <div className="foot"><Btn kind="p" icon="device" id="btn-hw-retry" onClick={() => dispatch({ type: 'hwConnect' })}>Connect again</Btn></div>}
    </>
  );
}
function HwUpgrade() {
  const { state, dispatch } = useStore();
  const g = spaced(ACCOUNTS.main.address);
  return (
    <>
      <div className="body">
        <Bar title="Upgrade Account 1" onBack={() => dispatch({ type: 'set', patch: { welcomeFlow: 'hwImport' } })} />
        <Card>
          <CardHead label="Your account today" right={<Chip tone="a">EOA · one key</Chip>} />
          <div style={{ padding: '0 16px 8px' }}><div className="mono" style={{ fontSize: 15 }}>0x{g[0]} {g[1]} … {g[8]} {g[9]}</div><div className="sm mut">{totalUsd(state.assets.main || [])} · key on your Anchor</div></div>
          <Cl ok={false}>One key controls everything, and it can never change</Cl>
          <Cl ok={false}>No spending limit, no co-signer, no backup</Cl>
          <div style={{ height: 8 }} />
        </Card>
        <Card>
          <CardHead label="After one signature" />
          <Cl>Same address, money and history. Nothing moves.</Cl>
          <Cl>The key on your Anchor stays, with full access.</Cl>
          <Cl>You can add keys: a quantum-safe one, Face ID, a backup.</Cl>
          <Cl>New keys can have a co-signer and spending limits.</Cl>
          <div style={{ height: 8 }} />
        </Card>
        <Details><Kv k="How">EIP-7702 delegation to the shared account code, signed by the Anchor; its key becomes the first key in the Keystore</Kv></Details>
      </div>
      <div className="foot"><Btn kind="p" icon="device" id="btn-hw-upgrade" onClick={() => dispatch({ type: 'sign', sheet: { kind: 'upgrade', via: 'anchor' } })}>Upgrade with your Anchor</Btn></div>
    </>
  );
}

function Import4337() {
  const { dispatch } = useStore();
  return (
    <>
      <div className="body">
        <Bar title="Bring your ERC-4337 account" onBack={() => dispatch({ type: 'set', patch: { welcomeFlow: null } })} />
        <Card>
          <CardHead label="Your ERC-4337 account" />
          <div style={{ padding: '0 16px 12px' }}><div className="mono" style={{ fontSize: 15 }}>0x5E0f 21bA … c4D2 A17c</div><div className="sm mut">2 owners · in use since March 2025 on Ethereum and Base</div></div>
        </Card>
        <Card>
          <CardHead label="What happens" />
          <Cl>One approval registers it. Nothing moves.</Cl>
          <Cl>Its owners keep full access.</Cl>
          <Cl>It gets everything Keel can do: apps with limits, recovery, multi-step approvals.</Cl>
          <Cl>Your address stays the same.</Cl>
          <div style={{ height: 8 }} />
        </Card>
        <Details><Kv k="How">A deployed ERC-4337 account registers into the Keystore with a single ERC-1271 signature (EIP-8130) and gets the full feature set</Kv></Details>
      </div>
      <div className="foot"><Btn kind="p" icon="key" id="btn-import-approve" onClick={() => dispatch({ type: 'faceId', sheet: { kind: 'import4337', hidden: true } })}>Approve with an owner key</Btn></div>
    </>
  );
}

function Restore() {
  const { dispatch } = useStore();
  return (
    <>
      <div className="body">
        <Bar title="Restore an account" onBack={() => dispatch({ type: 'set', patch: { welcomeFlow: null } })} />
        <p className="lead">Use a device or key you already have. Keel finds your account on the network.</p>
        <Card>
          <Row icon="face" iconTone="g" title="Face ID checked" sub="iPhone 16 Pro" right={<Icon name="check" size={20} className="ok" />} />
          <Row icon="wallet" iconTone="g" title="Account found" sub="0x8C4e…F21E · 3 devices & keys · 1 app with access" right={<ChainStack size={16} />} />
        </Card>
        <Note icon="info">Nothing to send, nothing to pay. Your devices, limits and apps are already on the network.</Note>
      </div>
      <div className="foot"><Btn kind="p" icon="wallet" id="btn-restore-approve" onClick={() => dispatch({ type: 'faceId', sheet: { kind: 'restore', hidden: true } })}>Restore</Btn></div>
    </>
  );
}

export function Welcome() {
  const { state } = useStore();
  switch (state.welcomeFlow) {
    case 'create': return <Create />;
    case 'phrase': return <Phrase />;
    case 'phraseCheck': return <PhraseCheck />;
    case 'hardware': return <Hardware />;
    case 'upgrade': return <Upgrade />;
    case 'hwImport': return <HwImport />;
    case 'hwUpgrade': return <HwUpgrade />;
    case 'import4337': return <Import4337 />;
    case 'restore': return <Restore />;
    default: return <Options />;
  }
}
