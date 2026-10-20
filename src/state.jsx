import { createContext, useCallback, useContext, useMemo, useReducer, useRef } from 'react';
import { initialState, TX_BATCH, TX_XCHAIN, TX_CLAIM, TIDEPOOL_REQ, buildSession, buildSessionTx, buildRedeemTx, redeemCheck, permText, fmtQty, TOKENS, KEY_TYPES, describeKey, signerSteps, signerText, signerOptions, providerById, buildOwnTx, applyOps, buildPrivTx, ONE_TIME_KINDS, EOA_KEY, ANCHOR_EOA_KEY } from './data.js';

const Ctx = createContext(null);

function toast(text, kind = 'ok') { return { text, kind, id: Date.now() + Math.random() }; }

// The key the user signs with (`state.signer` is a key id; the picker in every sheet sets it).
export function signerKey(s) { const keys = s.keys.main || []; return keys.find(k => k.id === s.signer) || signerOptions(keys)[0] || null; }
function signerLabel(s) { return signerText(signerKey(s), s.keys.main || []).label; }
function signerPlain(s) { return signerText(signerKey(s), s.keys.main || []).plain; }

// Signing runs the key's factors in order (`s.sig`: the steps and where we are): Face ID shows the overlay and
// Phone.jsx's timer fires `approve`; the Anchor waits for its Approve key (`hwApprove`); a security service shows
// the checking overlay and a timer fires `approve`. The last step applies the sheet.
function startStep(s, sig) {
  const st = sig.steps[sig.at];
  const clear = { ...s, sig, faceId: false, hw: null, cosign: null };
  if (st.kind === 'hw') return { ...clear, hw: { active: true, page: 0 } };
  if (st.kind === 'provider') return { ...clear, cosign: { provider: st.provider, phase: 'checking' } };
  return { ...clear, faceId: true };
}
function next(s) {
  if (s.sig && s.sig.at + 1 < s.sig.steps.length) return startStep(s, { ...s.sig, at: s.sig.at + 1 });
  return approve(s);
}

// Sheets that sign a transaction are simulated first: the wallet runs the transaction, then derives its guarantees and
// the end rule from the result. `sim` starts when the sheet opens and `simDone` (a timer in the sheet's gate) ends it.
// A feature route that jumps straight to the Anchor skips the wait: the device is already reviewing the signed bytes.
const SIM_KINDS = new Set(['batch', 'xchain', 'send', 'swap', 'shield', 'psend', 'pmove', 'session', 'addKey', 'revokeKey', 'revokeSession', 'revokeAll', 'lock', 'unlock', 'cancelPending', 'claim']);
const simFor = (sheet, hw) => sheet && SIM_KINDS.has(sheet.kind) ? { phase: hw ? 'done' : 'running', at: Date.now() } : null;

// The requests Tidepool sends to the wallet. Rejecting or closing one tells the app "rejected"; opening a new one clears the last result.
const APP_KINDS = new Set(['signin', 'batch', 'session', 'xchain', 'claim', 'order']);
const rejected = s => s.sheet && APP_KINDS.has(s.sheet.kind) ? { kind: s.sheet.kind, phase: 'rejected' } : s.flow;
const settle = (txs, id) => txs.map(t => { if (t.id !== id) return t; const { status, ...rest } = t; return rest; });
// An included transaction whose execution an assertion reverted: it stays in the history, marked failed.
const fail = (txs, id) => txs.map(t => t.id === id ? { ...t, status: 'failed' } : t);

