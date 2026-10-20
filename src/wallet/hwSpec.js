// Builds what the Anchor hardware wallet shows for an approval. The order follows clear signing: first WHAT is being
// signed, every step of the batch as its ERC-7730 descriptor renders it (the ERC-8211 rule Keel appended is the last
// step, because it is a step); then the TRANSACTION ASSERTIONS, the bounds the device can prove from the bytes it
// signs (EIP-7906); then Approve. Names and step wording come from signed descriptors; `raw` is what the device
// shows without them: addresses and calldata, never a label from the computer. The assertions page ends with
// "Nothing else changes.": any change to the account's tokens, approvals or ETH that no line above names fails.
import { describeKey, fmtLimit, oracleOf, FLAGS, FLAG_ORDER, CHAINS, providerById, protectorOf, KEEL_RULES, STEPS, STATE_CHANGES, TOKENS, fmtQty, feeFor, sendRule, swapRule, sendStep, swapStep, sendChanges, swapChanges, shieldStep, shieldRule, shieldChanges, POOL, units, TIDEPOOL_REQ, sessionSteps, sessionChanges, dateAfter, permText, actorIdOf, TIDEPOOL_OPERATOR, ORBIT_OPERATOR, VAULT_MANAGER, POLICY_MANAGER, POLICIES } from '../data.js';

export const NAMES = {
  'USDC': '0xA0b8…eB48', 'ETH Vault': '0x9C1d…4E20', 'tpETH': '0x9C1d…4E20', 'Tidepool Router': '0x7a25…488D', 'USDC Vault': '0x4F3e…b1A9',
  'tpUSDC': '0x4F3e…b1A9', 'Tidepool Bridge': '0x2Bb6…c0e1', 'Orbit game position': '0x91cE…4b10 · POSITIONS', 'Tidepool Vault Manager': VAULT_MANAGER.short,
  'Tidepool Operator': TIDEPOOL_OPERATOR.short, 'Orbit Operator': ORBIT_OPERATOR.short, 'Orbit Manager': '0x6a0B…d1e4', 'Keel Policy Manager': POLICY_MANAGER.short, 'SessionPolicy': POLICIES.periodic.short, 'StreamPolicy': POLICIES.stream.short,
  'tips.tidepool.eth': '0x71b2…0aC4', 'ETH': 'ETH', 'Keel account': '0x8C4e…F21E', 'USDC (Base)': '0x8335…2913', 'USDC (Arbitrum)': '0xaf88…5831', 'Orbit': '0x91cE…4b10',
  'Keystore': '0x5aFe…0130', 'Swap Router': '0x3fC9…1E22', 'Privacy Pools': POOL.entry, 'alice.eth': '0x2B7a…c41E', 'bob.eth': '0x91aC…7f02', 'Trading account': '0x3D9a…77C0',
};
export function nameOrRaw(name, raw) { return raw ? (NAMES[name] || name) : name; }

const title = (text) => ({ t: 'title', text });
const head = (text) => ({ t: 'head', text });
const row = (l, v, d) => ({ t: 'row', l, v, d });   // `d`: a field from the signed descriptor, hidden in raw mode
const text = (t) => ({ t: 'text', text: t });
const warn = (t) => ({ t: 'warn', text: t });
// One step of what is signed: its number, the descriptor's wording, where it runs, and the raw form without descriptors.
const step = (n, t, at, raw) => ({ t: 'step', n, text: t, at, raw });
function listWith(prefix, items) { return { t: 'list', items, prefix }; }

