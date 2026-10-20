// Sample data for the demo. Nothing here talks to a chain; it is the content the wallet, the app and the device display.

export const CHAINS = [
  { id: 'ethereum', name: 'Ethereum', letter: 'E', color: '#514E80', transport: 'EIP-8141 frame transactions', plain: 'Built into the network', balance: '$8,120.40' },
  { id: 'base', name: 'Base', letter: 'B', color: '#285CC2', transport: 'EIP-8130 transactions', plain: 'Built into the network', balance: '$3,900.00' },
  { id: 'arbitrum', name: 'Arbitrum', letter: 'A', color: '#2D445C', transport: 'ERC-4337 bundler', plain: 'Through a relay', balance: '$459.75' },
  { id: 'optimism', name: 'Optimism', letter: 'O', color: '#C93029', transport: 'ERC-4337 bundler', plain: 'Through a relay', balance: '$0.00' },
];
export const ALL_CHAIN_IDS = CHAINS.map(c => c.id);

// What the account holds, one line per token on a network, as the home screen lists it.
// Values add up to the per-network balances in CHAINS and the account totals in ACCOUNTS.
export const TOKENS = {
  eth: { symbol: 'ETH', name: 'Ether' },
  usdc: { symbol: 'USDC', name: 'USD Coin' },
  tpeth: { symbol: 'tpETH', name: 'ETH Vault' },
  tpusdc: { symbol: 'tpUSDC', name: 'USDC Vault' },
};
// Amounts the wallet writes itself: 4 decimals for ETH and vault shares, 2 for dollar tokens; `fixed` keeps the zeros a list wants.
// A dollar token with cents shows both places (49.90 USDC); a whole amount shows none (1,000 USDC).
export function fmtQty(token, n, fixed = false) { const usd = token === 'usdc' || token === 'tpusdc', dec = usd ? 2 : 4; return n.toLocaleString('en-US', { minimumFractionDigits: fixed || (usd && Math.round(n * 100) % 100 !== 0) ? dec : 0, maximumFractionDigits: dec }); }
// Net amounts that carry the fee inside them need more places than the display rounding: 3 for USDC, 7 for ETH.
export function fmtFine(token, n) { return n.toLocaleString('en-US', { maximumFractionDigits: token === 'usdc' || token === 'tpusdc' ? 3 : 7 }); }
export function fmtUsd(n) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
export function floorQty(token, n) { const f = token === 'usdc' || token === 'tpusdc' ? 100 : 10000; return Math.max(0, Math.floor(n * f + 1e-9) / f); }
// A holding keeps its numbers (`qty`, and `usd` per line so the sample values stay exact) plus the strings the lists show.
// Holdings live in state (`state.assets`) so a send or a swap can move them.
export const withLabels = (a) => ({ ...a, amount: `${fmtQty(a.token, a.qty, true)} ${TOKENS[a.token].symbol}`, value: fmtUsd(a.usd) });
export function totalUsd(assets) { return fmtUsd(assets.reduce((n, a) => n + a.usd, 0)); }
export const ASSETS = {
  main: [
    { id: 'eth-ethereum', token: 'eth', chain: 'ethereum', qty: 2.3668, usd: 7100.40, change: '+1.8%', up: true },
    { id: 'usdc-base', token: 'usdc', chain: 'base', qty: 3820, usd: 3820, change: '0.0%', up: null },
    { id: 'tpeth-ethereum', token: 'tpeth', chain: 'ethereum', qty: 0.3169, usd: 1020, change: '+2.1%', up: true },
    { id: 'usdc-arbitrum', token: 'usdc', chain: 'arbitrum', qty: 459.75, usd: 459.75, change: '0.0%', up: null },
    { id: 'eth-base', token: 'eth', chain: 'base', qty: 0.0267, usd: 80, change: '+1.8%', up: true },
  ].map(withLabels),
  sub: [
    { id: 'usdc-arbitrum', token: 'usdc', chain: 'arbitrum', qty: 2140, usd: 2140, change: '0.0%', up: null },
  ].map(withLabels),
  // The private balance: money in the shielded pool that the pool has approved, so it can leave privately (the Private tab).
  private: [
    { id: 'eth-ethereum', token: 'eth', chain: 'ethereum', qty: 1.5, usd: 4500, change: '+1.8%', up: true },
  ].map(withLabels),
};

// App identity: the icon and colour each app's logo is drawn with.
export const APPS = {
  Tidepool: { icon: 'wave', color: 'var(--t-acc)' },
  Orbit: { icon: 'orbit', color: '#3B2FA8' },
  'Orbit Perps': { icon: 'orbit', color: '#3B2FA8' },
};

// The accounts on the Anchor, as Keel lists them once the device lets it connect. The first is the tutorial's EOA
// (its balance comes from the store); the other two are there so the visitor picks one.
export const HW_ACCOUNTS = [
  { n: 1, short: '0x8C4e…F21E', used: '214 payments' },
  { n: 2, short: '0x3B9d…7A20', total: '$418.60', used: '12 payments' },
  { n: 3, short: '0xE71c…05Bd', total: '$0.00', used: 'never used' },
];
export const ACCOUNTS = {
  main: { id: 'main', name: 'Main account', address: '0x8C4e7A0d3B9f2c61E58aD07c4b1F9e3A62d0F21E', short: '0x8C4e…F21E', total: '$12,480.15' },
  sub: { id: 'sub', name: 'Trading account', address: '0x3D9a44C1e07b9F2a6d15E8c0B7a3f9D1c2E477C0', short: '0x3D9a…77C0', total: '$2,140.00', controlledBy: 'Main account' },
};
// Who the wallet has sent to before. The Send screen offers them; a typed name resolves against them, anything else is
// an address or an ENS name the network resolves. `priv`: the contact has a private address listed in the ERC-6538
// registry, so a private send pays a new address of theirs instead of the one everyone knows.
export const CONTACTS = [
  { id: 'alice', name: 'alice.eth', short: '0x2B7a…c41E', sub: 'Last sent Sep 11', icon: 'user', priv: true },
  { id: 'bob', name: 'bob.eth', short: '0x91aC…7f02', sub: 'Last sent Aug 28', icon: 'user' },
  { id: 'trading', name: 'Trading account', short: ACCOUNTS.sub.short, sub: 'Your other account', icon: 'wallet' },
];
// An address security services list as a drainer: a fake "support agent" asks you to move your money to it. Safenet
// refuses to co-sign anything sent there (the tutorial's screening step pastes it into Send).
export const SCAM = { addr: '0xdE4d7c1A93F0b2e5C8d61F47a90E3b2c5D10bAd0', short: '0xdE4d…0bAd', why: 'a known drainer address' };
export function resolveTo(text) {
  const t = text.trim();
  if (t.toLowerCase() === SCAM.addr.toLowerCase()) return { to: SCAM.short, short: SCAM.short, known: false, icon: 'wallet', flagged: true };
  const c = CONTACTS.find(x => x.name.toLowerCase() === t.toLowerCase());
  if (c) return { to: c.name, short: c.short, known: true, icon: c.icon, priv: !!c.priv };
  if (/^0x[0-9a-fA-F]{8,}$/.test(t)) { const short = t.slice(0, 6) + '…' + t.slice(-4); return { to: short, short, known: false, icon: 'wallet' }; }
  return { to: t, short: 'ENS name · resolved when it runs', known: false, icon: 'user' };
}

// Permission flags. `FLAGS` is the plain wording the wallet uses; `FLAG_TECH` is what the explorer shows.
export const FLAG_ORDER = ['admin', 'send', 'gas', 'sponsor'];
export const FLAGS = { admin: 'Manage devices & access', send: 'Send money', gas: 'Pay network fees', sponsor: 'Pay fees for other accounts', lanes: 'Send several payments at once', recovery: 'Recovery only', session: 'App access' };
export const FLAG_SHORT = { admin: 'Full access', send: 'Can send', gas: 'Pays fees', sponsor: 'Pays others’ fees', recovery: 'Recovery only', session: 'App' };
export const FLAG_TECH = { admin: 'admin', send: 'send', gas: 'gas', sponsor: 'sponsor', lanes: 'lanes', recovery: 'recovery', session: 'session' };

// `local`: this wallet can sign with it (the phone's own passkey, the connected Anchor, and sets made of those).
// `standalone: false`: registered only as a member of a set, never on its own. The default setup is two signing keys:
// the iPhone protected by Safenet (k7, the everyday key, capped at $1,000 a day / $5,000 a week / $15,000 a month,
// priced by Chainlink) and the Anchor alone: the admin, no cap, no co-signer, the override key that can switch
// protection off. Multisigs are added from the Keys screen; any key being added can be protected by a co-signer.
export const KEYS_MAIN = [
  { id: 'k1', name: 'iPhone 16 Pro', short: 'iPhone', type: 'Face ID', sub: 'This phone', flags: ['send', 'gas', 'lanes'], added: 'Sep 2, 2026', expiry: null, icon: 'phone', chains: ALL_CHAIN_IDS, tech: 'Passkey · P-256', local: true, standalone: false, limit: { day: 1000, week: 5000, month: 15000 } },
  { id: 'k2', name: 'Anchor hardware wallet', short: 'Anchor', type: 'Hardware wallet', sub: 'Shows guarantees on its own screen', flags: ['admin', 'send', 'gas'], added: 'Sep 4, 2026', expiry: null, icon: 'device', chains: ALL_CHAIN_IDS, tech: 'Secure element · P-256', hardware: true, local: true },
  // The everyday key: the phone with protection on. To the user it is still “iPhone 16 Pro”; Safenet verifies every
  // transaction before it counts. On chain it is a 2-of-2 set of the phone's passkey and Safenet's group key.
  { id: 'k7', name: 'iPhone 16 Pro', short: 'iPhone', type: 'Face ID', sub: 'Safenet verifies every transaction before it counts', flags: ['send', 'gas', 'lanes'], added: 'Sep 5, 2026', expiry: null, icon: 'phone', chains: ALL_CHAIN_IDS, tech: 'Threshold set · 2 of 2 · passkey + Safenet (FROST group key via the Safenet oracle)', local: true, set: { members: ['k1'], threshold: 2, provider: 'safenet' }, limit: { day: 1000, week: 5000, month: 15000 } },
  // The backup key: derived from the seed phrase, registered recovery-only. It can only start the 48-hour recovery
  // (Settings > Backup key), which any device can cancel. It never signs a payment.
  { id: 'k9', name: 'Backup key', short: 'Backup key', type: 'From your seed phrase', sub: 'Recovery only · 48-hour wait', flags: ['recovery'], recovery: true, added: 'Sep 2, 2026', expiry: null, icon: 'book', chains: ALL_CHAIN_IDS, tech: 'secp256k1 · seed-derived · recovery only' },
];
// An EOA that upgrades in place (Welcome.jsx "Keep the address I already have"): its own key, from the seed phrase the
// user already has, is the account's first key and keeps full access. The key list starts with it alone.
export const EOA_KEY = { id: 'k0', name: 'Your original key', short: 'Original key', type: 'From your seed phrase · the key this address always had', sub: 'From your seed phrase', flags: ['admin', 'send', 'gas'], added: 'Sep 11, 2026', expiry: null, icon: 'book', chains: ALL_CHAIN_IDS, tech: 'secp256k1 · the address’s own key (EIP-7702)', local: true };

// An EOA whose key lives on the Anchor (the tutorial's first section): connected, imported and upgraded in place, its
// key stays the account's first key with full access, and it signs on the device.
export const ANCHOR_EOA_KEY = { id: 'k0', name: 'Anchor hardware wallet', short: 'Anchor', type: 'The key this address always had', sub: 'On your Anchor', flags: ['admin', 'send', 'gas'], added: 'Sep 11, 2026', expiry: null, icon: 'device', chains: ALL_CHAIN_IDS, tech: 'secp256k1 · the address’s own key, on the Anchor (EIP-7702)', hardware: true, local: true };

// Security services a protected signer can be checked by. Each is a member of the set, not an owner: it can only add
// its signature next to the user's. Safenet signs with a rotating FROST group key that the authenticator reads from an
// oracle contract, so the Keystore entry never changes when the key rotates.
export const PROVIDERS = [
  { id: 'safenet', name: 'Safenet', mark: 'safe', sub: 'Validator network · one threshold signature', tech: 'FROST group key · read from the Safenet oracle (epoch 41) · ~5,600 gas to verify', auth: 'safenet' },
  { id: 'blockaid', name: 'Blockaid', mark: 'shield', sub: 'Security service · simulation and phishing checks', tech: 'secp256k1 · service-held key · ecrecover', auth: 'k1' },
  { id: 'hypernative', name: 'Hypernative', mark: 'shield', sub: 'Security service · real-time risk detection', tech: 'secp256k1 · service-held key · ecrecover', auth: 'k1' },
];
export const providerById = (id) => PROVIDERS.find(p => p.id === id) || PROVIDERS[0];
// A key's spend limit: dollar caps per day, week and month across ETH and every token. The key is gated (POLICY
// scope) to a policy contract that prices each transfer with Chainlink feeds and refuses anything over a cap.
export const ORACLE = { id: 'chainlink', name: 'Chainlink', tech: 'Chainlink price feeds · ETH/USD, USDC/USD, WBTC/USD · stale after 1h, then that token can’t be spent' };
// Where a spend limit gets its prices: the user picks the source when they set the limit (`limit.oracle`).
export const ORACLES = [
  ORACLE,
  { id: 'uniswap', name: 'Uniswap', tech: 'Uniswap v4 pool prices · 30-minute time-weighted average · ETH/USDC, WBTC/USDC' },
];
export const oracleOf = (limit) => ORACLES.find(o => o.id === (limit && limit.oracle)) || ORACLE;
export const ORACLE_SUB = { chainlink: 'Price feeds from many data sources', uniswap: 'Pool prices on chain, averaged over 30 minutes' };
export const LIMIT_PERIODS = [['day', 'Per day', 'a day'], ['week', 'Per week', 'a week'], ['month', 'Per month', 'a month']];
export const LIMIT_DEFAULT = { day: 1000, week: 5000, month: 15000 };
export const fmtCap = (n) => '$' + Number(n || 0).toLocaleString('en-US');
export function fmtLimit(l) { return LIMIT_PERIODS.filter(([id]) => l && l[id] > 0).map(([id, , word]) => `${fmtCap(l[id])} ${word}`).join(' · ') || 'none'; }
export function fmtLimitShort(l) { const p = LIMIT_PERIODS.find(([id]) => l && l[id] > 0); return p ? `${fmtCap(l[p[0]])} ${p[2]}` : ''; }
// The service protecting a key, if any: a key is protected when it is a set with a provider member.
export const protectorOf = (key) => key && key.set && key.set.provider ? providerById(key.set.provider) : null;
// The checks a service reports on a transaction: the same transaction the user approved, the contracts it touches,
// and the simulated result. Shown ticking while it verifies.
export const VERIFY_CHECKS = ['Same transaction you approved', 'Contracts and recipients known, none flagged', 'Result matches the simulation'];