// Applies the effect of an approved sheet. This is UI state only: what the wallet, the app and the explorer display.
function approve(s) {
  const sh = s.sheet || {};
  const base = { ...s, sheet: null, faceId: false, hw: null, cosign: null, sig: null, sim: null };
  switch (sh.kind) {
    case 'create': {
      const how = sh.method === 'phrase' ? 'unlocked by your seed phrase' : sh.method === 'hardware' ? 'unlocked by your Anchor' : 'unlocked by Face ID';
      return { ...base, onboarded: true, welcomeFlow: null, screen: 'home', toast: toast(`Account created · ${how} · same address on 4 networks`) };
    }
    // The EOA keeps its address, money and history. Its own key is the only key so far, and no app has access yet.
    // An EOA whose key is on the Anchor (`via: 'anchor'`) keeps that key as its first, and signs with the device.
    case 'upgrade': { const k = sh.via === 'anchor' ? ANCHOR_EOA_KEY : EOA_KEY; return { ...base, onboarded: true, welcomeFlow: null, screen: 'home', signer: k.id, keys: { ...s.keys, main: [k] }, sessions: [], toast: toast('Upgraded · same address, same money') }; }
    case 'import4337': return { ...base, onboarded: true, welcomeFlow: null, screen: 'home', toast: toast('ERC-4337 account added · one approval, nothing moved') };
    case 'restore': return { ...base, onboarded: true, welcomeFlow: null, screen: 'home', toast: toast('Account restored · nothing to send') };
    // The Anchor lets Keel connect: Keel can now list the accounts on the device. Nothing was signed.
    case 'connect': return { ...base, hwLinked: true, toast: toast('Anchor connected · 3 accounts found') };
    case 'signin': return { ...base, signedIn: true, signedInKey: signerLabel(s), toast: toast('Signed in to Tidepool') };
    // Transactions: the wallet opens the receipt as pending and Tidepool shows it confirming; `confirm` settles both (App.jsx runs the timer).
    case 'batch': { const tx = { ...TX_BATCH, status: 'pending', keyUsed: signerLabel(s), keyPlain: signerPlain(s) }; return { ...base, txs: [tx, ...s.txs.filter(t => t.id !== TX_BATCH.id)], screen: 'history', receiptId: TX_BATCH.id, settingsPage: null, flow: { kind: 'batch', phase: 'confirming' } }; }
    // A permission grant: the request (possibly adjusted on the sheet) rides on the flow until the network confirms it.
    case 'session': return { ...base, flow: { kind: 'session', phase: 'confirming', req: sh.req || TIDEPOOL_REQ(), keyUsed: signerLabel(s), keyPlain: signerPlain(s) } };
    case 'xchain': { const tx = { ...TX_XCHAIN, status: 'pending', keyUsed: signerLabel(s), keyPlain: signerPlain(s) }; return { ...base, txs: [tx, ...s.txs.filter(t => t.id !== TX_XCHAIN.id)], screen: 'history', receiptId: TX_XCHAIN.id, settingsPage: null, flow: { kind: 'xchain', phase: 'confirming' } }; }
    case 'claim': { const tx = { ...TX_CLAIM, status: 'pending', keyUsed: signerLabel(s), keyPlain: signerPlain(s) }; return { ...base, txs: [tx, ...s.txs.filter(t => t.id !== TX_CLAIM.id)], screen: 'history', receiptId: TX_CLAIM.id, settingsPage: null, flow: { kind: 'claim', phase: 'confirming' } }; }
    // A signature: the wallet is done at once; Tidepool still places the order before it reports success.
    case 'order': return { ...base, flow: { kind: 'order', phase: 'confirming' }, toast: toast('Order signed for Ethereum and Arbitrum') };
    // The wallet's own transactions: the receipt opens as Confirming; `confirm` settles it and moves the balances.
    case 'send': case 'swap': {
      const tx = buildOwnTx(sh, s.txs.filter(t => t.own).length, signerLabel(s), signerPlain(s), s.accountId);
      return { ...base, txs: [tx, ...s.txs], screen: 'history', receiptId: tx.id, homePage: null, settingsPage: null };
    }
    // Private transactions open their receipt on the Private tab. A deposit is Main account's and signed with its key;
    // a private send and a moved payment are signed by a key that exists for that one address.
    case 'shield': case 'psend': case 'pmove': {
      const main = sh.kind === 'shield';
      const tx = buildPrivTx(sh, s.txs.filter(t => t.own).length, main ? signerLabel(s) : '', main ? signerPlain(s) : '');
      return { ...base, txs: [tx, ...s.txs], screen: 'private', receiptId: tx.id, privPage: null, homePage: null, settingsPage: null };
    }
    case 'addKey': {
      const d = describeKey(sh);
      const flags = sh.flags || ['send'];
      const list = s.keys[s.accountId] || [];
      const prov = d.prov;
      const n = Date.now();
      const key = { id: 'k' + n, name: sh.name || d.name, short: sh.name || d.name, type: d.type, sub: 'Added just now', flags, added: 'Sep 11, 2026', expiry: sh.expiry || null, icon: d.icon, chains: sh.chains || [], pq: d.pq, backup: d.source, delegation: d.t.id === 'account', hardware: d.t.id === 'hardware', tech: d.tech, limit: sh.limit || null, ...(sh.phone && d.t.id === 'passkey' ? { local: true } : {}) };
      let added = [key];
      if (d.set) {
        // A multisig: its members are existing keys. With protection on, the service is one more member and one more signature.
        const members = sh.members || [];
        const own = Math.max(1, Math.min(sh.threshold || members.length, members.length));
        const threshold = own + (prov ? 1 : 0);
        const names = members.map(id => (list.find(k => k.id === id) || {}).short || id);
        const techs = members.map(id => ((list.find(k => k.id === id) || {}).tech || '').split(' · ')[0]);
        key.set = { members, threshold, provider: prov ? prov.id : undefined };
        key.local = members.every(id => (list.find(k => k.id === id) || {}).local);
        key.sub = prov ? `${prov.name} verifies every transaction before it counts` : `${threshold} of ${members.length} · ${names.join(', ')}`;
        key.tech = `Threshold set · ${threshold} of ${members.length + (prov ? 1 : 0)} · ${techs.join(' + ')}${prov ? ` + ${prov.name} (${prov.tech})` : ''}`;
      } else if (prov) {
        // A new key with protection on: the key itself is registered as a member only, and the 2-of-2 set that pairs it
        // with the service is what acts. To the user it is one key, protected; the list shows it once.
        key.standalone = false;
        const { standalone: _m, ...plain } = key;
        added = [key, { ...plain, id: 'k' + (n + 1), sub: `${prov.name} verifies every transaction before it counts`, set: { members: [key.id], threshold: 2, provider: prov.id }, tech: `Threshold set · 2 of 2 · ${key.tech} + ${prov.name} (${prov.tech})` }];
      }
      return { ...base, keys: { ...s.keys, [s.accountId]: [...list, ...added] }, toast: toast(`${key.name} added${prov ? ` · protected by ${prov.name}` : ''} · works on ${(sh.chains || []).length} networks`) };
    }
    case 'revokeKey': {
      const all = s.keys[s.accountId] || [];
      const gone = all.find(k => k.id === sh.keyId);
      const freed = gone && gone.set && gone.set.provider ? gone.set.members[0] : null;   // the member acts alone again
      const list = all.filter(k => k.id !== sh.keyId).map(k => k.id === freed ? { ...k, standalone: true } : k);
      const signer = s.signer === sh.keyId ? (freed || (signerOptions(list)[0] || {}).id || s.signer) : s.signer;
      return { ...base, signer, keys: { ...s.keys, [s.accountId]: list }, toast: toast(freed ? 'Protection off · the phone acts on its own again' : 'Removed · it stopped working right away') };
    }
    // Removing one permission revokes its Keystore row; removing the grant revokes every row. The explorer lists them.
    case 'revokeSession': {
      const sess = s.sessions.find(x => x.id === sh.sessionId);
      if (!sess) return base;
      const gone = sh.permId ? sess.perms.filter(p => p.id === sh.permId) : sess.perms;
      const revoked = [...s.revoked, ...gone.map(p => ({ app: sess.app, to: sess.to, slot: p.slot, title: permText(p).title }))];
      const left = sh.permId ? sess.perms.filter(p => p.id !== sh.permId) : [];
      const sessions = left.length ? s.sessions.map(x => x.id === sess.id ? { ...x, perms: left } : x) : s.sessions.filter(x => x.id !== sess.id);
      const stillOn = sess.app === 'Tidepool' ? left.length > 0 : s.sessionEnabled;
      return { ...base, sessions, revoked, sessionEnabled: stillOn, toast: toast(sh.permId ? (left.length ? `Removed · ${sess.app} keeps its other ${left.length === 1 ? 'permission' : 'permissions'}` : `Removed · ${sess.app} has no access left`) : `${sess.app}’s access removed`) };
    }
    case 'revokeAll': {
      const list = (s.keys[s.accountId] || []).filter(k => !k.manager);
      const main = s.accountId === 'main';
      const revoked = main ? [...s.revoked, ...s.sessions.flatMap(x => x.perms.map(p => ({ app: x.app, to: x.to, slot: p.slot, title: permText(p).title })))] : s.revoked;
      return { ...base, keys: { ...s.keys, [s.accountId]: list }, sessions: main ? [] : s.sessions, revoked, sessionEnabled: main ? false : s.sessionEnabled, toast: toast('All app access removed · nothing else changed') };
    }
    case 'lock': return { ...base, locked: true, toast: toast('Devices & access frozen for 30 days') };
    case 'unlock': return { ...base, locked: false, toast: toast('Freeze lifted') };
    case 'cancelPending': return { ...base, pendingCancelled: true, toast: toast('Unfinished changes cancelled · nothing active was touched') };
    case 'recovery': return { ...base, recovery: { status: 'waiting', hoursLeft: 48 }, toast: toast('Recovery started · 48 hours to go') };
    case 'lanternImport': return { ...base, lanternImported: true, lanternStep: 3, toast: toast('Imported into Lantern · nothing sent, nothing paid') };
    default: return base;
  }
}