const APPROVE = (note) => ({ final: true, lines: [title('Approve?'), text(note || 'Either every line shown holds, or the transaction fails and nothing moves.')] });
const MSG_APPROVE = { final: true, lines: [title('Sign this message?'), warn('NOT A TRANSACTION. Nothing is enforced on-chain.'), text('Sign only if you trust the app that asked.')] };
const NO_MOVE = 'No asset moves. ';
// One step as the device shows it (see STEPS in data.js): the descriptor's intent, where it runs, its fields as rows
// that vanish without a descriptor, and the raw call for raw mode.
function stepLines(n, st) {
  const net = st.chain ? (CHAINS.find(c => c.id === st.chain) || {}).name : null;
  const at = st.kind === 'check' ? [st.note || 'Rule in the batch', net].filter(Boolean).join(' · ') : [st.protocol || st.note || 'Plain transfer · no contract', net].filter(Boolean).join(' · ');
  return [step(n, st.intent, at, st.raw || 'no calldata'), ...(st.fields || []).map(([l, v]) => row(l, v, true))];
}
const RULE_STEP = (n, rule) => stepLines(n, { kind: 'check', intent: rule.intent, fields: rule.fields, note: 'Rule added by Keel · checked last', chain: rule.chain, raw: rule.tech });
// The assertion lines from the state changes: one asset on one account, its bound.
const who = (c) => c.account === 'Your account' ? 'you' : c.account;
const assertRows = (changes) => changes.map(c => row(`${c.label} · ${who(c)}`, `${c.delta || c.value}  ${c.bound}`));
// A key change: only the key list and the fee change, then the assurance that nothing else does.
const CHANGE_ASSERTS = (keys, fee = '−0.000010 ETH  at most') => [row('Keys · you', keys), row('ETH · you', fee), text('Nothing else changes.')];

// Pages from a title, the steps (each a group of lines: the step line plus any parameter rows), the assertion lines
// and the approve note. Steps are packed by line budget: a step line counts two, a row one.
const BUDGET = 6;   // about three steps a page; a first group larger than this still stays on its page
const cost = (ln) => ln.t === 'step' ? 2 : 1;
function pagesFor(titleText, groups, asserts, note) {
  const n = groups.length;
  const pages = [];
  let lines = [title(titleText), head(`WHAT YOU SIGN · ${n} STEP${n === 1 ? '' : 'S'}`)];
  let used = 0, from = 1;
  groups.forEach((g, i) => {
    const c = g.reduce((a, ln) => a + cost(ln), 0);
    if (used + c > BUDGET && used > 0) {
      pages.push({ lines });
      lines = [head(i + 1 === n ? `WHAT YOU SIGN · STEP ${n}` : `WHAT YOU SIGN · STEPS ${i + 1}–${n}`)];
      used = 0; from = i + 1;
    }
    lines.push(...g);
    used += c;
  });
  pages.push({ lines });
  pages.push({ lines: [head('TRANSACTION ASSERTIONS · OR IT FAILS'), ...asserts] });
  pages.push(APPROVE(note));
  return pages;
}