// Keys this wallet can sign with, in the order the picker shows them: the everyday one first.
export function signerOptions(keys) { return keys.filter(k => k.local && k.standalone !== false); }
// Which factors an approval with `key` needs, in order: Face ID for the phone, the Anchor for the hardware wallet,
// then the service's signature for a protected signer. A set takes its first `threshold` local members.
export function signerSteps(key, keys) {
  if (!key) return [{ kind: 'face' }];
  if (!key.set) return [{ kind: key.hardware ? 'hw' : 'face' }];
  const members = key.set.members.map(id => keys.find(k => k.id === id)).filter(k => k && k.local);
  const need = key.set.provider ? key.set.threshold - 1 : key.set.threshold;
  const steps = members.slice(0, need).map(m => ({ kind: m.hardware ? 'hw' : 'face' }));
  if (key.set.provider) steps.push({ kind: 'provider', provider: providerById(key.set.provider) });
  return steps.length ? steps : [{ kind: 'face' }];
}
// How a receipt and the explorer name the key that signed.
export function signerText(key, keys) {
  if (!key) return { label: 'iPhone 16 Pro · key #1 · passkey', plain: 'Face ID on iPhone 16 Pro' };
  const n = keys.indexOf(key) + 1;
  if (!key.set) return key.hardware ? { label: `${key.name} · key #${n}`, plain: key.name } : { label: `${key.name} · key #${n} · passkey`, plain: `Face ID on ${key.name}` };
  const names = key.set.members.map(id => (keys.find(k => k.id === id) || {}).short || id);
  const prov = key.set.provider ? providerById(key.set.provider) : null;
  const all = prov ? [...names, prov.name] : names;
  const sigs = prov ? ` · sig[${all.length - 1}] ${prov.name}${prov.id === 'safenet' ? ' FROST · epoch 41' : ''}` : '';
  const member = keys.find(k => k.id === key.set.members[0]) || {};
  return { label: `${key.name} · key #${n}${prov ? ` · protected by ${prov.name}` : ''} · ${key.set.threshold} of ${all.length}${sigs}`, plain: prov ? `${member.hardware ? member.name : `Face ID on ${key.name}`} · verified by ${prov.name}` : names.map(x => x === 'iPhone' ? 'Face ID' : x).join(' and ') };
}

export const KEYS_SUB = [
  { id: 's1', name: 'Main account', type: 'Manages this account', sub: 'Anyone who can use Main can use this account, up to 5,000 USDC a day', flags: ['admin', 'send'], added: 'Sep 5, 2026', expiry: null, icon: 'wallet', chains: ALL_CHAIN_IDS, delegation: true, tech: 'Account 0x8C4e…F21E listed as a key' },
  { id: 's2', name: 'Trading bot', type: 'App access', sub: 'Only Orbit Perps · until Sep 30, 2026', flags: ['session'], added: 'Sep 5, 2026', expiry: 'Sep 30, 2026', icon: 'grid', chains: ['arbitrum'], manager: 'Orbit Perps', policy: 'Max 500 USDC per trade', policyShort: '500 USDC/trade', tech: 'Session key · manager 0x77aB…03e1' },
];

// ---- App permissions: ERC-7715 request → EIP-8130 Keystore rows → ERC-7710 redemption -----------------------------
// An app asks for a set of permissions for its own session account (ERC-7715 `to`) in one request. The wallet turns
// each permission into one Keystore row (a "slot"): an actor id from (session account, slot), the external-policy
// authenticator, POLICY scope, the expiry, and manager ‖ commitment, where the commitment hashes the policy binding.
// The app then acts by calling the policy manager (ERC-7710 redeemDelegations), which checks the row, runs the policy
// and drives the account. Over budget fails in simulation and nothing is sent.
export const DEMO_NOW = Date.UTC(2026, 8, 11, 14, 2);   // the demo's clock: Sep 11, 2026 14:02 UTC
export const TIDEPOOL_OPERATOR = { name: 'Tidepool Billing', addr: '0x7d1E9B2a5c4F0e83bD61a7C2f9E04b8d3A6c4aF0', short: '0x7d1E…4aF0' };
export const ORBIT_OPERATOR = { name: 'Orbit Operator', addr: '0x91cE4b10a3D5f27E8c0B6a19F4d2e7C3b8A54b10', short: '0x91cE…4b10' };
export const POLICY_MANAGER = { name: 'Keel Policy Manager', short: '0x3aF1…9c02', tech: 'PolicyManager · same address on every network · registered on your account as an operator (k1 actor) so it may call executeBatch · not upgradeable' };
export const POLICIES = {
  periodic: { name: 'SessionPolicy', short: '0xA11c…e5e1', tech: 'a per-token cap per rolling period' },
  stream: { name: 'StreamPolicy', short: '0x5f7E…a2d4', tech: 'linear accrual from the start time, up to a cap' },
  call: { name: 'SessionPolicy', short: '0xA11c…e5e1', tech: 'a call-target allowlist, no spending' },
};
export const VAULT_MANAGER = { name: 'Tidepool Vault Manager', short: '0x5c2B…e7d9' };
export const PERIOD_WORD = { day: 'a day', week: 'a week', month: 'a month' };
export const PERIOD_ADJ = { day: 'Daily', week: 'Weekly', month: 'Monthly' };
const PERIOD_LEFT = { day: 'left today', week: 'left this week', month: 'left this month' };
export function permType(p) { return p.kind === 'call' ? 'contract-call' : `${p.token === 'eth' ? 'native' : 'erc20'}-token-${p.kind}`; }
const sym = (t) => TOKENS[t].symbol;
// How a permission reads: a name for a row whose number sits beside it (the wallet's adjustable rows, the key cards), a
// title that stands on its own, a sub line that adds only what the title cannot say (a budget's period already says it
// resets; a stream's cap does not follow from its rate), a short form for chips and lists, and the ERC-7730 fields
// the sheet and the device show.
export function permText(p) {
  if (p.kind === 'call') return { name: 'Contract access', title: `Use ${p.target}`, sub: 'no other contract', short: p.target, fields: [['Contract', p.target]] };
  const s = sym(p.token);
  if (p.kind === 'stream') return { name: 'Daily allowance', title: `${fmtQty(p.token, p.rate)} ${s} a day`, sub: `unused carries over, up to ${fmtQty(p.token, p.max)} ${s}`, short: `${fmtQty(p.token, p.rate)} ${s}/day`, fields: [['Token', s], ['Rate', `${fmtQty(p.token, p.rate)} ${s} a day`], ['Up to', `${fmtQty(p.token, p.max)} ${s}`]] };
  return { name: `${PERIOD_ADJ[p.period]} limit`, title: `Up to ${fmtQty(p.token, p.amount)} ${s} ${PERIOD_WORD[p.period]}`, sub: null, short: `${fmtQty(p.token, p.amount)} ${s}/${p.period}`, fields: [['Token', s], ['Limit', `${fmtQty(p.token, p.amount)} ${s} ${PERIOD_WORD[p.period]}`]] };
}
// Dates from the demo clock: `days` from now, in the wallet's own format.
export function dateAfter(days, withTime = false) {
  const d = new Date(DEMO_NOW + days * 86400000);
  const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return withTime ? `${day} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })}` : day;
}
export const expiryTs = (days) => Math.floor((DEMO_NOW + days * 86400000) / 1000);
export function shortDate(d) { return String(d || '').replace(/, \d{4}.*$/, ''); }
// Deterministic pseudo-hashes for the demo's ids (actor ids, commitments, contexts, transaction hashes): never a real keccak.
function mix(seed) { let h = 5381; for (const ch of String(seed)) h = (Math.imul(h, 33) ^ ch.charCodeAt(0)) >>> 0; return h; }
export function fakeHash(seed) { let h = mix(seed), hex = ''; while (hex.length < 64) { hex += h.toString(16).padStart(8, '0'); h = (Math.imul(h, 1103515245) + 12345) >>> 0; } return '0x' + hex.slice(0, 64); }
export function fakeHex(seed, len = 4) { const h = fakeHash(seed).slice(2); return '0x' + h.slice(0, len) + '…' + h.slice(64 - len); }
export const actorIdOf = (to, slot) => slot === 0 ? `bytes32(${to.short})` : `keccak(${to.short} ‖ ${slot}) = ${fakeHex(to.short + ':' + slot)}`;
// Tidepool Pro, a subscription: what the app asks the wallet for. One permission: Tidepool's billing account may take
// up to the monthly price in USDC each month, until the term ends. The price is Tidepool's, so the permission is fixed
// (ERC-7715's isAdjustmentAllowed is false, the app's decision); the user picks only how long it runs. `request(vars)`
// builds the ERC-7715 request the wallet receives; `ask` and `term` word the wallet's sentence.
export const TIDEPOOL_STRATEGY = {
  what: 'Tidepool Pro',
  ask: 'charge your Tidepool Pro subscription',
  outcome: 'Vault analytics, price alerts and faster withdrawals, paid monthly in USDC.',
  price: 49.9, token: 'usdc', period: 'month',
  rule: null,
  vars: { days: 365 },   // the default term
  durations: [[30, '1 month'], [180, '6 months'], [365, '1 year']],
  request(vars = {}) {
    const v = { ...this.vars, ...vars };
    const term = (this.durations.find(([d]) => d === v.days) || [v.days, `${v.days} days`])[1];
    return {
      app: 'Tidepool', what: this.what, ask: this.ask, term, to: TIDEPOOL_OPERATOR, chain: 'ethereum', days: v.days, rule: this.rule,
      perms: [{ id: 'p-usdc', kind: 'periodic', token: this.token, amount: this.price, period: this.period, adjust: false }],
    };
  },
};
// The request with the strategy's defaults: what the feature routes, the sheet and the device show.
export const TIDEPOOL_REQ = () => TIDEPOOL_STRATEGY.request();
// The grant as the wallet stores it once approved: the request plus one slot per permission with its policy, its
// commitment (the binding's hash, what the Keystore row holds), the context returned to the app, and its usage.
export function buildSession(req, id = 'ss-' + req.app.toLowerCase()) {
  const perms = req.perms.map((p, i) => ({ ...p, slot: i, spent: 0, policy: POLICIES[p.kind], commitment: fakeHex(`${req.to.short}:${i}:${JSON.stringify(p)}`), context: fakeHex(`ctx:${req.to.short}:${i}`, 6) }));
  return { id, app: req.app, name: req.app, what: req.what, to: req.to, chain: req.chain, days: req.days, expiry: dateAfter(req.days), expiryAt: dateAfter(req.days, true), rule: req.rule, perms, tech: `${perms.length} Keystore rows for ${req.to.name} · manager ${POLICY_MANAGER.short}` };
}
// The lines a list shows for a grant: the spending permissions, the contract it may use, how many rows.
export function sessionSummary(s) {
  const spend = s.perms.filter(p => p.kind !== 'call'), call = s.perms.find(p => p.kind === 'call');
  const tokens = [...new Set(spend.map(p => sym(p.token)))].join(', ');
  return { limit: spend.map(p => permText(p).title).join(' · ') || 'No spending', limitShort: spend.map(p => permText(p).short).join(' · ') || 'no spending', scope: call ? `Only ${call.target}` : tokens ? `Only ${tokens}` : 'No contract calls', scopeShort: call ? call.target : tokens || 'none', count: s.perms.length };
}
// The steps of a grant as the sheet and the device show them (ERC-7730): one "Allow" step per permission, on the
// Keystore, with the raw authorizeActor call for a device without descriptors.
export function sessionSteps(req) {
  const until = dateAfter(req.days, true);
  return req.perms.map((p, i) => ({ intent: 'Allow', fields: [['To', req.to.name], ...permText(p).fields, ['Until', until]], note: `Keystore · slot ${i} · ${POLICIES[p.kind].name}`,
    raw: `Keystore.authorizeActor(${actorIdOf(req.to, i)}, {EXTERNAL_POLICY, POLICY, expiry ${expiryTs(req.days)}}, ${POLICY_MANAGER.short} ‖ ${fakeHex(`${req.to.short}:${i}:${JSON.stringify(p)}`)})` }));
}
export const sessionChanges = (req) => [{ icon: 'key', tone: 'b', label: 'Keys', account: 'Your account', note: `for ${req.to.name}`, value: `+${req.perms.length} permission${req.perms.length === 1 ? '' : 's'}`, bound: 'exactly' }];
// What the app may still use under a permission now: a budget less what this period spent; a stream's amount so far
// less what was spent (the demo clock stands still, so a stream holds one day's rate and nothing more accrues).
export function permAvailable(p) { if (p.kind === 'call') return null; const cap = p.kind === 'stream' ? Math.min(p.max, p.rate) : p.amount; return Math.max(0, cap - (p.spent || 0)); }
export function permUsage(p) {
  if (p.kind === 'call') return 'any number of calls';
  const s = sym(p.token);
  return p.kind === 'stream' ? `${fmtQty(p.token, permAvailable(p))} ${s} available · +${fmtQty(p.token, p.rate)} ${s} a day` : `${fmtQty(p.token, permAvailable(p))} of ${fmtQty(p.token, p.amount)} ${s} ${PERIOD_LEFT[p.period]}`;
}
// The manager's check when the app redeems: the amount against what the policy still allows.
export function redeemCheck(s, permId, amount) {
  const p = s.perms.find(x => x.id === permId);
  if (!p) return { ok: false, error: 'NoActivePolicy', text: 'that permission was removed' };
  const avail = permAvailable(p);
  if (amount > avail + 1e-12) return { ok: false, error: 'ExceededAllowance', text: `${fmtQty(p.token, amount)} ${sym(p.token)} is more than what’s left (${fmtQty(p.token, avail)} ${sym(p.token)})` };
  return { ok: true, perm: p };
}
// The sample grant the account already carries: Orbit's session account, two rows, some of the budget used.
export const SESSIONS = [
  (() => { const s = buildSession({ app: 'Orbit', what: 'Make game moves for you', to: ORBIT_OPERATOR, chain: 'ethereum', days: 3, rule: null,
    perms: [{ id: 'o-call', kind: 'call', target: 'Orbit Manager', adjust: false }, { id: 'o-usdc', kind: 'periodic', token: 'usdc', amount: 5, period: 'day', adjust: true }] }, 'ss1'); s.perms[1].spent = 1.5; return s; })(),
];