// The network confirms what the wallet approved: the pending receipt settles, the app's state changes and the wallet's toast fires now.
// The wallet's own sends and swaps settle here too: their receipts turn Done and their balance changes land.
function confirm(s) {
  const own = s.txs.filter(t => t.status === 'pending' && t.own);
  let out = s;
  if (own.length) {
    const txs = own.reduce((list, t) => settle(list, t.id), s.txs);
    const assets = own.reduce((all, t) => ({ ...all, [t.account]: applyOps(all[t.account] || [], t.ops) }), s.assets);
    // A deposit into the pool lands as waiting until the pool approves it; a moved payment is gone from the found list.
    const privWait = [...s.privWait, ...own.filter(t => t.wait).map(t => ({ ...t.wait, txId: t.id }))];
    const privIn = s.privIn.filter(p => !own.some(t => t.spends === p.id));
    out = { ...s, txs, assets, privWait, privIn, fxTx: own[0].id, toast: toast(own[0].done) };
  }
  const f = out.flow;
  if (!f || f.phase !== 'confirming') return out;
  const done = { ...out, flow: { ...f, phase: 'done' } };
  switch (f.kind) {
    case 'batch': return { ...done, deposited: true, txs: settle(out.txs, TX_BATCH.id), fxTx: TX_BATCH.id, toast: toast('Done · 0.09 USDC network fee, taken in USDC') };
    case 'xchain': return { ...done, bridgeStatus: 'submitted', txs: settle(out.txs, TX_XCHAIN.id), fxTx: TX_XCHAIN.id, toast: toast('Approved once · Base now, Arbitrum when the money arrives') };
    // In the mockup the rewards contract also moves the account's tpETH on chain. No assertion names tpETH, so the
    // network undoes the whole claim: nothing moves, the fee is paid, and the receipt says it failed.
    case 'claim': return { ...done, claimUndone: true, txs: fail(out.txs, TX_CLAIM.id), fxTx: TX_CLAIM.id, toast: toast('Claim undone · your tpETH stayed · fee paid', 'warn') };
    // The grant lands: one Keystore row per permission, a receipt for the relayed batch, and the app's page turns active.
    case 'session': {
      const sess = buildSession(f.req);
      const tx = buildSessionTx(sess, f.keyUsed, f.keyPlain);
      const n = sess.perms.length;
      return { ...done, sessionEnabled: sess.app === 'Tidepool' ? true : out.sessionEnabled, sessions: [sess, ...out.sessions.filter(x => x.id !== sess.id)], txs: [tx, ...out.txs.filter(t => t.id !== tx.id)], fxTx: tx.id, toast: toast(`${sess.app} has access for ${sess.days} days · ${n} permission${n === 1 ? '' : 's'}`) };
    }
    case 'order': return { ...done, orderSigned: true };
    default: return done;
  }
}