function rawPages(kind, sheet, state) {
  switch (kind) {
    case 'batch': return pagesFor('Swap & deposit on Tidepool', [
      ...STEPS.batch.map((st, i) => stepLines(i + 1, st)),
      RULE_STEP(STEPS.batch.length + 1, KEEL_RULES.batch),
    ], [...assertRows(STATE_CHANGES.batch), text('Nothing else changes. Expires Sep 11, 14:12 · Ethereum')]);
    case 'xchain': return pagesFor('Bridge & deposit on Tidepool', [
      ...STEPS.xchain.map((st, i) => stepLines(i + 1, st)),
      RULE_STEP(STEPS.xchain.length + 1, KEEL_RULES.xchain),
    ], [
      head('BASE'), ...assertRows(STATE_CHANGES.xchain.filter(c => c.chain === 'base')),
      head('ARBITRUM · WHEN ≥ 2,000 USDC ARRIVES'), ...assertRows(STATE_CHANGES.xchain.filter(c => c.chain === 'arbitrum')),
      text('Nothing else changes on either network. Valid 24 hours. If nothing arrives, nothing runs.'),
    ]);
    // A rewards claim: the one step, Keel's rule, then the lock: what comes in, the fee, and nothing else.
    case 'claim': return pagesFor('Claim rewards on Tidepool', [
      stepLines(1, STEPS.claim[0]),
      RULE_STEP(2, KEEL_RULES.claim),
    ], [...assertRows(STATE_CHANGES.claim), text('Nothing else changes. Expires Sep 11, 14:12 · Ethereum')]);
    // A permission grant (ERC-7715): one Allow step per permission as its descriptor renders it, the raw authorizeActor
    // call per Keystore row without descriptors, then Keel's rule; the assertions say how many rows are added and that
    // no asset moves (the app's session account pays).
    case 'session': {
      const req = sheet.req || TIDEPOOL_REQ();
      const steps = sessionSteps(req);
      return pagesFor(`Give ${req.app} access`, [
        ...steps.map((st, i) => stepLines(i + 1, st)),
        RULE_STEP(steps.length + 1, KEEL_RULES.change),
      ], [...assertRows(sessionChanges(req)), row('ETH · you', `unchanged · fees paid by ${req.app}`), text(`Nothing else changes. Until ${dateAfter(req.days, true)}.`)], NO_MOVE + 'Either exactly these permissions are given, or nothing changes.');
    }
    // An EOA upgrades in place (EIP-7702): the device shows the address it keeps, the account code it points to, and
    // that its own key stays the first key with full access. Nothing moves.
    case 'upgrade': return pagesFor('Upgrade this address', [
      [step(1, 'Upgrade to the new account', 'EIP-7702 · Ethereum', 'authorize(0x7702…AcC0 shared account code, nonce 214)'), row('Address', '0x8C4e…F21E · stays'), row('First key', 'this Anchor · full access'), row('Funds', 'stay where they are')],
      RULE_STEP(2, KEEL_RULES.change),
    ], [row('Address · you', 'unchanged'), row('Balance · you', 'unchanged'), row('Keys · you', 'this Anchor only'), text('Nothing else changes.')], NO_MOVE + 'Either this address is upgraded, or nothing changes.');
    // A wallet asks to connect: the device names the wallet and what it gets to see. Nothing is signed.
    case 'connect': return [
      { final: true, lines: [title('Connect account'), row('Wallet', 'Keel'), row('Shares', 'addresses and balances'), text('Nothing is signed. Every signature still needs this device.')] },
    ];
    case 'create': return [
      { lines: [title('Create a new account'), head('WHAT YOU SIGN · 1 STEP'), step(1, 'Create your account', 'Keystore · not on the network yet', 'Keystore.create(keys: [this Anchor], salt 0x…)'), row('Address', '0x8C4e…F21E'), row('First key', 'this Anchor · full access'), row('Networks', 'Ethereum, Base, Arbitrum, Optimism')] },
      { lines: [head('TRANSACTION ASSERTIONS · OR IT FAILS'), row('Keys', 'exactly this one'), text('Nothing else changes. The key stays on this device. Nothing goes on the network until the first payment.')] },
      APPROVE(NO_MOVE + 'Either the account is created with exactly this key, or nothing happens.'),
    ];
    case 'addKey': {
      const t = describeKey(sheet);
      const flags = sheet.flags || ['send', 'gas'];
      const can = FLAG_ORDER.filter(f => flags.includes(f)).map(f => FLAGS[f].toLowerCase()).join(', ') || 'nothing';
      const cannot = FLAG_ORDER.filter(f => !flags.includes(f)).map(f => FLAGS[f].toLowerCase()).join(', ') || 'nothing';
      const chainIds = sheet.chains || CHAINS.map(c => c.id);
      const chains = chainIds.map(id => (CHAINS.find(c => c.id === id) || {}).name).join(', ');
      const name = sheet.name || t.name;
      const prov = t.prov;
      const guard = prov ? [row('Protected by', prov.name + (prov.id === 'safenet' ? ' · key from oracle' : '')), row('It can', 'only add a signature')] : [];
      const cap = sheet.limit ? [row('Spend limit', fmtLimit(sheet.limit)), row('Priced by', `${oracleOf(sheet.limit).name} · ETH and every token`)] : [];
      const groups = [];
      if (t.set) {
        // A multisig: the device lists every member it will require, the co-signer included, and how many must sign.
        const keys = state.keys[state.accountId] || [];
        const names = (sheet.members || []).map(id => (keys.find(k => k.id === id) || {}).name || id);
        const all = prov ? [...names, prov.name] : names;
        const req = (sheet.threshold || names.length) + (prov ? 1 : 0);
        groups.push([step(1, 'Add key', `Keystore · ${chainIds.length} networks`, `Keystore.addKey(threshold, members [${all.join(', ')}], required ${req}, flags 0x${flags.length})`), row('Key', name), row('Members', all.join(' + ')), row('Required', `${req} of ${all.length}`), ...guard, row('Can', can), row('Cannot', cannot), ...cap]);
      } else {
        groups.push([step(1, 'Add key', `Keystore · ${chainIds.length} networks`, `Keystore.addKey(${t.algo.tech}, 0x…, flags 0x${flags.length}, expiry ${sheet.expiry ? '…' : 0})${prov ? ' · member only' : ''}`), row('Key', name), row('Signs with', t.algo.name + (t.pq ? ' · quantum-safe' : '')), row('Can', can), row('Cannot', cannot), ...cap, row('Expires', sheet.expiry || 'never')]);
        // With protection on, the key is a member only and a 2-of-2 set with the co-signer is what acts.
        if (prov) groups.push([step(2, 'Turn on protection', `Keystore · ${chainIds.length} networks`, `Keystore.addKey(threshold, members [${name}, ${prov.name}], required 2, flags 0x${flags.length})`), row('Key', name), row('Members', `${name} + ${prov.name}`), row('Required', '2 of 2'), ...guard]);
      }
      groups.push(RULE_STEP(groups.length + 1, KEEL_RULES.change));
      return pagesFor(t.set ? 'Add a multisig' : 'Add a device', groups, [...CHANGE_ASSERTS(prov ? '+ this key, protected' : '+ this key only'), row('Networks', chains)], NO_MOVE + 'Either exactly this key is added, or nothing changes.');
    }
    case 'revokeKey': {
      const key = (state.keys[state.accountId] || []).find(k => k.id === sheet.keyId) || { name: 'this key' };
      const prov = protectorOf(key);
      if (prov) return pagesFor('Turn protection off', [
        [step(1, 'Turn protection off', 'Keystore · every network', `Keystore.removeKey(set #${sheet.keyId}) · addKey(${key.name} alone)`), row('Key', key.name), row('Co-signer', prov.name)],
        RULE_STEP(2, KEEL_RULES.change),
      ], [...CHANGE_ASSERTS(`${key.name} acts alone`), text(`${prov.name} no longer verifies what it signs.`)], NO_MOVE + 'Either protection is turned off, or nothing changes.');
      return pagesFor('Remove a device', [
        [step(1, 'Remove key', 'Keystore · every network', `Keystore.removeKey(${key.name})`), row('Key', key.name)],
        RULE_STEP(2, KEEL_RULES.change),
      ], [...CHANGE_ASSERTS('− this key only'), text('Every other device keeps working.')], NO_MOVE + 'Either exactly this key is removed, or nothing changes.');
    }
    case 'revokeSession': {
      const s = state.sessions.find(x => x.id === sheet.sessionId) || { app: 'this app', to: { short: '0x…' }, perms: [] };
      const p = sheet.permId ? s.perms.find(x => x.id === sheet.permId) : null;
      if (p) return pagesFor('Remove a permission', [
        [step(1, 'Remove permission', `Keystore · slot ${p.slot}`, `Keystore.revokeActor(${actorIdOf(s.to, p.slot)})`), row('App', s.app), row('Permission', permText(p).title, true)],
        RULE_STEP(2, KEEL_RULES.change),
      ], [...CHANGE_ASSERTS('− 1 permission'), text(`${s.app} keeps its other permissions. Nothing else changes.`)], NO_MOVE + 'Either exactly this permission is removed, or nothing changes.');
      const n = s.perms.length;
      return pagesFor('Remove app access', [
        [step(1, 'Remove access', `Keystore · ${n} row${n === 1 ? '' : 's'}`, `Keystore.revokeActor × ${n} (${s.to.short}, slots 0–${Math.max(0, n - 1)})`), row('App', s.app), row('Permissions', String(n))],
        RULE_STEP(2, KEEL_RULES.change),
      ], [...CHANGE_ASSERTS(`− ${n} permission${n === 1 ? '' : 's'}`), text('The app loses access at once. Nothing else changes.')], NO_MOVE + 'Either exactly this access is removed, or nothing changes.');
    }
    case 'revokeAll': {
      const apps = [...(state.accountId === 'main' ? state.sessions : []).map(x => x.app), ...(state.keys[state.accountId] || []).filter(k => k.manager).map(k => k.name)];
      return pagesFor('Remove all app access', [
        [step(1, 'Remove all app access', 'Keystore · one batch', 'Keystore.revokeActor × every app row'), listWith('Apps: ', apps)],
        RULE_STEP(2, KEEL_RULES.change),
      ], [...CHANGE_ASSERTS('− sessions only'), text('Your own devices and keys are untouched.')], NO_MOVE + 'Either all of them are removed, or nothing changes.');
    }
    case 'lock': return pagesFor('Freeze devices & access', [
      [step(1, 'Freeze devices & access', 'Keystore', `Keystore.lock(unlockDelay ${sheet.days || '30'}d)`), row('For', `${sheet.days || '30'} days`)],
      RULE_STEP(2, KEEL_RULES.change),
    ], [...CHANGE_ASSERTS(`frozen for ${sheet.days || '30'} days`), text('Until then no key can be added, removed or changed, not even with your Face ID. Sending keeps working.')], NO_MOVE + 'Either the freeze is set, or nothing changes.');
    case 'unlock': return pagesFor('Lift the freeze', [
      [step(1, 'Lift the freeze', 'Keystore', 'Keystore.unlock()')],
      RULE_STEP(2, KEEL_RULES.change),
    ], [...CHANGE_ASSERTS('changeable again'), text('Devices & access can be changed again.')], NO_MOVE + 'Either the freeze is lifted, or nothing changes.');
    case 'cancelPending': return pagesFor('Cancel unfinished changes', [
      [step(1, 'Cancel unfinished changes', 'Keystore · key-change nonce', 'Keystore.bumpNonce(3 → 4)'), row('Cancel', 'Add “Old laptop”'), row('Cancel', 'Access for “Beta app”')],
      RULE_STEP(2, KEEL_RULES.change),
    ], [...CHANGE_ASSERTS('nothing active changes'), text('Anything already active is not touched.')], NO_MOVE + 'Either the unfinished changes are cancelled, or nothing changes.');
    // The wallet's own transactions: the one step as its descriptor renders it, then Keel's rule; the assertions are
    // the state changes: your row (amount plus fee), the recipient's or the token you get, and nothing else.
    case 'send': {
      const s = TOKENS[sheet.token].symbol, q = fmtQty(sheet.token, sheet.qty), chain = (CHAINS.find(c => c.id === sheet.chain) || CHAINS[0]).name;
      const to = NAMES[sheet.to] || sheet.short;
      const raw = sheet.token === 'eth' ? `${to} · ${units(sheet.qty, 18)} wei · no data` : `${NAMES[s] || s} · transfer(${to}, ${units(sheet.qty, 6)})`;
      return pagesFor(`Send ${s}`, [
        stepLines(1, { ...sendStep(sheet), raw }),
        RULE_STEP(2, sendRule(sheet)),
      ], [...assertRows(sendChanges(sheet)), text(`Nothing else changes. Valid 10 minutes · ${chain}`)], `Either exactly ${q} ${s} reaches ${sheet.to}, or nothing moves.`);
    }
    case 'swap': {
      const s = TOKENS[sheet.token].symbol, t = TOKENS[sheet.toToken].symbol, chain = (CHAINS.find(c => c.id === sheet.chain) || CHAINS[0]).name;
      const dec = sheet.token === 'eth' ? 18 : 6, decOut = sheet.toToken === 'eth' ? 18 : 6;
      return pagesFor('Swap', [
        stepLines(1, { ...swapStep(sheet), raw: `${NAMES['Swap Router']} · swapExact(${units(sheet.qty, dec)} ${s} → ≥ ${units(sheet.min, decOut)} ${t})` }),
        RULE_STEP(2, swapRule(sheet)),
      ], [...assertRows(swapChanges(sheet)), text(`Nothing else changes. Expires in 10 minutes · ${chain}`)]);
    }
    // A deposit into the private balance is Main account's own transaction, so any of its keys may sign it. (A private
    // send and a moved payment are signed by one-time keys with Face ID alone and never reach the device.)
    case 'shield': {
      const s = TOKENS[sheet.token].symbol, q = fmtQty(sheet.token, sheet.qty);
      return pagesFor('Add to private balance', [
        stepLines(1, { ...shieldStep(sheet), raw: `${POOL.entry} · deposit(${units(sheet.qty, 18)} wei, precommitment)` }),
        RULE_STEP(2, shieldRule(sheet)),
      ], [...assertRows(shieldChanges(sheet)), text('Nothing else changes. Valid 10 minutes · Ethereum')], `Either exactly ${q} ${s} goes into the pool, or nothing moves. The deposit is public.`);
    }
    case 'signin': return [
      { lines: [title('Message signature'), warn('NOT A TRANSACTION. Nothing is enforced on-chain.'), row('For', 'Tidepool · tidepool.fi'), row('Purpose', 'sign in'), text('A message can grant nothing by itself, but it carries no guarantees either. Sign only if you trust Tidepool.')] },
      MSG_APPROVE,
    ];
    case 'order': return [
      { lines: [title('Message signature'), warn('NOT A TRANSACTION. Nothing is enforced on-chain.'), row('For', 'Tidepool · limit order'), row('Ethereum', 'sell 0.5 ETH ≥ 3,300 USDC'), row('Arbitrum', 'sell 0.2 ETH ≥ 3,300 USDC'), text('Valid only on these two networks. Whatever Tidepool does with this order is not covered by any guarantee.')] },
      MSG_APPROVE,
    ];
    default: return [{ lines: [title('Unknown request'), warn('This device does not know this request type and will not sign it.')], final: false, refuse: true }];
  }
}

// When the Anchor is one signature of a set, its last page says so: which one it is and who signed before it.
export function buildPages(kind, sheet, state) {
  const pages = rawPages(kind, sheet, state);
  const sig = state.sig;
  if (!sig || sig.steps.length < 2) return pages;
  const word = (st) => st.kind === 'face' ? 'iPhone' : st.kind === 'hw' ? 'Anchor' : st.provider.name;
  const before = sig.steps.slice(0, sig.at).map(word);
  const after = sig.steps.slice(sig.at + 1).map(word);
  const last = pages[pages.length - 1];
  const note = `Signature ${sig.at + 1} of ${sig.steps.length}.` + (before.length ? ` ${before.join(', ')} signed first.` : '') + (after.length ? ` ${after.join(', ')} signs after.` : '');
  return [...pages.slice(0, -1), { ...last, lines: [...last.lines, text(note)] }];
}

// With nothing to review. Before Keel has been set up from it, no wallet is connected yet.
export function idlePages(state) {
  if (state && !state.onboarded && !state.hwLinked) return [{ lines: [title('Anchor'), text('Plugged in.'), text('No wallet connected yet.')], idle: true }];
  return [{ lines: [title('Anchor'), text('Connected.'), text('Waiting for a request.')], idle: true }];
}