// The rule Keel appends to every transaction it signs: an ERC-8211 predicate step, a check with no call, run last.
// If it fails, that network's part reverts. It works on every transport, which is why it is there even where
// EIP-7906 already asserts the outcome. `device` is the label/value line the Anchor shows for it.
export const KEEL_RULES = {
  // A rule is a step, shown like one: the intent and a field naming the balance it checks, asset · account, with the bound.
  // Amounts are token amounts: the symbol comes from the token's own metadata (ERC-7730 tokenAmount), never a name the wallet composes.
  batch: { intent: 'Check balance', fields: [['Balance', 'tpETH · your account'], ['At least', '+0.312']], device: ['tpETH', '≥ +0.3120'], tech: 'require balanceOf(tpETH 0x9C1d…4E20) ≥ before + 0.312' },
  xchain: { intent: 'Check balance', fields: [['Balance', 'tpUSDC · your account'], ['At least', '+2,000']], chain: 'arbitrum', device: ['tpUSDC', '≥ +2,000.00'], tech: 'require balanceOf(tpUSDC 0x4F3e…b1A9) ≥ before + 2,000' },
  claim: { intent: 'Check balance', fields: [['Balance', 'USDC · your account'], ['At least', '+18.40']], device: ['USDC', '≥ +18.40'], tech: 'require balanceOf(USDC 0xA0b8…eB48) ≥ before + 18.40' },
  change: { intent: 'Check balances', fields: [['Spent', 'network fee only']], device: ['Outflow', 'fee only'], tech: 'require balances unchanged beyond the fee' },
};

// ---- Clear signing (ERC-7730): how each step of a request is displayed ---------------------------------------------
// A step is one call, shown as its signed descriptor renders it: the `intent` (a short verb phrase: Swap, Send,
// Deposit) and the `fields` (label + formatted value: a token amount with its own ticker, a name for an address, a
// date), then the protocol that owns the descriptor and, on a request that spans networks, the network. The wallet
// composes nothing from the calldata; without the descriptor a wallet shows the `raw` call instead. A step with
// `kind: 'check'` is an ERC-8211 predicate (the app's, or the one Keel appends last) shown the same way behind a shield.
export const STEPS = {
  batch: [
    { kind: 'check', intent: 'Check balance', fields: [['Balance', 'USDC · your account'], ['At least', '1,000']], note: 'Rule in the batch · nothing runs if it fails', raw: 'require balanceOf(0xA0b8…eB48) ≥ 1000000000' },
    { intent: 'Swap', fields: [['Send', '1,000 USDC'], ['Receive min.', '0.312 ETH']], protocol: 'Tidepool Router', raw: '0x7a25…488D · swapExactTokensForETH(1000000000, 312000000000000000, …)' },
    { intent: 'Deposit', fields: [['Amount', 'all ETH from step 2']], protocol: 'Tidepool ETH Vault', raw: '0x9C1d…4E20 · deposit($2.out) · computed when it runs' },
    { intent: 'Send', fields: [['Amount', '0.005 ETH'], ['To', 'tips.tidepool.eth']], note: 'Plain transfer · no contract', raw: '0x71b2…0aC4 · 5000000000000000 wei · no data' },
  ],
  xchain: [
    { intent: 'Send', fields: [['Amount', '2,000 USDC'], ['To', 'Tidepool Bridge'], ['Destination', 'Arbitrum']], protocol: 'Tidepool Bridge', chain: 'base', raw: '0x2Bb6…c0e1 · send(2000000000, 42161) · Base' },
    { kind: 'check', icon: 'hourglass', intent: 'Wait for balance', fields: [['Balance', 'USDC · your account'], ['At least', '2,000'], ['Up to', '24 hours']], note: 'Rule in the batch', chain: 'arbitrum', raw: 'require balanceOf(0xaf88…5831) ≥ 2000000000 · retry ≤ 24 h' },
    { intent: 'Deposit', fields: [['Amount', 'all USDC']], protocol: 'Tidepool USDC Vault', chain: 'arbitrum', raw: '0x4F3e…b1A9 · deposit(balanceOf) · computed when it runs' },
  ],
  session: sessionSteps(TIDEPOOL_REQ()),
  claim: [
    { intent: 'Claim', fields: [['Rewards', '18.40 USDC']], protocol: 'Tidepool ETH Vault', raw: '0x9C1d…4E20 · claimRewards()' },
  ],
  order: [
    { intent: 'Sell', fields: [['Amount', '0.5 ETH'], ['Price', '3,300 USDC or better']], protocol: 'Tidepool Orders', chain: 'ethereum' },
    { intent: 'Sell', fields: [['Amount', '0.2 ETH'], ['Price', '3,300 USDC or better']], protocol: 'Tidepool Orders', chain: 'arbitrum' },
  ],
};

// What the simulation says each transaction changes, shown on the State changes tab once the simulation is done and
// fixed as EIP-7906 assertions signed with the transaction: the bound is what the network checks, so any other result
// fails, and the hardware wallet renders the same lines. A row is one asset on one account and its net change: your
// account's rows first, then any account you transfer to. A contract a step calls (a router, a vault, a bridge, the fee
// payer) is not listed as an account: what it takes or gives is already in your rows. No row for a balance that ends
// where it started, and no wording about why a number changes; `note` states a fact about it (what the fee adds).
export const STATE_CHANGES = {
  batch: [
    { token: 'usdc', chain: 'ethereum', label: 'USDC', account: 'Your account', note: 'incl. 0.09 fee', delta: '−1,000.09', bound: 'at most' },
    { token: 'eth', chain: 'ethereum', label: 'ETH', account: 'Your account', delta: '−0.005', bound: 'exactly' },
    { token: 'tpeth', chain: 'ethereum', label: 'tpETH', account: 'Your account', delta: '+0.3169', bound: 'at least +0.312' },
    { token: 'eth', chain: 'ethereum', label: 'ETH', account: 'tips.tidepool.eth', delta: '+0.005', bound: 'exactly' },
  ],
  xchain: [
    { token: 'usdc', chain: 'base', label: 'USDC', account: 'Your account', note: 'Base · incl. 0.02 fee', delta: '−2,000.02', bound: 'exactly' },
    { token: 'tpusdc', chain: 'arbitrum', label: 'tpUSDC', account: 'Your account', note: 'Arbitrum · within 24 h', delta: '+2,000.00', bound: 'at least' },
  ],
  session: sessionChanges(TIDEPOOL_REQ()),
  // Rewards arrive and the fee leaves. No row names tpETH, so the lock's last line ("Nothing else changes.") covers it.
  claim: [
    { token: 'usdc', chain: 'ethereum', label: 'USDC', account: 'Your account', delta: '+18.40', bound: 'at least' },
    { token: 'eth', chain: 'ethereum', label: 'ETH', account: 'Your account', note: 'network fee', delta: '−0.000015', bound: 'at most' },
  ],
};
// A key or settings change: the key list, and the fee it costs. Only changes are listed; the card's foot says nothing else does.
export const changeState = (keys) => [
  { icon: 'key', tone: 'b', label: 'Keys', account: 'Your account', note: 'every network', value: keys, bound: 'exactly' },
  { icon: 'bolt', tone: 'b', label: 'ETH', account: 'Your account', note: 'network fees · 4 networks', delta: '−0.000010', bound: 'at most' },
];

// Lane 0 holds the stuck #41 and lane 1 the Orbit move. What Main account sends in the mockup (TX_BATCH, buildOwnTx,
// a deposit in buildPrivTx) goes on lane 2, which is idle, so none of it waits behind the stuck payment.
export const PENDING = [
  { id: 'p1', lane: 0, nonce: 41, title: '0.2 ETH to alice.eth', status: 'stuck', why: 'fee too low', chain: 'ethereum' },
  { id: 'p2', lane: 1, nonce: 7, title: 'Orbit · game move', status: 'confirming', why: '', chain: 'ethereum' },
];

// Fee assumptions, from the public gas trackers on Sep 14, 2026 (ETH ≈ $2,513):
//   Ethereum  base fee ≈ 0.11 gwei, 0.16 gwei with a small priority fee → a 212k-gas batch ≈ 0.000034 ETH ≈ $0.09
//   Base      0.005 gwei plus L1 data → a transfer or swap ≈ $0.003
//   Arbitrum  0.02 gwei → a swap or deposit ≈ $0.01
//   Optimism  well under a cent
// Private transactions on Ethereum, at the same 0.16 gwei and the wallet's $3,000 ETH. The gas figures are estimates, not
// measurements: a pool deposit ≈ 250k gas ≈ $0.12; a private send ≈ 520k gas ≈ $0.25 (the withdrawal proof, the new
// account's deploy frame, the transfer and the checks); moving a private payment into the pool ≈ 255k gas ≈ $0.12.
// The wallet pays fees in the currency being sent: a fee-payer contract charges USDC and settles the gas in ETH.
export const FEE_PAYER = { addr: '0x4fE1d0A7…c39b2C', short: '0x4fE1…9b2C', name: 'USDC Fee Payer' };