function reducer(s, a) {
  switch (a.type) {
    case 'set': return { ...s, ...a.patch };
    case 'sheet': return { ...s, sheet: a.sheet, sim: simFor(a.sheet), flow: a.sheet ? (APP_KINDS.has(a.sheet.kind) ? null : s.flow) : rejected(s) };
    case 'simDone': return s.sim ? { ...s, sim: { ...s.sim, phase: 'done' } } : s;
    // An adjustment on the open sheet (an adjustable permission's amount): the sheet changes, the simulation does not restart.
    case 'sheetPatch': return s.sheet ? { ...s, sheet: { ...s.sheet, ...a.patch } } : s;
    // An "Under the hood" box with an id was opened (Details in ui.jsx); the tutorial reads it, nothing else does.
    case 'opened': return { ...s, opened: { ...s.opened, [a.id]: true } };
    // The app redeems a permission through the policy manager. The manager's check either passes, and the account acts
    // (a receipt lands in the wallet's history), or fails in simulation, and nothing is sent.
    case 'redeem': {
      const sess = s.sessions.find(x => x.id === a.sessionId);
      if (!sess) return s;
      const check = redeemCheck(sess, a.permId, a.amount);
      const n = s.runs.length + 1;
      if (!check.ok) return { ...s, runs: [{ id: n, permId: a.permId, amount: a.amount, ok: false, error: check.error, text: check.text }, ...s.runs] };
      const p = check.perm, tx = buildRedeemTx(sess, p, a.amount, n);
      const sessions = s.sessions.map(x => x.id === sess.id ? { ...x, perms: x.perms.map(q => q.id === p.id ? { ...q, spent: (q.spent || 0) + a.amount } : q) } : x);
      return { ...s, sessions, txs: [tx, ...s.txs], runs: [{ id: n, permId: p.id, amount: a.amount, ok: true, txId: tx.id }, ...s.runs], toast: toast(`${tx.title} · within its permission`) };
    }
    // The pool approves the oldest waiting deposit: it joins the private balance and its receipt says so.
    case 'depositApproved': {
      const [w, ...rest] = s.privWait;
      if (!w) return s;
      const txs = s.txs.map(t => t.id === w.txId ? { ...t, steps: [...(t.steps || []), 'Approved by the pool · ready to send privately'] } : t);
      return { ...s, privWait: rest, txs, assets: { ...s.assets, private: applyOps(s.assets.private || [], [{ token: w.token, chain: w.chain, d: w.qty }]) }, toast: toast(`Approved · ${fmtQty(w.token, w.qty)} ${TOKENS[w.token].symbol} is ready to send privately`) };
    }
    case 'flow': return { ...s, flow: a.flow };
    case 'confirm': return confirm(s);
    case 'toast': return { ...s, toast: toast(a.text, a.kind) };
    case 'faceId': return { ...s, faceId: true, sheet: a.sheet || s.sheet };
    case 'sign': { // approve the current sheet with the selected key: run its factors in order
      const sheet = a.sheet || s.sheet;
      // a private send or move is signed by its own one-time key, with Face ID alone: no key of Main account, no co-signer
      const steps = sheet && (sheet.hidden || ONE_TIME_KINDS.has(sheet.kind)) ? [{ kind: 'face' }] : signerSteps(signerKey(s), s.keys.main || []);
      return startStep({ ...s, sheet }, { steps, at: 0 });
    }
    // Keel asks the Anchor to connect (setting up from an EOA on the device): the device shows the request and waits
    // for its Approve key, as it does for a signature.
    case 'hwConnect': return startStep({ ...s, welcomeFlow: 'hwImport', hwLinked: false, sheet: { kind: 'connect' } }, { steps: [{ kind: 'hw' }], at: 0 });
    case 'hwPage': return { ...s, hw: { ...(s.hw || { active: true }), page: a.page } };
    case 'hwApprove': return next(s);
    case 'hwCancel': return { ...s, hw: null, sig: null, sim: null, sheet: null, flow: rejected(s), toast: s.sheet && s.sheet.kind === 'connect' ? toast('Not connected · Keel can’t see the Anchor’s accounts', 'warn') : toast('Rejected on Anchor · nothing was signed', 'warn') };
    case 'approve': return next(s);
    case 'cosignPassed': return s.cosign ? { ...s, cosign: { ...s.cosign, phase: 'passed' } } : s;
    // The co-signer refuses on its own (the transaction failed one of its checks): nothing is signed, nothing is sent,
    // and the wallet says what was refused. Not a "no" from the visitor, so the tutorial reads it as the step's result.
    case 'cosignBlock': {
      const sh = s.sheet || {};
      const provider = (s.cosign && s.cosign.provider) || null;
      return { ...s, cosign: null, sig: null, sim: null, sheet: null, faceId: false, screened: { to: sh.to, provider: provider ? provider.name : 'The co-signer', why: sh.why || 'a flagged address' }, toast: toast(`${provider ? provider.name : 'The co-signer'} refused · nothing was sent`, 'warn') };
    }
    case 'cosignRefuse': return { ...s, cosign: null, sig: null, sim: null, sheet: null, faceId: false, flow: rejected(s), toast: toast(`${(s.cosign && s.cosign.provider.name) || 'The service'} said no · nothing was sent`, 'warn') };
    case 'reject': return { ...s, sheet: null, faceId: false, hw: null, cosign: null, sig: null, sim: null, flow: rejected(s), toast: toast('Rejected · nothing was signed', 'warn') };
    case 'reset': return { ...initialState(), take: s.take + 1 };
    // A tutorial chapter starts (Tour.jsx): the mockup starts over from initialState() plus the chapter's patch. `take`
    // counts the starts; App.jsx keys the stage by it, so no tab, open box or scroll position carries over.
    case 'tour': { const s1 = { ...initialState(), ...a.patch, take: s.take + 1 }; return { ...s1, sim: simFor(s1.sheet, s1.hw) }; }
    // The tutorial puts a step back: the mockup as it was when the step began, plus the step's setup. A signature that
    // was waiting then (the Anchor, Face ID) waits again, since the screens remount and their timers start over.
    case 'rewind': {
      const r = { ...a.state, ...a.patch, take: s.take + 1, toast: null };
      return a.patch && a.patch.sheet ? { ...r, sim: simFor(r.sheet, r.hw) } : r;
    }
    default: return s;
  }
}

export function StoreProvider({ children }) {
  const [state, send] = useReducer(reducer, undefined, initialState);
  // Every action also goes on a short list the tutorial reads after each commit (Tour.jsx), so a step can tell what the
  // visitor did, not only where the mockup ended up. The list is filled here and not in the reducer, which React's
  // StrictMode runs twice in development.
  const sent = useRef([]);
  const dispatch = useCallback((a) => { const l = sent.current; l.push(a); if (l.length > 40) l.shift(); send(a); }, []);
  const drain = useCallback(() => sent.current.splice(0), []);
  const value = useMemo(() => ({ state, dispatch, drain }), [state, dispatch, drain]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useStore() { return useContext(Ctx); }
