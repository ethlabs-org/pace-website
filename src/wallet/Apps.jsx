import { useStore } from '../state.jsx';
import { Btn, Card, CardHead, Cl, Sheet, ApproveFooter, Sentence, V, Kv, Details, KeelRule, Note, PermRows, PermRule } from '../ui.jsx';
import { permText, permType, actorIdOf, POLICY_MANAGER } from '../data.js';

// The app list itself lives on the Keys screen ("App-controlled keys" tab, Keys.jsx); these are its sheets.

// What one app holds: every permission with what is left of it, each removable on its own, then the whole grant.
export function SessionDetailSheet() {
  const { state, dispatch } = useStore();
  const s = state.sessions.find(x => x.id === state.sheet.sessionId);
  const close = () => dispatch({ type: 'sheet', sheet: null });
  if (!s) return null;
  const act = (sheet) => state.locked ? dispatch({ type: 'toast', text: 'Frozen · lift the freeze first', kind: 'warn' }) : dispatch({ type: 'sheet', sheet });
  const call = s.perms.find(p => p.kind === 'call');
  const n = s.perms.length;
  return (
    <Sheet title={s.name} tag={`${n} permission${n === 1 ? '' : 's'}`} onClose={close} footer={<><Btn kind="s" icon="ban" id="btn-session-remove-all" onClick={() => act({ kind: 'revokeSession', sessionId: s.id })}>Remove all access</Btn><Btn kind="t" onClick={close} style={{ height: 36 }}>Close</Btn></>}>
      <p className="sm mut">{s.what} · until {s.expiry}</p>
      <Card>
        <CardHead label={`${s.app} can`} />
        <PermRows perms={s.perms} usage app={s.app} onRemove={(p) => act({ kind: 'revokeSession', sessionId: s.id, permId: p.id })} />
        {s.rule && <PermRule rule={s.rule} />}
        <div style={{ height: 6 }} />
      </Card>
      <Card><CardHead label={`${s.app} can’t`} /><Cl ok={false}>Move anything else</Cl><Cl ok={false}>{call ? 'Use any other contract' : 'Call any contract'}</Cl><Cl ok={false}>Change your devices or access</Cl><div style={{ height: 8 }} /></Card>
      <Card><Kv k="Acts as">{s.to.name} · <span className="mono">{s.to.short}</span></Kv><Kv k="Ends">{s.expiry} · or when you remove it</Kv><Kv k="Enforced by">The network, not {s.app} · you can remove it any time</Kv></Card>
      <Details>
        <Kv k="Grant">ERC-7715 request · one Keystore row per permission (EIP-8130) · redeemed through {POLICY_MANAGER.name} {POLICY_MANAGER.short} (ERC-7710)</Kv>
        {s.perms.map(p => <Kv key={p.id} k={`Slot ${p.slot}`}>{permType(p)} · {p.policy.name} · actor {actorIdOf(s.to, p.slot)} · commitment {p.commitment} · context {p.context}</Kv>)}
        {s.rule && <Kv k="Rule">{s.rule.tech}</Kv>}
        <Kv k="Removing">Keystore.revokeActor per slot · the row is deleted, every read returns zero, the manager refuses from that block</Kv>
      </Details>
    </Sheet>
  );
}

// Removing one permission (one Keystore row) or the whole grant (every row). The app may ask for this itself through
// wallet_revokeExecutionPermission; the user still confirms.
export function RevokeSessionSheet() {
  const { state, dispatch } = useStore();
  const sh = state.sheet;
  const s = state.sessions.find(x => x.id === sh.sessionId);
  const close = () => dispatch({ type: 'sheet', sheet: null });
  if (!s) return null;
  const p = sh.permId ? s.perms.find(x => x.id === sh.permId) : null;
  const t = p ? permText(p) : null;
  const n = p ? 1 : s.perms.length;
  const left = s.perms.length - 1;
  return (
    <Sheet title={p ? 'Remove a permission' : 'Remove access'} onClose={close} footer={<ApproveFooter label="Remove with Face ID" reject="Keep it" onApprove={() => dispatch({ type: 'sign' })} onReject={close} />}>
      {p
        ? <Sentence small>Take <V>{t.title}</V> away from <V tone="a">{s.app}</V>.</Sentence>
        : <Sentence small>Stop <V tone="a">{s.app}</V> from acting for you.</Sentence>}
      {sh.byApp && <Note icon="info">{s.app} asked to end its own access. Nothing changes until you confirm.</Note>}
      <Card>
        {p ? <><Cl>{s.app} loses this permission right away</Cl><Cl>{left === 0 ? 'It has no access left after this' : left === 1 ? 'Its other permission stays' : `Its other ${left} permissions stay`}</Cl></> : <><Cl>{s.app} loses access right away</Cl><Cl>Nothing else changes</Cl></>}
        <div style={{ height: 8 }} />
      </Card>
      <KeelRule what={p ? 'Remove permission' : 'Remove access'} fields={p ? [['App', s.app], ['Permission', t.title], ['Slot', String(p.slot)]] : [['App', s.app], ['Permissions', String(n)]]} keys={`− ${n} permission${n === 1 ? '' : 's'}`} />
      <Details><Kv k="Change">{p ? `Keystore.revokeActor(${actorIdOf(s.to, p.slot)})` : `Keystore.revokeActor × ${n} · one signed batch`} · local channel · the manager reads zero from that block</Kv></Details>
    </Sheet>
  );
}

export function RevokeAllSheet() {
  const { state, dispatch } = useStore();
  const close = () => dispatch({ type: 'sheet', sheet: null });
  const sessions = state.accountId === 'main' ? state.sessions : [];
  const names = [...sessions.map(s => s.app), ...(state.keys[state.accountId] || []).filter(k => k.manager).map(k => k.name)];
  const rows = sessions.reduce((n, s) => n + s.perms.length, 0) + (state.keys[state.accountId] || []).filter(k => k.manager).length;
  if (names.length === 0) return null;
  return (
    <Sheet title="Remove all app access" onClose={close} footer={<ApproveFooter label="Remove all with Face ID" reject="Keep them" onApprove={() => dispatch({ type: 'sign' })} onReject={close} />}>
      <Sentence small>Stop <V tone="a">{names.length} apps</V> from acting for you.</Sentence>
      <Card><CardHead label="Loses access" />{names.map((n, i) => <Cl key={i} icon="grid">{n}</Cl>)}<div style={{ height: 8 }} /></Card>
      <Card><Cl>They all stop working right away, on every network</Cl><Cl>Your devices and keys are untouched</Cl><Cl>Your money doesn’t move</Cl><div style={{ height: 8 }} /></Card>
      <KeelRule what="Remove all app access" fields={[['Apps', names.join(', ')], ['Permissions', String(rows)]]} keys={`− ${rows} permission${rows === 1 ? '' : 's'}`} />
      <Details><Kv k="How">One signed batch revokes every app row at once (EIP-8130) · same entry list on every chain</Kv></Details>
    </Sheet>
  );
}