// ---- The wallet's own transactions: send and swap ---------------------------------------------------------------
// Prices the wallet quotes at. The swap rate and the fee in the currency being sent come from here; each holding keeps
// its own dollar value, so the sample numbers stay exact.
export const PRICES = { eth: 3000, usdc: 1, tpeth: 3218.68, tpusdc: 1 };
export const SLIPPAGE = 0.005;   // a swap that lands more than 0.5% under the quote fails
export const rateText = () => `1 ETH = ${fmtQty('usdc', PRICES.eth)} USDC`;
// What a transfer and a swap cost on each network, in dollars from the trackers above, charged in the currency being sent.
// The private kinds (a pool deposit `shield`, a private send `psend`, a private payment moved into the pool `pmove`) run on
// Ethereum only.
const GAS_USD = { ethereum: { send: 0.01, swap: 0.07, shield: 0.12, psend: 0.25, pmove: 0.12 }, base: { send: 0.003, swap: 0.003 }, arbitrum: { send: 0.01, swap: 0.01 }, optimism: { send: 0.002, swap: 0.002 } };
const GAS_LINE = { ethereum: '0.16 gwei', base: '0.005 gwei + L1 data', arbitrum: '0.02 gwei', optimism: '0.001 gwei' };
const GAS_UNITS = { swap: '148,000 gas', shield: '250,000 gas', psend: '520,000 gas', pmove: '255,000 gas' };
export function feeFor(kind, chain, token) {
  const usd = (GAS_USD[chain] || GAS_USD.optimism)[kind];
  const qty = usd / PRICES[token];
  const name = (CHAINS.find(c => c.id === chain) || CHAINS[0]).name;
  const amount = `${qty.toLocaleString('en-US', { maximumFractionDigits: token === 'usdc' || token === 'tpusdc' ? 3 : 7 })} ${TOKENS[token].symbol}`;
  const gasUnits = GAS_UNITS[kind] || (token === 'eth' ? '21,000 gas' : '65,000 gas');
  return { usd, qty, amount, note: usd < 0.005 ? `Under a cent on ${name}` : `About ${fmtUsd(usd)} on ${name} today`, gas: `${gasUnits} · ${GAS_LINE[chain] || GAS_LINE.optimism}` };
}
export const arrivesOn = (chain) => chain === 'ethereum' ? 'in about 15 seconds' : 'in about 2 seconds';
// Token units for the raw form the Anchor shows without descriptors: exact, from the decimal string.
export function units(qty, dec) { const [i, f = ''] = String(qty).split('.'); return (i + (f + '0'.repeat(dec)).slice(0, dec)).replace(/^0+(?=\d)/, ''); }
// Keel's rule on its own transactions, checked last (ERC-8211): the recipient's balance, or the swap's minimum.
export function sendRule(sh) { const s = TOKENS[sh.token].symbol, q = fmtQty(sh.token, sh.qty); return { intent: 'Check balance', fields: [['Balance', `${s} · ${sh.to}`], ['At least', `+${q}`]], device: [sh.to, `+${q} ${s}`], tech: `require balanceOf(${sh.to}) ≥ before + ${q} ${s}` }; }
export function swapRule(sh) { const t = TOKENS[sh.toToken].symbol, m = fmtQty(sh.toToken, sh.min); return { intent: 'Check balance', fields: [['Balance', `${t} · your account`], ['At least', `+${m}`]], device: [t, `≥ +${m}`], tech: `require balanceOf(${t}) ≥ before + ${m}` }; }
// The one step of a send or a swap, as its descriptor renders it (see STEPS): a plain transfer has no descriptor and no
// protocol, an ERC-20 transfer is the token contract's, a swap is the router's.
export function sendStep(sh) {
  const s = TOKENS[sh.token].symbol, q = fmtQty(sh.token, sh.qty);
  return { intent: 'Send', fields: [['Amount', `${q} ${s}`], ['To', sh.to]], note: sh.token === 'eth' ? 'Plain transfer · no contract' : `${s} contract · transfer`, chain: sh.chain };
}
export function swapStep(sh) {
  const s = TOKENS[sh.token].symbol, t = TOKENS[sh.toToken].symbol, q = fmtQty(sh.token, sh.qty), m = fmtQty(sh.toToken, sh.min);
  return { intent: 'Swap', fields: [['Send', `${q} ${s}`], ['Receive min.', `${m} ${t}`]], protocol: 'Uniswap · Swap Router', chain: sh.chain };
}
// What the simulation says a send or a swap changes, one asset on one account with its net change (the fee is inside
// your row, in the currency being sent); the bounds become the EIP-7906 assertions.
export function sendChanges(sh) {
  const fee = feeFor('send', sh.chain, sh.token), s = TOKENS[sh.token].symbol;
  return [
    { token: sh.token, chain: sh.chain, label: s, account: 'Your account', note: `incl. fee ≤ ${fee.amount}`, delta: `−${fmtFine(sh.token, sh.qty + fee.qty)}`, bound: 'at most' },
    { token: sh.token, chain: sh.chain, label: s, account: sh.to, delta: `+${fmtQty(sh.token, sh.qty)}`, bound: 'exactly' },
  ];
}
export function swapChanges(sh) {
  const fee = feeFor('swap', sh.chain, sh.token), s = TOKENS[sh.token].symbol, t = TOKENS[sh.toToken].symbol;
  return [
    { token: sh.token, chain: sh.chain, label: s, account: 'Your account', note: `incl. fee ≤ ${fee.amount}`, delta: `−${fmtFine(sh.token, sh.qty + fee.qty)}`, bound: 'at most' },
    { token: sh.toToken, chain: sh.chain, label: t, account: 'Your account', delta: `+${fmtQty(sh.toToken, sh.out)}`, bound: `at least +${fmtQty(sh.toToken, sh.min)}` },
  ];
}
// The receipt a send or swap gets once approved, in the shape History, Framescan and the home list read. `own` marks it
// as the wallet's (it settles on its own timer), `ops` are the balance changes applied when it confirms, `done` the toast.
export function buildOwnTx(sh, n, keyUsed, keyPlain, account) {
  const fee = feeFor(sh.kind, sh.chain, sh.token), s = TOKENS[sh.token].symbol, q = fmtQty(sh.token, sh.qty), chain = (CHAINS.find(c => c.id === sh.chain) || CHAINS[0]).name;
  const hash = '0x' + Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
  const keyNo = (keyUsed.match(/key #\d+/) || ['key'])[0];
  const feePayer = sh.token === 'eth' ? null : { addr: FEE_PAYER.addr, tag: `USDC fee payer · charged ${fee.amount}` };
  const phase1 = { n: 1, name: 'Validation & fee', ok: true, calls: [`Keystore.validate ${keyNo}`, feePayer ? `USDCFeePayer.charge ${fee.amount} · settles the gas in ETH` : `fee ${fee.amount} · paid from the account`] };
  const context = feePayer ? { sender: '0x8C4e…F21E', payer: '0x4fE1…9b2C (USDC Fee Payer)', key: keyNo, calls: 2, note: `The fee payer charged ${fee.amount} in phase 1 and settled the gas in ETH. It cannot change the calls.` } : null;
  const common = { id: `tx-${sh.kind}-${Date.now()}`, chain: sh.chain, time: `Sep 11, 14:${String(25 + n).padStart(2, '0')}`, hash, short: hash.slice(0, 6) + '…' + hash.slice(-4), sponsor: null, payer: feePayer, keyUsed, keyPlain, gas: `${fee.gas} · ${fee.amount}`, fee: fee.amount, feeNote: fee.note, validity: '10 min', lane: `Lane 2 · #${1 + n}`, metadata: `keel:${sh.kind}`, reference: '—', context, own: true, account, status: 'pending' };
  if (sh.kind === 'send') {
    const rule = sendRule(sh);
    return { ...common, title: `Sent ${q} ${s} to ${sh.to}`, kind: 'out', summary: `Sent ${q} ${s} to ${sh.to} on ${chain}.`,
      steps: [`Sent ${q} ${s} to ${sh.to}`, `Checked ${sh.to} received ${q} ${s}`], checks: '2 of 2 passed',
      phases: [phase1, { n: 2, name: 'Execution', ok: true, calls: [sh.token === 'eth' ? `send ${q} ETH to ${sh.short} · plain transfer` : `${s}.transfer(${sh.short}, ${q})`, `${rule.tech} · predicate added by Keel`] }, { n: 3, name: 'Transaction assertions', ok: true, calls: ['Keel assertions · 2 bounds'] }],
      changes: [[s, `−${fmtFine(sh.token, sh.qty + fee.qty)}`], [`${s} · ${sh.to}`, `+${q}`]], events: [`Transfer(${s}) 0x8C4e… → ${sh.short}`, 'FramePhase(1, ok) · FramePhase(2, ok) · FramePhase(3, ok)'],
      ops: [{ token: sh.token, chain: sh.chain, d: -(sh.qty + fee.qty) }], done: `Sent · ${q} ${s} to ${sh.to}` };
  }
  const t = TOKENS[sh.toToken].symbol, o = fmtQty(sh.toToken, sh.out), m = fmtQty(sh.toToken, sh.min), rule = swapRule(sh);
  return { ...common, title: `Swapped ${q} ${s} for ${o} ${t}`, kind: 'swap', summary: `Swapped ${q} ${s} for ${o} ${t} on ${chain}.`,
    steps: [`Swapped ${q} ${s} for ${o} ${t}`, `Checked you received at least ${m} ${t}`], checks: '2 of 2 passed',
    phases: [phase1, { n: 2, name: 'Execution', ok: true, calls: [`Router.swap ${q} ${s} → ${o} ${t}`, `${rule.tech} · predicate added by Keel`] }, { n: 3, name: 'Transaction assertions', ok: true, calls: ['Keel assertions · 3 bounds'] }],
    changes: [[s, `−${fmtFine(sh.token, sh.qty + fee.qty)}`], [t, `+${o}`]], events: [`Transfer(${s}) 0x8C4e… → Swap Router`, `Swap(Router) ${q} ${s} → ${o} ${t}`, 'FramePhase(1, ok) · FramePhase(2, ok) · FramePhase(3, ok)'],
    ops: [{ token: sh.token, chain: sh.chain, d: -(sh.qty + fee.qty) }, { token: sh.toToken, chain: sh.chain, d: sh.out }], done: `Swapped · ${q} ${s} for ${o} ${t}` };
}
// Applies a settled transaction's balance changes to one account's holdings: a line changes, appears, or goes when empty.
export function applyOps(list, ops) {
  const out = [...list];
  ops.forEach(op => {
    const i = out.findIndex(a => a.token === op.token && a.chain === op.chain);
    if (i < 0) { out.push(withLabels({ id: `${op.token}-${op.chain}`, token: op.token, chain: op.chain, qty: op.d, usd: op.d * PRICES[op.token], change: '0.0%', up: null })); return; }
    const a = out[i], price = a.qty > 0 ? a.usd / a.qty : PRICES[a.token], qty = Math.max(0, a.qty + op.d);
    out[i] = withLabels({ ...a, qty, usd: qty * price });
  });
  return out.filter(a => a.qty > 1e-9);
}

// ---- Privacy: a private balance, private sends and a private address (Ethereum only) ------------------------------
// The private balance is money in Privacy Pools' ETH pool on Ethereum. Adding to it is a public deposit from Main
// account, and the pool approves a deposit before it can be withdrawn privately. A private send is one EIP-8141
// transaction from a new account: the EIP-8272 recent-roots frame lets the withdrawal proof be checked in validation, a
// deploy frame creates the account at its precomputed address, the canonical paymaster pays the gas and the withdrawal
// repays it, then the calls run. The private address is an ERC-5564 meta-address listed for Main account in the ERC-6538
// registry: a payer's wallet pays a new address made from it, and Keel finds the payment with the viewing key. Every new
// account and every payment address has its own key, derived from the seed phrase, so no key on Main account's
// Keystore ever signs for them. EIP-8130 has no validation slot for the proof, so none of this runs on Base.
export const POOL = { name: 'Privacy Pools', pool: '0xf241…c9fb', entry: '0x6818…6b46' };   // the ETH pool and the entrypoint on Ethereum
export const PAYMASTER = { name: 'Canonical paymaster', addr: '0x9a1D…47e0' };
export const ANNOUNCER = '0x5564…5564';   // the ERC-5564 singleton announcer
export const REGISTRY = '0x6538…6538';    // the ERC-6538 registry
export const RECENT_ROOTS = '0x…8272';    // EIP-8272's recent-roots frame
export const ONE_TIME_KINDS = new Set(['psend', 'pmove']);   // signed by a key that exists for one address only, with Face ID alone
// Sample addresses: 40 hex digits from a seed, cased like a checksum so they read like the others in the demo.
const addrOf = (seed) => '0x' + fakeHash(seed).slice(2, 42).replace(/[a-f]/g, (c, i) => (mix(seed + i) & 1 ? c.toUpperCase() : c));
const shortOf = (addr) => addr.slice(0, 6) + '…' + addr.slice(-4);
// Your private address: a spending key and a viewing key, 33 bytes each, derived from the seed phrase.
const META = 'st:eth:0x02' + fakeHash('keel:spend').slice(2) + '03' + fakeHash('keel:view').slice(2);
export const PRIVATE_ADDR = { meta: META, short: META.slice(0, 17) + '…' + META.slice(-6), listed: 'Sep 2' };
// Payments found at your private address that are still at their own address. Each counts toward the private balance;
// moving one into the pool hides where it goes next from the person who paid.
const BOB_PAID = addrOf('stealth:sp-bob');
export const PRIVATE_IN = [
  { id: 'sp-bob', token: 'eth', chain: 'ethereum', qty: 0.25, usd: 750, from: 'bob.eth', addr: shortOf(BOB_PAID), time: 'Sep 9', txId: 'tx-priv-in' },
];

// Who receives a private send: the name, or a new address of theirs when they have a private address.
const recv = (sh) => sh.priv ? `${sh.to} · new address` : sh.to;
export function psendRule(sh) {
  const s = TOKENS[sh.token].symbol, q = fmtQty(sh.token, sh.qty);
  return { intent: 'Check balance', fields: [['Balance', `${s} · ${recv(sh)}`], ['At least', `+${q}`]], tech: `require balanceOf(${sh.priv ? 'the new address' : sh.to}) ≥ before + ${q} ${s}` };
}
// The steps as their descriptors render them: the pool's withdrawal (the fee to the paymaster is one of its fields),
// the transfer, and the announcement when the recipient has a private address. Keel's rule follows once simulated.
export function psendSteps(sh) {
  const fee = feeFor('psend', sh.chain, sh.token), s = TOKENS[sh.token].symbol;
  return [
    { intent: 'Withdraw', fields: [['Amount', `${fmtFine(sh.token, sh.qty + fee.qty)} ${s}`], ['Fee', fee.amount], ['To', 'New address']], protocol: POOL.name, chain: sh.chain },
    { intent: 'Send', fields: [['Amount', `${fmtQty(sh.token, sh.qty)} ${s}`], ['To', recv(sh)]], note: 'Plain transfer · no contract', chain: sh.chain },
    ...(sh.priv ? [{ intent: 'Announce', fields: [['For', sh.to]], protocol: 'Stealth address announcer', chain: sh.chain }] : []),
  ];
}
// Net changes only: your private balance pays the amount and the fee; the new account ends where it started, so it has no row.
export function psendChanges(sh) {
  const fee = feeFor('psend', sh.chain, sh.token), s = TOKENS[sh.token].symbol;
  return [
    { token: sh.token, chain: sh.chain, label: s, account: 'Private balance', note: `incl. fee ≤ ${fee.amount}`, delta: `−${fmtFine(sh.token, sh.qty + fee.qty)}`, bound: 'at most' },
    { token: sh.token, chain: sh.chain, label: s, account: recv(sh), delta: `+${fmtQty(sh.token, sh.qty)}`, bound: 'exactly' },
  ];
}
// A deposit from Main account, and a private payment moved into the pool: one Deposit step and Keel's check on the pool.
const depositStep = (sh, qty) => ({ intent: 'Deposit', fields: [['Amount', `${fmtFine(sh.token, qty)} ${TOKENS[sh.token].symbol}`], ['Pool', `${TOKENS[sh.token].symbol} pool`]], protocol: POOL.name, chain: sh.chain });
const depositRule = (sh, qty) => { const s = TOKENS[sh.token].symbol, q = fmtFine(sh.token, qty); return { intent: 'Check balance', fields: [['Balance', `${s} · ${POOL.name}`], ['At least', `+${q}`]], tech: `require balanceOf(${s} pool ${POOL.pool}) ≥ before + ${q} ${s}` }; };
const moved = (sh) => sh.qty - feeFor('pmove', sh.chain, sh.token).qty;   // a payment pays its own fee, so a little less arrives
export const shieldStep = (sh) => depositStep(sh, sh.qty);
export const shieldRule = (sh) => depositRule(sh, sh.qty);
export const pmoveStep = (sh) => depositStep(sh, moved(sh));
export const pmoveRule = (sh) => depositRule(sh, moved(sh));
export function shieldChanges(sh) {
  const fee = feeFor('shield', sh.chain, sh.token), s = TOKENS[sh.token].symbol;
  return [
    { token: sh.token, chain: sh.chain, label: s, account: 'Your account', note: `incl. fee ≤ ${fee.amount}`, delta: `−${fmtFine(sh.token, sh.qty + fee.qty)}`, bound: 'at most' },
    { token: sh.token, chain: sh.chain, label: s, account: 'Private balance', note: 'usable after approval', delta: `+${fmtQty(sh.token, sh.qty)}`, bound: 'exactly' },
  ];
}
export function pmoveChanges(sh) {
  const fee = feeFor('pmove', sh.chain, sh.token), s = TOKENS[sh.token].symbol;
  return [
    { token: sh.token, chain: sh.chain, label: s, account: `Payment from ${sh.from}`, note: `incl. fee ≤ ${fee.amount}`, delta: `−${fmtQty(sh.token, sh.qty)}`, bound: 'at most' },
    { token: sh.token, chain: sh.chain, label: s, account: 'Private balance', note: 'usable after approval', delta: `+${fmtFine(sh.token, moved(sh))}`, bound: 'exactly' },
  ];
}
// What a private send would need on the other transports. Framescan shows this when you view one on another network.
const BUNDLER = 'Here it would go through a bundler: an ERC-4337 user operation with a paymaster that takes its fee from the withdrawal. That is the path Kohaku uses today.';
export const PSEND_NETS = {
  base: 'This can’t run on Base. EIP-8130’s validation has no slot for the withdrawal proof, and a payer has to sign by name, so a named relayer would have to send it.',
  arbitrum: BUNDLER, optimism: BUNDLER,
};

// The receipt for a private transaction, in the shape History, the Private tab and Framescan read (see buildOwnTx).
// A deposit is Main account's own transaction, so both histories list it (`priv`). A private send and a moved payment
// come from addresses nothing ties to you (`private`), so only the Private tab lists them. Framescan shows what anyone
// can see: a new account, the pool, a paymaster, the amounts. `wait` is the deposit the pool still has to approve and
// `spends` the found payment a move uses up; both land when the transaction confirms.
export function buildPrivTx(sh, n, keyUsed, keyPlain, seed = String(Date.now())) {
  const fee = feeFor(sh.kind, sh.chain, sh.token), s = TOKENS[sh.token].symbol, q = fmtQty(sh.token, sh.qty);
  const hash = fakeHash(`${sh.kind}:${seed}`);
  const phases = (list) => list.map(([name, calls], i) => ({ n: i + 1, name, ok: true, calls }));
  const framed = (k) => Array.from({ length: k }, (_, i) => `FramePhase(${i + 1}, ok)`).join(' · ');
  const common = { id: `tx-${sh.kind}-${seed}`, chain: sh.chain, time: `Sep 11, 14:${String(25 + n).padStart(2, '0')}`, hash, short: hash.slice(0, 6) + '…' + hash.slice(-4), sponsor: null, gas: `${fee.gas} · ${fee.amount}`, fee: fee.amount, feeNote: fee.note, validity: '10 min', reference: '—', context: null, own: true, status: 'pending', checks: '2 of 2 passed' };
  if (sh.kind === 'shield') {
    const rule = shieldRule(sh), keyNo = (String(keyUsed).match(/key #\d+/) || ['key'])[0];
    return { ...common, account: 'main', priv: true, kind: 'shield', title: `Added ${q} ${s} to private balance`, sub: 'Public deposit', keyUsed, keyPlain, payer: null, lane: `Lane 2 · #${1 + n}`, metadata: 'keel:deposit',
      steps: [`Deposited ${q} ${s} into ${POOL.name} from Main account`, `Checked the pool received ${q} ${s}`],
      phases: phases([['Validation & fee', [`Keystore.validate ${keyNo}`, `fee ${fee.amount} · paid from the account`]], ['Execution', [`Entrypoint.deposit ${q} ${s} → ${s} pool ${POOL.pool} · new commitment`, `${rule.tech} · predicate added by Keel`]], ['Transaction assertions', ['Keel assertions · 2 bounds']]]),
      changes: [[s, `−${fmtFine(sh.token, sh.qty + fee.qty)}`], [`${s} · ${POOL.name}`, `+${q}`]],
      events: [`Deposited(${s} pool, 0x8C4e…, ${q} ${s}, commitment ${fakeHex(hash + ':c')})`, framed(3)],
      ops: [{ token: sh.token, chain: sh.chain, d: -(sh.qty + fee.qty) }],
      wait: { id: 'w-' + seed, token: sh.token, chain: sh.chain, qty: sh.qty, usd: sh.qty * PRICES[sh.token], from: 'Main account' },
      done: `Added · ${q} ${s} waits for the pool to approve it` };
  }
  if (sh.kind === 'pmove') {
    const net = moved(sh), m = fmtFine(sh.token, net), rule = pmoveRule(sh), from = addrOf('stealth:' + sh.paymentId);
    return { ...common, account: 'private', private: true, kind: 'move', title: `Moved ${q} ${s} into private balance`, sub: `From ${sh.from}’s payment`,
      from: { addr: from, name: 'Payment address', alone: true }, payer: { addr: sh.addr, tag: 'Self · paid from the payment' },
      keyUsed: `payment key of ${sh.addr} · secp256k1`, keyPlain: 'Face ID · payment key', lane: 'Lane 0 · #0', metadata: '—',
      steps: [`Deposited ${m} ${s} from ${sh.from}’s payment into ${POOL.name}`, `Paid the ${fee.amount} fee from the payment`, `Checked the pool received ${m} ${s}`],
      phases: phases([['Validation & fee', ['Default account code · signed by the payment key', `fee ${fee.amount} · paid from the payment`]], ['Execution', [`Entrypoint.deposit ${m} ${s} → ${s} pool · new commitment`, `${rule.tech} · predicate added by Keel`]], ['Transaction assertions', ['Keel assertions · 2 bounds']]]),
      changes: [[`${s} · ${sh.addr}`, `−${q}`], [`${s} · ${POOL.name}`, `+${m}`]],
      events: [`Deposited(${s} pool, ${sh.addr}, ${m} ${s}, commitment ${fakeHex(hash + ':c')})`, framed(3)],
      ops: [], spends: sh.paymentId,
      wait: { id: 'w-' + seed, token: sh.token, chain: sh.chain, qty: net, usd: net * PRICES[sh.token], from: `${sh.from}’s payment` },
      done: `Moved · ${m} ${s} waits for the pool to approve it` };
  }
  // A private send, from a new account that exists for this one transaction.
  const acct = addrOf('acct:' + seed), to = sh.priv ? shortOf(addrOf('to:' + seed)) : sh.short, rule = psendRule(sh), w = fmtFine(sh.token, sh.qty + fee.qty);
  const tag = '0x' + fakeHash('tag:' + seed).slice(2, 4);
  return { ...common, account: 'private', private: true, kind: 'out', title: `Sent ${q} ${s} privately to ${sh.to}`, sub: 'From a new address',
    from: { addr: acct, name: 'New account', alone: true }, payer: { addr: PAYMASTER.addr, tag: `Canonical paymaster · repaid ${fee.amount} from the withdrawal` },
    keyUsed: `key #1 of ${shortOf(acct)} · secp256k1 · one-time`, keyPlain: 'Face ID · one-time key', lane: 'Lane 0 · #0', metadata: '—',
    extra: [['Sent from', `A new address, ${shortOf(acct)}`]],
    steps: [`Withdrew ${w} ${s} from your private balance to a new address`, `Paid the ${fee.amount} fee from it`, sh.priv ? `Sent ${q} ${s} to a new address only ${sh.to} can find` : `Sent ${q} ${s} to ${sh.to}`, `Checked ${sh.priv ? 'that address' : sh.to} received ${q} ${s}`],
    phases: phases([
      ['Proof check', [`Recent-roots frame ${RECENT_ROOTS} · the pool root in the proof is recent`, 'Withdrawal proof checked against that root']],
      ['Deploy', [`Account created at ${shortOf(acct)} · its precomputed address`, 'Same code as every account · one key, no other rows']],
      ['Validation & fee', ['Keystore.validate key #1 · one-time key', `${PAYMASTER.name} pays the gas · the withdrawal repays ${fee.amount}`]],
      ['Execution', [`PrivacyPool.withdraw ${w} ${s} → ${shortOf(acct)} · fee ${fee.amount} → paymaster`, `send ${q} ${s} to ${to} · plain transfer`, ...(sh.priv ? [`Announcer.announce(1, ${to}, ephemeral key, view tag ${tag})`] : []), `${rule.tech} · predicate added by Keel`]],
      ['Transaction assertions', ['Keel assertions · 2 bounds']],
    ]),
    changes: [[`${s} · ${POOL.name}`, `−${w}`], [`${s} · ${sh.priv ? to : sh.to}`, `+${q}`], [`${s} · paymaster`, `+${fmtFine(sh.token, fee.qty)}`]],
    events: [`Withdrawn(${s} pool, ${w} ${s}, nullifier ${fakeHex(seed + ':n')})`, `Transfer(${s}) ${shortOf(acct)} → ${to}`, ...(sh.priv ? [`Announcement(1, ${to}, ${fakeHex(seed + ':e')}, view tag ${tag})`] : []), framed(5)],
    nets: PSEND_NETS,
    ops: [{ token: sh.token, chain: sh.chain, d: -(sh.qty + fee.qty) }],
    done: `Sent privately · ${q} ${s} to ${sh.to}` };
}
// History: the deposit that funded the private balance (Main account's, so both histories list it), and a payment bob.eth
// made to your private address (only the Private tab lists it). Framescan also carries a private send as a sample.
export const TX_SHIELD_0 = { id: 'tx-shield-0', title: 'Added 1.5 ETH to private balance', kind: 'shield', priv: true, sub: 'Public deposit', chain: 'ethereum', time: 'Sep 5, 10:12', hash: fakeHash('shield-0'), short: shortOf(fakeHash('shield-0')), sponsor: null, payer: null, keyUsed: 'iPhone 16 Pro · key #1 · passkey', keyPlain: 'Face ID on iPhone 16 Pro', gas: '250,000 gas · 0.16 gwei · 0.00004 ETH', fee: '0.00004 ETH', feeNote: 'About $0.12 on Ethereum', validity: '10 min', lane: 'Lane 0 · #39', metadata: 'keel:deposit', reference: '—',
  steps: ['Deposited 1.5 ETH into Privacy Pools from Main account', 'Checked the pool received 1.5 ETH', 'Approved by the pool · ready to send privately'], checks: '2 of 2 passed',
  phases: [{ n: 1, name: 'Validation & fee', ok: true, calls: ['Keystore.validate key #1', 'fee 0.00004 ETH · paid from the account'] }, { n: 2, name: 'Execution', ok: true, calls: [`Entrypoint.deposit 1.5 ETH → ETH pool ${POOL.pool} · new commitment`, `require balanceOf(ETH pool ${POOL.pool}) ≥ before + 1.5 ETH · predicate added by Keel`] }, { n: 3, name: 'Transaction assertions', ok: true, calls: ['Keel assertions · 2 bounds'] }],
  changes: [['ETH', '−1.50004'], ['ETH · Privacy Pools', '+1.5']], events: [`Deposited(ETH pool, 0x8C4e…, 1.5 ETH, commitment ${fakeHex('shield-0:c')})`, 'FramePhase(1, ok) · FramePhase(2, ok) · FramePhase(3, ok)'], context: null };
export const TX_PRIV_IN = { id: 'tx-priv-in', title: 'Received 0.25 ETH privately', kind: 'in', private: true, sub: 'From bob.eth · to a new address', chain: 'ethereum', time: 'Sep 9, 11:20', hash: fakeHash('priv-in'), short: shortOf(fakeHash('priv-in')), sponsor: null,
  from: { addr: '0x91aC3e57B02d4F81c6A9e0D2b7F15c8a4E3d7f02', name: 'bob.eth', alone: true }, payer: { addr: '0x91aC…7f02', tag: 'bob.eth · paid its own fee' }, keyUsed: 'bob.eth’s own key', keyPlain: '—', gas: '53,200 gas · 0.16 gwei · 0.0000085 ETH', fee: '—', validity: '—', lane: '—', metadata: '—', reference: '—',
  extra: [['Paid to', `A new address, ${shortOf(BOB_PAID)}`], ['Found with', 'Your viewing key']],
  summary: 'bob.eth paid a new address that only you can find. Keel found the payment with your viewing key.', steps: [], checks: '—',
  phases: [{ n: 1, name: 'Validation & fee', ok: true, calls: ['bob.eth · its own key · fee paid by bob.eth'] }, { n: 2, name: 'Execution', ok: true, calls: [`send 0.25 ETH to ${shortOf(BOB_PAID)} · plain transfer`, `Announcer.announce(1, ${shortOf(BOB_PAID)}, ephemeral key, view tag 0x3a)`] }],
  changes: [['ETH · bob.eth', '−0.2500085'], [`ETH · ${shortOf(BOB_PAID)}`, '+0.25']], events: [`Transfer(ETH) 0x91aC… → ${shortOf(BOB_PAID)}`, `Announcement(1, ${shortOf(BOB_PAID)}, ${fakeHex('priv-in:e')}, view tag 0x3a)`], context: null };
const { status: _pending, own: _own, ...PSEND_SAMPLE } = buildPrivTx({ kind: 'psend', token: 'eth', chain: 'ethereum', qty: 0.2, to: 'alice.eth', short: '0x2B7a…c41E', priv: true }, 0, '', '', 'sample');
export const TX_PSEND_SAMPLE = { ...PSEND_SAMPLE, time: 'Sep 10, 16:40' };

export const TX_BATCH = {
  id: 'tx-batch', title: 'Swap & deposit', app: 'Tidepool', kind: 'batch', chain: 'ethereum', time: 'Sep 11, 14:12', hash: '0x5d2a91f0c3b8e7a24f16d9c05b3e8a71d2f4c6b9e08a1c37f5d2b64e9c47e8e13',
  short: '0x5d2a…8e13', sponsor: null, payer: { addr: FEE_PAYER.addr, tag: 'USDC fee payer · charged 0.09 USDC' }, keyUsed: 'iPhone 16 Pro · key #1 · passkey', keyPlain: 'Face ID on iPhone 16 Pro', gas: '212,410 gas · 0.16 gwei · 0.000034 ETH', fee: '0.09 USDC', feeNote: 'Taken in USDC · about $0.09 on Ethereum today', validity: '14:02 – 14:12 UTC', lane: 'Lane 2 · #0', metadata: 'tidepool:deposit:8812', reference: 'Tidepool deposit #8812',
  summary: 'Spent 1,000.09 USDC (including the 0.09 USDC network fee), received 0.3187 ETH and put it into ETH Vault. Tipped 0.005 ETH.',
  steps: ['Checked you had at least 1,000 USDC', 'Swapped 1,000 USDC for 0.3187 ETH', 'Put 0.3187 ETH into ETH Vault', 'Tipped 0.005 ETH to tips.tidepool.eth', 'Checked you received at least 0.312 tpETH'],
  checks: '5 of 5 passed',
  phases: [
    { n: 1, name: 'Validation & fee', ok: true, calls: ['Keystore.validate key #1', 'USDCFeePayer.charge 0.09 USDC · settles 0.000034 ETH of gas'] },
    { n: 2, name: 'Execution', ok: true, calls: ['check USDC balance ≥ 1,000 · no call', 'Router.swap 1,000 USDC → 0.3187 ETH · saved as $swapOut', 'ETHVault.deposit $swapOut = 0.3187 ETH → 0.3169 tpETH', 'send 0.005 ETH to tips.tidepool.eth · plain transfer', 'require balanceOf(tpETH) ≥ before + 0.312 · predicate added by Keel'] },
    { n: 3, name: 'Transaction assertions', ok: true, calls: ['Keel guardrails · 3 rules', 'Tidepool check · 1 rule', 'Sentinel check · 1 rule'] },
  ],
  changes: [['USDC', '−1,000.09'], ['ETH', '−0.005'], ['tpETH', '+0.3169'], ['ETH · tips.tidepool.eth', '+0.005']],
  events: ['Transfer(USDC) 0x8C4e… → Router', 'Swap(Router) 1,000 USDC → 0.3187 ETH', 'Deposit(ETHVault) 0.3187 ETH → 0.3169 tpETH', 'FramePhase(1, ok) · FramePhase(2, ok) · FramePhase(3, ok)', 'FeePaid(0x4fE1…9b2C, 0.09 USDC → 0.000034 ETH)'],
  context: { sender: '0x8C4e…F21E', payer: '0x4fE1…9b2C (USDC Fee Payer)', key: '#1 · passkey · send, gas, lanes · policy $1,000 a day', calls: 5, note: 'The fee payer read this context in phase 1, charged 0.09 USDC and settled the gas in ETH. It cannot change the calls or the gas.' },
};

export const TX_XCHAIN = {
  id: 'tx-xchain', title: 'Bridge & deposit', app: 'Tidepool', kind: 'xchain', chain: 'base', time: 'Sep 11, 14:20', hash: '0x9e40b2d7…1a3c', short: '0x9e40…1a3c', sponsor: null, payer: { addr: FEE_PAYER.addr, tag: 'USDC fee payer · charged 0.02 USDC' }, keyUsed: 'iPhone 16 Pro · key #1 · passkey', keyPlain: 'Face ID on iPhone 16 Pro', gas: 'Base: 71,300 gas · Arbitrum: pending', fee: '0.02 USDC', feeNote: 'Taken on Base · covers Arbitrum too', validity: '24 hours', lane: 'Base lane 0 · #12', metadata: 'tidepool:bridge:2201', reference: 'Tidepool bridge #2201',
  summary: 'Sent 2,000 USDC from Base to the bridge. On Arbitrum, the deposit into USDC Vault runs by itself once the money arrives.',
  steps: ['Base: sent 2,000 USDC to the bridge', 'Arbitrum: waiting for the money (up to 24 hours)', 'Arbitrum: then puts all of it into USDC Vault', 'Arbitrum: then checks you received at least 2,000 tpUSDC'],
  checks: 'Base passed · Arbitrum pending',
  phases: [
    { n: 1, name: 'Base · validation & fee', ok: true, calls: ['Keystore.validate key #1', 'USDCFeePayer.charge 0.02 USDC · covers both networks'] },
    { n: 2, name: 'Base · execution', ok: true, calls: ['Bridge.send 2,000 USDC → Arbitrum'] },
    { n: 3, name: 'Arbitrum · waiting', ok: null, calls: ['check USDC balance ≥ 2,000 · not yet', 'USDCVault.deposit all USDC · runs when the check passes', 'require balanceOf(tpUSDC) ≥ before + 2,000 · predicate added by Keel'] },
  ],
  changes: [['USDC (Base)', '−2,000.02'], ['tpUSDC (Arbitrum)', 'pending +2,000.00']],
  events: ['Transfer(USDC) 0x8C4e… → Bridge', 'CrossChainProgram(0x9e40…, chains: base, arbitrum)'],
  context: { sender: '0x8C4e…F21E', payer: '0x4fE1…9b2C (USDC Fee Payer)', key: '#1 · passkey', calls: 1, note: 'The Arbitrum part carries the same signature. It executes only when the balance condition is met.' },
};

// A claim the network undid. The test run showed rewards coming in. When it ran for real, the rewards contract also moved
// the account's tpETH. No assertion named tpETH, so the last one ("nothing else changes") failed and EIP-7906 reverted
// the whole execution. The transaction is still in a block and its fee is paid. Steps may carry `ok: false`.
export const TX_CLAIM = {
  id: 'tx-claim', title: 'Claim rewards', app: 'Tidepool', kind: 'claim', chain: 'ethereum', time: 'Sep 11, 14:12', hash: '0x3e71c0a94b2f8d17e65a0c3b9f41d82e7a6c05b1d93f4e28c7a16b0e5f29d45b',
  short: '0x3e71…d45b', sponsor: null, keyUsed: 'Anchor hardware wallet · key #2', keyPlain: 'Anchor hardware wallet', gas: '95,200 gas · 0.16 gwei · 0.000015 ETH', fee: '0.000015 ETH', feeNote: 'About $0.05 on Ethereum today · paid even though the claim was undone', validity: '14:02 – 14:12 UTC', lane: 'Lane 2 · #0', metadata: 'tidepool:claim:3307', reference: 'Tidepool rewards claim',
  summary: 'The claim also tried to move 0.3169 tpETH out of your account. No assertion allowed that, so the network undid the whole claim. Only the network fee was paid.',
  steps: [{ text: 'Tried to move your 0.3169 tpETH as well', ok: false }, 'No assertion allowed that, so the network undid the whole claim', 'Your tpETH is still in your account', 'Paid the 0.000015 ETH network fee'],
  checks: 'Failed · tpETH moved',
  phases: [
    { n: 1, name: 'Validation & fee', ok: true, calls: ['Keystore.validate key #2 · Anchor', 'fee 0.000015 ETH from your account · stays paid'] },
    { n: 2, name: 'Execution', ok: false, calls: ['ETHVault.claimRewards() · 18.40 USDC to you', 'also moved 0.3169 tpETH to 0xBad1…9e0f', 'require balanceOf(USDC) ≥ before + 18.40 · predicate added by Keel', 'rolled back when the outcome check failed'] },
    { n: 3, name: 'Transaction assertions', ok: false, calls: ['USDC · you · at least +18.40 · passed', 'nothing else changes · failed: a tpETH Transfer from you that no assertion names', 'EIP-7906 reverted the execution · the transaction stays in the block'] },
  ],
  changes: [['ETH', '−0.000015']],
  events: ['None · the execution was reverted, so its events are gone'],
};

export const TX_STUCK = { id: 'tx-stuck', title: 'Sent 0.2 ETH to alice.eth', kind: 'out', status: 'stuck', why: 'fee too low', chain: 'ethereum', time: 'Sep 11, 09:02', hash: '0x4c9e17…b2d0', short: '0x4c9e…b2d0', sponsor: null, keyUsed: 'iPhone 16 Pro · key #1', keyPlain: 'Face ID on iPhone 16 Pro', gas: '21,000 gas · 0.03 gwei · 0.0000006 ETH', fee: '0.0000006 ETH · under a cent', feeNote: 'Set at 0.03 gwei against a 0.11 gwei base fee', validity: '—', lane: 'Lane 0 · #41', metadata: '—', reference: '—', summary: 'The network hasn’t picked this payment up because the fee was set too low. Your other payments keep going while it waits.', steps: ['Signed on this phone', 'Waiting for the network · fee too low'], checks: '—', phases: [], changes: [['ETH', '−0.2 · waiting'], ['ETH · alice.eth', '+0.2 · waiting']], events: [], context: null };

export const TX_HISTORY = [
  TX_STUCK,
  TX_PRIV_IN,
  TX_SHIELD_0,
  { id: 'tx-key', title: 'Added Anchor hardware wallet', kind: 'key', chain: '4 chains', time: 'Sep 4, 09:15', hash: '0x8b1c4e…20fa', short: '0x8b1c…20fa', sponsor: null, keyUsed: 'iPhone 16 Pro · key #1', keyPlain: 'Face ID on iPhone 16 Pro', gas: '61,200 gas · 0.16 gwei · 0.000010 ETH', fee: 'About $0.03 in all', feeNote: 'Cents on Ethereum, under a cent on each other network', validity: '—', lane: 'Lane 0 · #38', metadata: 'keel:key-add', reference: '—', summary: 'Added Anchor hardware wallet with full access, on Ethereum, Base, Arbitrum and Optimism.', steps: ['One approval, four networks'], checks: '—',
    phases: [{ n: 1, name: 'Validation', ok: true, calls: ['Keystore.validate key #1'] }, { n: 2, name: 'Execution', ok: true, calls: ['Keystore.addKey(#2, P-256, admin) · one signature, four chains'] }], changes: [], events: ['KeyAdded(0x8C4e…, #2, P-256, flags: admin, send, gas)'], context: { sender: '0x8C4e…F21E', payer: '0x8C4e…F21E (self)', key: '#1 · passkey · admin', calls: 1, note: 'Each chain verified only its own entry of the cross-chain key change.' } },
  { id: 'tx-in', title: 'Received 2,000 USDC', kind: 'in', chain: 'base', time: 'Sep 3, 18:40', hash: '0x2f7a…c901', short: '0x2f7a…c901', sponsor: null, keyUsed: '—', keyPlain: '—', gas: '—', fee: '—', validity: '—', lane: '—', metadata: '—', reference: '—', summary: 'Received on Base before the account was even live there. Your address was already yours.', steps: [], checks: '—', phases: [], changes: [['USDC (Base)', '+2,000.00']], events: ['Transfer(USDC) 0xB0b… → 0x8C4e…'], context: null },
];

// The grant's receipt: the signed Keystore batch, relayed and paid by the app's session account. Anyone may relay it;
// authorization is the admin signature inside the batch.
export function buildSessionTx(s, keyUsed, keyPlain) {
  const n = s.perms.length, hash = fakeHash('grant:' + s.id), keyNo = (String(keyUsed).match(/key #\d+/) || ['admin key'])[0];
  const net = (CHAINS.find(c => c.id === s.chain) || CHAINS[0]).name;
  return { id: `tx-grant-${s.id}`, title: `Gave ${s.app} access`, app: s.app, kind: 'key', chain: s.chain, time: 'Sep 11, 14:05', hash, short: hash.slice(0, 6) + '…' + hash.slice(-4), sponsor: null, from: s.to, payer: { addr: s.to.short, tag: `${s.to.name} · relayed and paid` }, keyUsed, keyPlain, gas: `${(41000 + 24000 * n).toLocaleString('en-US')} gas · 0.16 gwei`, fee: `Paid by ${s.app}`, feeNote: `${s.to.name} relayed the signed change and paid the gas`, validity: '—', lane: 'Keystore · local channel · sequenced', metadata: `erc7715:${s.app.toLowerCase()}`, reference: `${s.app} · ${s.what}`,
    summary: `Gave ${s.to.name} ${n} permission${n === 1 ? '' : 's'} on ${net}, until ${s.expiry}.`,
    steps: [...s.perms.map(p => `Allowed: ${permText(p).title}`), `Until ${s.expiryAt}`, 'Checked nothing else changed'], checks: '2 of 2 passed',
    phases: [
      { n: 1, name: 'Validation', ok: true, calls: [`Keystore.validate ${s.to.name} (sender) · pays its own gas`] },
      { n: 2, name: 'Execution', ok: true, calls: [`Keystore.applySignedAccountChanges(${ACCOUNTS.main.short}, batch · local · seq 4 · signed by ${keyNo})`, ...s.perms.map(p => `AuthorizeActor(slot ${p.slot} · ${p.policy.name} · ${p.commitment})`), `${KEEL_RULES.change.tech} · predicate added by Keel`] },
      { n: 3, name: 'Transaction assertions', ok: true, calls: [`Keel assertions · keys +${n}, balances unchanged`] },
    ],
    changes: [], events: s.perms.map(p => `ActorAuthorized(${ACCOUNTS.main.short}, slot ${p.slot} · ${s.to.short}, EXTERNAL_POLICY, POLICY, expiry ${s.expiry}, ${POLICY_MANAGER.short} ‖ ${p.commitment})`),
    context: { sender: s.to.short, payer: `${s.to.short} (${s.to.name})`, key: `${s.to.name} · its own key`, calls: 1, note: 'The app relayed the batch. Authorization comes from the signature inside it, not from the sender.' } };
}
// A redeem's receipt: the session account called the policy manager, which checked the slot and drove the account.
export function buildRedeemTx(s, p, amount, n) {
  const t = permText(p), symb = TOKENS[p.token].symbol, q = fmtQty(p.token, amount), hash = fakeHash(`redeem:${s.id}:${p.id}:${n}`);
  const target = (s.perms.find(x => x.kind === 'call') || {}).target || s.to.name;
  const call = p.token === 'eth' ? `send ${q} ETH to ${target}` : `${symb}.transfer(${target}, ${q})`;
  // Through the Vault Manager the money is deposited for you (tpETH comes back); a charge just leaves.
  const deposit = target === VAULT_MANAGER.name;
  const gained = fmtQty('tpeth', amount * PRICES[p.token] / PRICES.tpeth);
  return { id: `tx-redeem-${n}`, title: `${s.app} ${deposit ? 'used' : 'charged'} ${q} ${symb}`, app: s.app, kind: 'app', chain: s.chain, time: `Sep 11, 14:${String(10 + n).padStart(2, '0')}`, hash, short: hash.slice(0, 6) + '…' + hash.slice(-4), sponsor: null, from: s.to, payer: { addr: s.to.short, tag: `${s.to.name} · sent and paid` }, keyUsed: `${s.to.name} · slot ${p.slot} · ${p.policy.name}`, keyPlain: `${s.app}, within the permission you gave`, gas: `${p.token === 'eth' ? '96,400' : '118,200'} gas · 0.16 gwei`, fee: `Paid by ${s.app}`, feeNote: 'The app’s session account sent the transaction', validity: '—', lane: `${s.to.name} · lane 0`, metadata: `erc7710:redeem:${p.slot}`, reference: `${s.app} · ${s.what}`,
    summary: `${s.to.name} used its permission “${t.title}” for ${q} ${symb} through ${POLICY_MANAGER.name}.`,
    steps: [`${s.app} asked to use ${q} ${symb}`, `${POLICY_MANAGER.name} checked the permission (slot ${p.slot})`, `Your account sent ${q} ${symb} to ${target}`, ...(s.rule ? [`Checked: your tpETH balance held (${s.rule.short.replace('drops', 'didn’t drop')})`] : [])], checks: s.rule ? '2 of 2 passed' : '1 of 1 passed',
    phases: [
      { n: 1, name: 'Validation', ok: true, calls: [`Keystore.validate ${s.to.name} (sender) · pays its own gas`] },
      { n: 2, name: 'Execution', ok: true, calls: [`PolicyManager.redeemDelegations([${p.context}], [single], [${call}])`, `Keystore.getActorWithPolicy(${ACCOUNTS.main.short}, slot ${p.slot}) → live · manager ok · commitment ${p.commitment} matches`, `${p.policy.name}.onExecute → within the limit`, `Account.executeBatch([${call}])`] },
      { n: 3, name: 'Transaction assertions', ok: true, calls: [s.rule ? s.rule.tech : 'no rule on this grant'] },
    ],
    changes: [[symb, `−${q}`], ...(deposit ? [['tpETH', `+${gained}`]] : [])], events: [`PolicyExecuted(${ACCOUNTS.main.short}, ${p.policy.name}, ${p.commitment}, caller ${s.to.short})`, `Transfer(${symb}) ${ACCOUNTS.main.short} → ${target}`, ...(deposit ? [`Deposit(ETHVault) → +${gained} tpETH`] : [])],
    context: { sender: s.to.short, payer: `${s.to.short} (${s.to.name})`, key: `slot ${p.slot} · POLICY · ${p.policy.name}`, calls: 1, note: 'The manager read the slot’s commitment from the Keystore and re-hashed the binding the app supplied. They matched, so the policy ran.' } };
}

// The kinds of key the add sheet offers. Protection is not a kind: any of these can be added with a co-signer.
// `pick` is the icon on the type list when it differs from the icon the key itself gets.
export const KEY_TYPES = [
  { id: 'passkey', name: 'Passkey', sub: 'Face ID or Touch ID on a phone or computer', icon: 'laptop', pick: 'key', device: 'MacBook Pro (Touch ID)', tech: 'Passkey · P-256' },
  { id: 'hardware', name: 'Hardware wallet', sub: 'Shows guarantees on its own screen', icon: 'device', device: 'Anchor hardware wallet #2', tech: 'Secure element · P-256' },
  { id: 'quantum', name: 'Quantum-safe key', sub: 'Keel makes it and keeps it · ready before it is live', icon: 'shield', device: 'Quantum-safe key', tech: 'SPHINCS+ · made by Keel' },
  { id: 'seed', name: 'Seed phrase', sub: 'Your seed phrase, or a new one you write down', icon: 'book', device: 'Seed phrase', tech: 'secp256k1 · seed-derived' },
  { id: 'account', name: 'Another account', sub: 'Let an account you control act for this one', icon: 'wallet', device: 'Treasury account', tech: 'Account as a key' },
  { id: 'multisig', name: 'Multisig', sub: 'Several of your keys must agree', icon: 'set', device: 'Multisig', tech: 'Threshold set' },
];

// How a key signs. Passkeys are always P-256 (the phone keeps them); a phrase or a hardware wallet can produce
// either an ECDSA key or a SPHINCS+ one, the hash-based post-quantum scheme EVM accounts are expected to use.
export const ALGOS = [
  { id: 'ecdsa', name: 'ECDSA', tech: 'secp256k1' },
  { id: 'sphincs', name: 'SPHINCS+', tech: 'SPHINCS+-SHA2-128s' },
];
// Where a new phrase- or device-backed key comes from. The phrase sources apply to the "Seed phrase" type.
export const KEY_SOURCES = [
  { id: 'own', name: 'Your seed phrase', sub: 'Already written down · nothing new to keep', icon: 'book' },
  { id: 'new', name: 'A new phrase', sub: '12 words shown once, then checked', icon: 'plus' },
];

// What a new key is called and how it is backed up, from the add-key sheet's choices (type, algorithm, source).
export function describeKey(sh) {
  const t = KEY_TYPES.find(k => k.id === sh.keyType) || KEY_TYPES.find(k => k.id === sh.preset) || KEY_TYPES[0];
  const algo = ALGOS.find(a => a.id === (sh.algo || 'ecdsa')) || ALGOS[0];
  // A quantum-safe key Keel makes itself is always SPHINCS+; a passkey is the phone's own when the account has none yet.
  const quantum = t.id === 'quantum';
  const pq = quantum || algo.id === 'sphincs';
  const source = t.id === 'hardware' ? 'hardware' : t.id === 'seed' ? (sh.source || 'own') : quantum ? 'wallet' : null;
  const from = { own: 'From your seed phrase', new: 'From a new phrase', hardware: 'Kept by Anchor', wallet: 'Made by Keel' }[source];
  const phone = t.id === 'passkey' && sh.phone;
  const name = t.id === 'seed' ? (pq ? 'Quantum-safe key' : source === 'new' ? 'Seed phrase B' : 'Phrase key')
    : t.id === 'hardware' ? (pq ? 'Anchor quantum-safe key' : t.device) : phone ? 'iPhone 16 Pro' : t.device;
  const tech = t.id === 'seed' ? `${algo.tech} · ${source === 'new' ? 'new seed' : 'seed-derived'}`
    : t.id === 'hardware' ? `${algo.tech} · secure element` : t.tech;
  const set = t.id === 'multisig';
  const type = set ? `${sh.threshold || 2} of ${(sh.members || []).length || 2} must approve` : pq && from ? from : phone ? 'Face ID' : t.name;
  // Protection sits on top of any type: the co-signer that checks what the key signs, if the user turned it on.
  const prov = sh.protect ? providerById(sh.provider) : null;
  return { t, algo: quantum ? ALGOS.find(a => a.id === 'sphincs') || algo : algo, pq, source, from, name, type, tech, icon: pq ? 'shield' : phone ? 'phone' : t.icon, set, prov };
}

// First-time setup: the three ways to secure a new account, and the sample phrase the demo "generates".
export const SETUP_METHODS = [
  { id: 'passkey', name: 'Face ID', sub: 'Recommended · nothing to write down', icon: 'face', tech: 'Passkey · P-256 · created in the Secure Enclave' },
  { id: 'phrase', name: 'Seed phrase', sub: '12 words you write down and keep safe', icon: 'book', tech: 'BIP-39 phrase → master key (secp256k1 by default; the path can select P-256 or post-quantum)' },
  { id: 'hardware', name: 'Hardware wallet', sub: 'A separate device with its own screen', icon: 'device', tech: 'Secure element · P-256 · the key never leaves the device' },
];
export const SETUP_PHRASE = ['harbor', 'garden', 'maple', 'canvas', 'wisdom', 'silver', 'mirror', 'planet', 'forest', 'coffee', 'ripple', 'acoustic'];
// Which words the wallet asks back, and the decoys shown next to the right one.
export const SETUP_CHECKS = [
  { n: 4, options: ['silver', 'canvas', 'planet', 'harbor'] },
  { n: 9, options: ['forest', 'coffee', 'garden', 'mirror'] },
];
// The phrase the demo "generates" when a key is added from a new phrase, and the words it asks back.
export const KEY_PHRASE = ['orbit', 'meadow', 'lantern', 'timber', 'velvet', 'copper', 'summit', 'pebble', 'willow', 'ember', 'quartz', 'haven'];
export const KEY_PHRASE_CHECKS = [
  { n: 3, options: ['timber', 'lantern', 'ember', 'orbit'] },
  { n: 10, options: ['willow', 'quartz', 'ember', 'copper'] },
];

const W = { skin: 'keel', onboarded: true, accountId: 'main', settingsPage: null };
const APP = (dappPage, sheet, extra = {}) => ({ ...W, screen: 'home', browserTab: 'tidepool', dappPage, signedIn: true, sheet, ...extra });
const HW = (dappPage, sheet, extra = {}) => ({ ...W, screen: 'home', browserTab: 'tidepool', dappPage, signedIn: true, signer: 'k2', sheet, hw: { active: true, page: 0 }, hwRaw: false, ...extra });

export const FEATURES = [
  { title: 'Keys and identity', items: [
    { id: 'one-address', name: 'One address, many keys', eips: ['EIP-8130'], text: 'Add or remove keys at any time. The address never changes and funds never move.', route: { ...W, screen: 'keys' } },
    { id: 'key-types', name: 'Multiple key types', eips: ['EIP-8130', 'EIP-8141'], text: 'secp256k1, P-256 and passkeys all sign, mixed in one account. The wallet says “Face ID”, the explorer says “P-256”.', route: { ...W, screen: 'keys' } },
    { id: 'pq', name: 'Post-quantum key rotation', eips: ['EIP-8130', 'EIP-8141'], text: 'Add a SPHINCS+ key from your phrase, a new phrase or a hardware wallet. Same address, no migration.', route: { ...W, screen: 'keys', sheet: { kind: 'addKey', preset: 'seed', algo: 'sphincs', step: 2 } } },
    { id: 'delegation', name: 'Cross-account delegation', eips: ['EIP-8130'], text: 'Account A lists account B as one of its keys, within limits A sets.', route: { ...W, accountId: 'sub', screen: 'keys' } },
    { id: 'spend-limit', name: 'Spend limit on a key', eips: ['EIP-8130'], text: 'A key can carry a dollar cap per day, week and month, across ETH and every token. The network forces the key through a policy contract that prices each transfer with Chainlink feeds and refuses anything over the cap.', route: { ...W, screen: 'keys', sheet: { kind: 'addKey', preset: 'passkey', step: 2, limit: true } } },
    { id: 'expiry', name: 'Key expiry', eips: ['EIP-8130'], text: 'A non-admin key can carry an expiry timestamp. After it, the key stops working.', route: { ...W, screen: 'keys', sheet: { kind: 'addKey', preset: 'passkey', step: 2, expiryPreset: '30d' } } },
    { id: 'revocation', name: 'Revocation and cancellation', eips: ['EIP-8130'], text: 'Remove a key at once, or cancel every signed key-change not yet applied.', route: { ...W, screen: 'keys', sheet: { kind: 'cancelPending' } } },
  ] },
  { title: 'Permissions', items: [
    { id: 'flags', name: 'Permission levels', eips: ['EIP-8130'], text: 'Admin, send, pay own gas, pay others’ gas, parallel lanes. The wallet shows them in plain words; the explorer shows the flags.', route: { ...W, screen: 'keys', sheet: { kind: 'keyDetail', keyId: 'k7' } } },
    { id: 'session', name: 'App permissions in one request', eips: ['ERC-7715', 'EIP-8130'], text: 'An app asks for a set of permissions for its own session account in one request. Each permission becomes a Keystore row with its own limit, policy and expiry, gated to the policy manager.', route: APP('automation', { kind: 'session', req: TIDEPOOL_REQ() }) },
    { id: 'perm-multi', name: 'Several permissions, one app', eips: ['ERC-7715', 'EIP-8130'], text: 'One session account holds many permissions: a contract it may use, a USDC budget per day, an ETH stream. One row each, so each has its own expiry and can be removed alone.', route: APP('automation', { kind: 'session', req: TIDEPOOL_REQ(), tab: 'steps' }) },
    { id: 'perm-adjust', name: 'Adjustable or fixed values', eips: ['ERC-7715'], text: 'The app marks each permission adjustable or not. Keel lets you change the adjustable amounts before you approve and returns what you set; a fixed one is take it or leave it.', route: APP('automation', { kind: 'session', req: TIDEPOOL_REQ() }) },
    { id: 'perm-stream', name: 'Budgets and streams', eips: ['ERC-7715'], text: 'A budget resets every period. A stream is a daily rate that builds up while unused, to a cap. Each is a policy contract the manager runs.', route: APP('automation', { kind: 'session', req: TIDEPOOL_REQ() }) },
    { id: 'perm-redeem', name: 'Redeemed through the policy manager', eips: ['ERC-7710', 'EIP-8130'], text: 'The app’s session account calls redeemDelegations on the manager. The manager checks the Keystore row and runs the policy, then drives your account. Over budget fails in simulation and nothing is sent.', route: { ...APP('automation', null), sessionEnabled: true, sessions: [buildSession(TIDEPOOL_REQ()), ...SESSIONS] } },
    { id: 'perm-revoke', name: 'Remove one permission or all', eips: ['ERC-7715', 'EIP-8130'], text: 'Each permission is its own row, so one can go without the others. Removing all is one batch. The app can ask to end its own access too; you confirm.', route: { ...W, screen: 'keys', keysTab: 'apps', sessionEnabled: true, sessions: [buildSession(TIDEPOOL_REQ()), ...SESSIONS], sheet: { kind: 'sessionDetail', sessionId: 'ss-tidepool' } } },
    { id: 'gas-key', name: 'Dedicated gas key', eips: ['EIP-8130'], text: 'A low-security key that can only pay gas funds transactions signed by stronger keys.', route: { ...W, screen: 'keys', sheet: { kind: 'addKey', preset: 'seed', step: 2, flags: ['gas', 'sponsor'], name: 'Fee key' } } },
  ] },
  { title: 'Transactions', items: [
    { id: 'batch', name: 'Smart batches', eips: ['ERC-8211'], text: 'A list of calls where any argument can be computed at execution time.', route: APP('vault', { kind: 'batch' }) },
    { id: 'conditions', name: 'Inline conditions', eips: ['ERC-8211'], text: 'A step can be just a check. Keel appends one to every transaction it signs: revert unless you received at least X. The hardware wallet shows it on its own page.', route: APP('vault', { kind: 'batch' }) },
    { id: 'flow', name: 'Values that flow between steps', eips: ['ERC-8211'], text: 'Step 2 saves its result; step 3 reads it back. Under the hood: $swapOut.', route: APP('vault', { kind: 'batch' }) },
    { id: 'phases', name: 'Phased atomicity', eips: ['EIP-8141', 'EIP-8130'], text: 'The fee is taken in phase 1; the user action runs in phase 2. A failed phase rolls back alone.', route: APP('vault', { kind: 'batch' }) },
    { id: 'native-eth', name: 'Native ETH in batches', eips: ['EIP-8141'], text: 'A call can send ETH directly. The tip step is a plain transfer.', route: APP('vault', { kind: 'batch' }) },
    { id: 'xchain', name: 'Cross-chain programs', eips: ['ERC-8211'], text: 'Signed once; each chain runs its part; later parts wait on state.', route: APP('bridge', { kind: 'xchain' }) },
    { id: 'sponsorship', name: 'Gas sponsorship', eips: ['EIP-8141', 'EIP-8130'], text: 'The app’s session account sends and pays for what it redeems; your account pays nothing, not even for the grant. On your own transactions a named sponsor pays and cannot change the calls.', route: { ...APP('automation', null), sessionEnabled: true, sessions: [buildSession(TIDEPOOL_REQ()), ...SESSIONS] } },
    { id: 'lanes', name: 'Parallel nonces', eips: ['EIP-8130', 'EIP-8141'], text: 'Independent nonce lanes, so a stuck payment never blocks the others. The wallet just says that; the explorer shows the lanes.', route: { ...W, screen: 'settings', settingsPage: 'pending' } },
    { id: 'validity', name: 'Validity windows', eips: ['EIP-8130', 'EIP-8141'], text: 'Not valid before A, not valid after B. Shown as “expires in 10 minutes”.', route: APP('vault', { kind: 'batch' }) },
    { id: 'metadata', name: 'Metadata', eips: ['EIP-8130'], text: 'A signed bytes field for an app identifier or payment reference. Shown as the reference; read by indexers.', route: APP('vault', { kind: 'batch' }) },
  ] },
  { title: 'Outcome guarantees', items: [
    { id: 'assert', name: 'Assert the result', eips: ['EIP-7906'], text: 'A final check reads every balance, slot and event that changed. Any violation reverts everything.', route: APP('vault', { kind: 'batch', tab: 'state' }) },
    { id: 'guardrails', name: 'Wallet-set guardrails', eips: ['EIP-7906'], text: 'Keel simulates the transaction, shows the state changes it produces, and fixes them as assertions: spend at most this much, no approval left behind, everything else unchanged.', route: APP('vault', { kind: 'batch', tab: 'state' }) },
    { id: 'outcome-policy', name: 'Outcome-based policies', eips: ['EIP-7906', 'EIP-8130'], text: 'Session and sponsor rules written in terms of results, not contracts called: Tidepool’s grant carries a rule on your tpETH balance, checked after every use.', route: APP('automation', { kind: 'session', req: TIDEPOOL_REQ() }) },
    { id: 'multi-check', name: 'Multiple independent checks', eips: ['EIP-7906'], text: 'Wallet, app and a security provider each add a check without coordinating.', route: APP('vault', { kind: 'batch', tab: 'state' }) },
  ] },
  { title: 'Proactive security', items: [
    { id: 'multisig', name: 'Multisig from your own keys', eips: ['EIP-8130', 'EIP-8141'], text: 'Several of your keys registered as one key: 2 of 2, 2 of 3. A threshold authenticator checks the signatures; the address and the permissions don’t change.', route: { ...W, screen: 'keys', sheet: { kind: 'addKey', preset: 'multisig', step: 2 } } },
    { id: 'protected', name: 'Protected signer', eips: ['EIP-8130', 'EIP-8141'], text: 'Your key with protection on: a security service verifies every transaction and adds its signature, or it doesn’t count. On chain a 2 of 2; to you, your phone, protected. The service can only say no.', route: { ...W, screen: 'keys', sheet: { kind: 'keyDetail', keyId: 'k7' } } },
    { id: 'cosign-plug', name: 'Pluggable co-signers', eips: ['EIP-8130'], text: 'Any key can be added with protection on, and the co-signer is a choice: Safenet, Blockaid or Hypernative. The service is a member of the set, not an owner. Swap it by changing one key. Safenet’s rotating group key comes from an oracle contract, so the entry never changes.', route: { ...W, screen: 'keys', sheet: { kind: 'addKey', preset: 'passkey', step: 2, protect: true } } },
    { id: 'override', name: 'Override keys', eips: ['EIP-8130'], text: 'A key outside the set sends directly and can switch protection off. A stolen phone can’t remove its own guard; the hardware wallet can.', route: { ...W, screen: 'keys', sheet: { kind: 'keyDetail', keyId: 'k2' } } },
    { id: 'pick-key', name: 'Choose the key for each approval', eips: ['EIP-8130', 'EIP-8141'], text: 'Every approval says which key signs it. Pick the phone with Safenet, the hardware wallet alone, or both devices. Receipts and the explorer show which one was used.', route: APP('vault', { kind: 'batch', pick: true }) },
  ] },
  { title: 'Privacy', items: [
    { id: 'private-balance', name: 'Private balance', eips: ['EIP-8141', 'EIP-8272'], text: 'Money in a shielded pool gets its own tab. Nothing on chain says which deposit is yours, so what you do with the money is not tied to your account. Ethereum only: EIP-8130 has no validation slot for the withdrawal proof.', route: { ...W, screen: 'private' } },
    { id: 'shield', name: 'Add from your main account', eips: ['EIP-8141'], text: 'A public deposit into the pool from Main account. The pool approves a deposit before it can leave privately. If it refuses, the money can go back to Main account.', route: { ...W, screen: 'private', privPage: 'add', sheet: { kind: 'shield', token: 'eth', chain: 'ethereum', qty: 0.5 } } },
    { id: 'private-send', name: 'Private send', eips: ['EIP-8141', 'EIP-8272'], text: 'One transaction from a new account. The withdrawal proof is checked in validation, a deploy frame creates the account, the fee comes out of the withdrawal, then the payment runs. The recipient sees a new address.', route: { ...W, screen: 'private', privPage: 'send', sheet: { kind: 'psend', token: 'eth', chain: 'ethereum', qty: 0.2, to: 'bob.eth', short: '0x91aC…7f02', known: true, icon: 'user', priv: false, tab: 'steps' } } },
    { id: 'one-time-key', name: 'A one-time key for each send', eips: ['EIP-8130', 'EIP-8141'], text: 'The new account has one key, derived from your seed phrase for that send only. Your everyday keys are rows on Main account, so signing with them would link the two. Safenet and the spend limit do not cover private sends, and the sheet says so.', route: { ...W, screen: 'private', privPage: 'send', sheet: { kind: 'psend', token: 'eth', chain: 'ethereum', qty: 0.2, to: 'bob.eth', short: '0x91aC…7f02', known: true, icon: 'user', priv: false } } },
    { id: 'private-address', name: 'Private address', eips: ['ERC-5564', 'ERC-6538'], text: 'A stealth meta-address listed for Main account. A payer’s wallet pays a new address made from it every time, and Keel finds the payments with the viewing key.', route: { ...W, screen: 'private', privPage: 'receive' } },
    { id: 'pay-private', name: 'Paying someone’s private address', eips: ['ERC-5564', 'EIP-8141'], text: 'When the person you pay has a private address, a private send pays a new address of theirs. Neither side shows up on chain.', route: { ...W, screen: 'private', privPage: 'send', sheet: { kind: 'psend', token: 'eth', chain: 'ethereum', qty: 0.2, to: 'alice.eth', short: '0x2B7a…c41E', known: true, icon: 'user', priv: true } } },
    { id: 'move-payment', name: 'Move a private payment into the pool', eips: ['ERC-5564', 'EIP-8141'], text: 'The payer knows the address they paid. Moving the money into the pool hides where it goes next. The fee comes out of the payment, so nothing else has to fund the address.', route: { ...W, screen: 'private', privIn: PRIVATE_IN, sheet: { kind: 'pmove', paymentId: PRIVATE_IN[0].id, token: 'eth', chain: 'ethereum', qty: PRIVATE_IN[0].qty, from: PRIVATE_IN[0].from, addr: PRIVATE_IN[0].addr } } },
    { id: 'observer', name: 'What an observer sees', eips: ['EIP-8141'], text: 'Framescan shows a private send the way anyone sees it: a new account with the same code as every other, money out of the pool, a paymaster repaid from the withdrawal. Nothing points at your account.', route: { ...W, screen: 'private', browserTab: 'framescan', fxTab: 'tx', fxTx: TX_PSEND_SAMPLE.id, fxChain: 'ethereum' } },
  ] },
  { title: 'Guarantees on a hardware wallet', items: [
    { id: 'hw-guaranteed', name: 'Guaranteed outcome on the device', eips: ['EIP-7906', 'EIP-8141'], text: 'First what is signed, every step of the batch as its clear-signing descriptor renders it; then the transaction assertions from the bytes it signs: “either these bounds hold, or the transaction fails”. Not a prediction.', route: HW('vault', { kind: 'batch', tab: 'state' }) },
    { id: 'hw-lock', name: 'Nothing else changes', eips: ['EIP-7906', 'EIP-8141'], text: 'The wallet turns its test run into assertions: a bound for each change, and one more that fails on any other change to your tokens, approvals or ETH. The account requires them on every transaction.', route: APP('vault', { kind: 'claim' }, { signer: 'k2' }) },
    { id: 'hw-authority', name: 'Who acts with your authority', eips: ['EIP-8141', 'EIP-7906'], text: 'The SENDER frame targets are read from the transaction envelope, not from the app’s description of itself.', route: APP('vault', { kind: 'batch' }) },
    { id: 'hw-declared', name: 'Declared changes shown separately', eips: ['EIP-7906'], text: 'A per-user state change the user asked for renders in its own block, pinned to its intended result.', route: HW('automation', { kind: 'session', req: TIDEPOOL_REQ() }) },
    { id: 'hw-notcovered', name: 'What is not covered is stated', eips: ['EIP-7906'], text: 'Tokens that move without a Transfer event, positions kept inside other contracts, and what a position is worth: the wallet states the limit instead of hiding it.', route: { ...W, screen: 'settings', settingsPage: 'hardware' } },
    { id: 'hw-messages', name: 'Messages get a blind-signing warning', eips: ['EIP-7906', 'ERC-7964'], text: 'Off-chain signatures carry no assertions, so the device warns instead of pretending.', route: HW('orders', { kind: 'order' }) },
    { id: 'hw-descriptors', name: 'Names come from signed descriptors', eips: ['EIP-7906'], text: 'Token and protocol names and each step’s wording are vendor-signed descriptors stored on the device. Without them it shows raw addresses and calldata, never a label from the computer.', route: HW('vault', { kind: 'batch' }, { hwRaw: true }) },
  ] },
  { title: 'Account lifecycle', items: [
    { id: 'counterfactual', name: 'Counterfactual creation', eips: ['EIP-8130', 'EIP-8141'], text: 'The address is computed from the initial keys before the account exists.', route: { ...W, onboarded: false, welcomeFlow: 'create' } },
    { id: 'same-address', name: 'Same address on every chain', eips: ['EIP-8130'], text: 'The Keystore is the deployer everywhere, so the same keys give the same address.', route: { ...W, screen: 'settings', settingsPage: 'networks' } },
    { id: 'eoa', name: 'EOA upgrade in place', eips: ['EIP-7702', 'EIP-8141'], text: 'An existing EOA becomes the new account in its first transaction. Same address.', route: { ...W, onboarded: false, welcomeFlow: 'upgrade' } },
    { id: 'import-4337', name: 'Import of existing ERC-4337 accounts', eips: ['EIP-8130', 'ERC-1271'], text: 'A deployed 4337 wallet registers into the Keystore with one signature.', route: { ...W, onboarded: false, welcomeFlow: 'import4337' } },
    { id: 'lock', name: 'Account lock', eips: ['EIP-8130', 'EIP-8141'], text: 'Freeze the key list for a period; the network treats the account as safe for high volume.', route: { ...W, screen: 'keys', sheet: { kind: 'lock' } } },
  ] },
  { title: 'Recovery and portability', items: [
    { id: 'wallet-import', name: 'Wallet-independent import', eips: ['EIP-8130'], text: 'Any wallet that follows the standard restores the account without a transaction.', route: { skin: 'lantern' } },
    { id: 'seed', name: 'Seed phrase derivation', eips: ['BIP-44', 'EIP-8130'], text: 'How a phrase produces the master key and the address. Under “Under the hood” on the recovery page.', route: { ...W, screen: 'settings', settingsPage: 'recovery' } },
    { id: 'master-type', name: 'Master key of any type', eips: ['BIP-32', 'SLIP-0010'], text: 'The derivation path selects the key type: secp256k1, P-256 or post-quantum.', route: { ...W, screen: 'settings', settingsPage: 'recovery' } },
    { id: 'recovery-key', name: 'Recovery-only key', eips: ['EIP-8130'], text: 'The seed key only works through a time-delayed recovery; passkeys do the daily signing.', route: { ...W, screen: 'settings', settingsPage: 'recovery' } },
    { id: 'other-seeds', name: 'Owners from other seeds', eips: ['EIP-8130'], text: 'More owners from other phrases or devices, listed on-chain and found by scanning the Keystore.', route: { ...W, screen: 'keys', sheet: { kind: 'addKey', preset: 'seed', step: 2, source: 'new' } } },
    { id: 'xchain-keys', name: 'Cross-chain key changes', eips: ['ERC-7964', 'EIP-8130'], text: 'One typed message lists each chain and its change; each chain verifies its own entry.', route: { ...W, screen: 'keys', sheet: { kind: 'addKey', preset: 'passkey', step: 2 } } },
  ] },
  { title: 'Human-readable signing', items: [
    { id: 'displayable', name: 'Every operation is displayable', eips: ['ERC-7730'], text: 'Add a key, grant an app permissions, approve sponsorship, run a batch: each has a display description.', route: { ...W, screen: 'settings', settingsPage: 'plain' } },
    { id: 'written-once', name: 'Written once, used by all wallets', eips: ['ERC-7730'], text: 'Lantern renders the same approval text as Keel without doing its own work.', route: { skin: 'lantern', lanternImported: true, lanternStep: 3, sheet: { kind: 'batch' } } },
    { id: 'computed-rules', name: 'Computed values shown as rules', eips: ['ERC-7730', 'ERC-8211', 'ERC-7964'], text: '“Everything you receive, at least 0.312 ETH” instead of a made-up number.', route: APP('vault', { kind: 'batch' }) },
  ] },
  { title: 'Signing for applications', items: [
    { id: 'sig-validation', name: 'Detailed signature validation', eips: ['EIP-8130', 'ERC-1271'], text: 'The app learns which key signed and what it may do, not only that the signature is valid.', route: APP('signin', { kind: 'signin' }, { signedIn: false }) },
    { id: 'xchain-sig', name: 'Cross-chain signatures for apps', eips: ['ERC-7964'], text: 'One signature covers an order on several chains; the account’s signature check accepts it.', route: APP('orders', { kind: 'order' }) },
    { id: 'tx-context', name: 'Transaction context for contracts', eips: ['EIP-8130', 'EIP-8141'], text: 'A contract can read who sent, who pays, which key signed and the full call list.', route: { ...W, screen: 'home', browserTab: 'framescan', fxTab: 'tx', fxTx: 'tx-batch' } },
  ] },
  { title: 'Transport independence', items: [
    { id: 'three-ways', name: 'One account, three ways to send', eips: ['EIP-8141', 'EIP-8130', 'ERC-4337'], text: '8141 frames on L1, 8130 on L2s that adopt it, 4337 everywhere else. The wallet says “works the same everywhere”; the details are under the hood.', route: { ...W, screen: 'settings', settingsPage: 'networks' } },
    { id: 'differs', name: 'What differs by transport', eips: ['EIP-7906', 'EIP-8130'], text: 'Transaction assertions cover the whole transaction on 8141 and each part on its own elsewhere; nonce-free mode is L2 only.', route: { ...W, screen: 'settings', settingsPage: 'networks' } },
  ] },
  { title: 'Tooling', items: [
    { id: 'receipts', name: 'Uniform receipts and events', eips: ['EIP-8141', 'EIP-8130'], text: 'Receipts show who paid and each phase’s result; every key change emits a standard event.', route: { ...W, screen: 'home', browserTab: 'framescan', fxTab: 'tx', fxTx: 'tx-batch' } },
    { id: 'rpc', name: 'Standard RPC extensions', eips: ['EIP-8130'], text: 'Nonce lanes and gas estimation for the new transaction shape, identical across chains.', route: { ...W, screen: 'home', browserTab: 'framescan', fxTab: 'rpc' } },
  ] },
];
export const FEATURE_COUNT = FEATURES.reduce((n, s) => n + s.items.length, 0);

export function initialState() {
  return {
    skin: 'keel', onboarded: true, welcomeFlow: null, accountId: 'main', screen: 'home', homePage: null, settingsPage: null, receiptId: null,
    sheet: null, faceId: false, toast: null, signer: 'k7', sig: null, cosign: null, sim: null, hw: null, hwRaw: false,
    keys: { main: KEYS_MAIN, sub: KEYS_SUB }, keysTab: 'mine', sessions: SESSIONS, locked: false, pendingCancelled: false, recovery: null, setupMethod: 'passkey',
    lanternStep: 0, lanternImported: false, lanternVia: 'passkey',   // what Lantern imports with: 'passkey' | 'phrase'
    browserTab: 'tidepool', dappPage: 'vault', signedIn: false, signedInKey: null, deposited: false, sessionEnabled: false, bridgeStatus: null, orderSigned: false, claimUndone: false,
    txs: TX_HISTORY, fxTab: 'tx', fxTx: 'tx-batch', fxChain: 'ethereum',
    assets: ASSETS,   // per account; a send or a swap moves them when it confirms
    take: 0,      // how many times the mockup has started over (a chapter, a reset); the stage is keyed by it
    privPage: null,        // a sub-page of the Private tab: 'send' | 'receive' | 'add'
    privWait: [],          // deposits the pool has not approved yet: { id, token, chain, qty, usd, from, txId }
    privIn: PRIVATE_IN,    // payments found at your private address, still at their own address
    flow: null,   // the request Tidepool is waiting on: { kind, phase: 'confirming' | 'done' | 'rejected' }
    runs: [],     // what Tidepool redeemed under its permissions: { id, permId, amount, ok, error, txId }
    revoked: [],  // Keystore rows removed since the demo started, for the explorer's event list
    opened: {},   // "Under the hood" boxes with an id that have been opened (Details in ui.jsx), for the tutorial
    recoveryPath: 'secp',   // the key type the recovery page's derivation shows: 'secp' | 'p256' | 'pq'
    clip: false,       // the Send screen offers a pasted address (the scam address in SCAM), for the screening step
    hwLinked: false,   // Keel set up from an EOA on the Anchor: the device has let Keel see its accounts
    screened: null,    // what a co-signer refused to sign: { to, provider, why }
  };
}
