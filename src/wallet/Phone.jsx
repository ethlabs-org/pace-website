import { useEffect, useState } from 'react';
import { useStore } from '../state.jsx';
import { Icon } from '../icons.jsx';
import { Toast, FaceId, HwWait, CosignWait } from '../ui.jsx';
import { Welcome } from './Welcome.jsx';
import { Home, AssetsScreen } from './Home.jsx';
import { KeysScreen, AddKeySheet, KeyDetailSheet, RevokeKeySheet, LockSheet, CancelPendingSheet } from './Keys.jsx';
import { SessionDetailSheet, RevokeSessionSheet, RevokeAllSheet } from './Apps.jsx';
import { History } from './History.jsx';
import { Settings } from './Settings.jsx';
import { SignInSheet, BatchSheet, SessionSheet, XChainSheet, ClaimSheet, OrderSheet } from './Sheets.jsx';
import { LanternPhone } from './Lantern.jsx';
import { SendScreen, SwapScreen, SendSheet, SwapSheet } from './Pay.jsx';
import { PrivateScreen, PSendSheet, ShieldSheet, PMoveSheet } from './Private.jsx';
import { ONE_TIME_KINDS } from '../data.js';
import { SketchFrame } from '../Sketch.jsx';

// The phone fills the stage's height: the window less the tutorial's strip (--tour-h in styles.css)
// and the stage's padding (40 on top for the figure labels over the devices, 16 below; sketch.css .stage).
function calcScale() {
  const strip = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tour-h')) || 48;
  return Math.min(1, Math.max(0.45, (window.innerHeight - strip - 40 - 16) / 880));
}
function usePhoneScale() {
  const [s, setS] = useState(calcScale);
  useEffect(() => { const f = () => setS(calcScale()); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  return s;
}

export function SheetHost() {
  const { state } = useStore();
  const sh = state.sheet;
  if (!sh || sh.hidden) return null;
  switch (sh.kind) {
    case 'signin': return <SignInSheet />;
    case 'batch': return <BatchSheet />;
    case 'session': return <SessionSheet />;
    case 'xchain': return <XChainSheet />;
    case 'claim': return <ClaimSheet />;
    case 'order': return <OrderSheet />;
    case 'send': return <SendSheet />;
    case 'swap': return <SwapSheet />;
    case 'shield': return <ShieldSheet />;
    case 'psend': return <PSendSheet />;
    case 'pmove': return <PMoveSheet />;
    // keyed by its presets, so a feature route that opens the sheet differently starts it afresh
    case 'addKey': return <AddKeySheet key={[sh.preset, sh.step, sh.source, sh.name, (sh.flags || []).join(','), sh.expiryPreset, sh.limit].join('|')} />;
    case 'keyDetail': return <KeyDetailSheet />;
    case 'revokeKey': return <RevokeKeySheet />;
    case 'sessionDetail': return <SessionDetailSheet />;
    case 'revokeSession': return <RevokeSessionSheet />;
    case 'revokeAll': return <RevokeAllSheet />;
    case 'lock': case 'unlock': return <LockSheet />;
    case 'cancelPending': return <CancelPendingSheet />;
    default: return null;
  }
}

function TabBar() {
  const { state, dispatch } = useStore();
  const tabs = [['home', 'home', 'Home'], ['private', 'eyeOff', 'Private'], ['keys', 'key', 'Keys'], ['history', 'list', 'History'], ['settings', 'gear', 'Settings']];
  const on = (id) => state.screen === id || (id === 'keys' && state.screen === 'apps');
  return (
    <div className="tabs">
      {tabs.map(([id, icon, label]) => (
        <button type="button" key={id} id={'nav-' + id} className={'tab' + (on(id) ? ' on' : '')} onClick={() => dispatch({ type: 'set', patch: { screen: id, keysTab: 'mine', homePage: null, settingsPage: null, privPage: null, receiptId: null } })}>
          <Icon name={icon} size={24} /><span>{label}</span>
        </button>
      ))}
    </div>
  );
}

function KeelPhone() {
  const { state, dispatch } = useStore();
  let screen = null;
  if (!state.onboarded) screen = <Welcome />;
  else if (state.screen === 'keys' || state.screen === 'apps') screen = <KeysScreen />;   // 'apps' opens the App-controlled keys tab
  else if (state.screen === 'history') screen = <History />;
  else if (state.screen === 'settings') screen = <Settings />;
  else if (state.screen === 'private') screen = <PrivateScreen />;
  else if (state.homePage === 'assets') screen = <AssetsScreen />;
  else if (state.homePage === 'send') screen = <SendScreen key={state.screened ? 'screened' : 'new'} />;   // a refused send starts the form over, under the refusal
  else if (state.homePage === 'swap') screen = <SwapScreen />;
  else screen = <Home />;
  return (
    <div className="scr k">
      <div className="top" />
      {screen}
      {state.onboarded && <TabBar />}
      <SheetHost />
      <Toast toast={state.toast} />
      {state.faceId && <FaceId sub={state.sheet && ONE_TIME_KINDS.has(state.sheet.kind) ? (state.sheet.kind === 'pmove' ? 'Signing with this payment’s key' : 'Signing with a one-time key') : undefined} />}
      {state.hw && state.hw.active && state.sheet && !state.sheet.hidden && <HwWait connect={state.sheet.kind === 'connect'} onCancel={() => dispatch({ type: 'hwCancel' })} />}
      {state.cosign && <CosignWait cosign={state.cosign} flagged={!!(state.sheet && state.sheet.flagged)} onCancel={() => dispatch({ type: 'reject' })} />}
    </div>
  );
}

export function Phone() {
  const { state, dispatch } = useStore();
  const scale = usePhoneScale();
  useEffect(() => {
    if (!state.faceId) return undefined;
    const t = setTimeout(() => dispatch({ type: 'approve' }), 1100);
    return () => clearTimeout(t);
  }, [state.faceId, dispatch]);
  // The security service verifies (its checks tick one by one), reports a pass, and only then does the transaction go.
  // A transaction to a flagged address (`sheet.flagged`) fails its second check, and the service refuses to sign.
  useEffect(() => {
    if (!state.cosign) return undefined;
    if (state.sheet && state.sheet.flagged) {
      const t = setTimeout(() => dispatch({ type: 'cosignBlock' }), 2600);
      return () => clearTimeout(t);
    }
    const passed = state.cosign.phase === 'passed';
    const t = setTimeout(() => dispatch({ type: passed ? 'approve' : 'cosignPassed' }), passed ? 800 : 1400);
    return () => clearTimeout(t);
  }, [state.cosign, dispatch]);
  useEffect(() => {
    if (!state.toast) return undefined;
    const t = setTimeout(() => dispatch({ type: 'set', patch: { toast: null } }), 3400);
    return () => clearTimeout(t);
  }, [state.toast, dispatch]);
  return (
    <div className="phoneWrap" style={{ width: Math.round(426 * scale), height: Math.round(880 * scale) }}>
      <div className="phone" style={{ transform: `scale(${scale})` }}>
        {state.skin === 'lantern' ? <LanternPhone /> : <KeelPhone />}
      </div>
      <SketchFrame fig={2} name={state.skin === 'lantern' ? 'Lantern' : 'Keel'} note={state.skin === 'lantern' ? 'another wallet, same account' : 'a wallet'}
        radius={54 * scale} screen={{ inset: 18 * scale, radius: 38 * scale }} axis />
    </div>
  );
}
