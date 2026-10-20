// Send and swap: the wallet's own transactions. Each is a form (a sub-page of Home: the asset, the amount, the recipient
// or the pair), then the same consent sheet every approval uses: one sentence, the transaction card (the step with Keel's
// rule appended once the simulation is done, and the state changes it fixes as assertions), the facts, the split approve
// button. Approving puts a Confirming receipt into History; the network's timer settles it and moves the balances.
import { useState } from 'react';
import { useStore, signerKey } from '../state.jsx';
import { Icon } from '../icons.jsx';
import { Btn, Card, CardHead, Row, Bar, Sheet, ApproveFooter, Sentence, V, Details, Kv, Facts, TxTabs, TokenMark, Note, chainName } from '../ui.jsx';
import { TOKENS, CHAINS, CONTACTS, PRICES, FEE_PAYER, SCAM, feeFor, fmtQty, fmtUsd, fmtCap, floorQty, resolveTo, sendRule, swapRule, sendStep, swapStep, sendChanges, swapChanges, arrivesOn, rateText } from '../data.js';

const sym = (t) => TOKENS[t].symbol;
const clean = (v) => v.replace(/[^\d.]/g, '').replace(/^(\d*\.\d*).*$/, '$1');   // digits and one point, nothing else
const chainOf = (id) => CHAINS.find(c => c.id === id) || CHAINS[0];

function useAssets() { const { state } = useStore(); return state.assets[state.accountId] || []; }
function useNav() {
  const { dispatch } = useStore();
  return { back: () => dispatch({ type: 'set', patch: { homePage: null } }), open: (sheet) => dispatch({ type: 'sheet', sheet }), toast: (text) => dispatch({ type: 'toast', text, kind: 'warn' }) };
}

// The amount, written big beside its symbol; under it the fiat value, or why it can't go, and Max.
// Amount, AssetPicker, AssetRow and Empty are shared with the Private tab's send and add pages (Private.jsx).
export function Amount({ id, token, value, onChange, usd, over, onMax }) {
  return (
    <>
      <div className="amt">
        <input id={id} inputMode="decimal" placeholder="0" value={value} aria-label="Amount" autoComplete="off" onChange={e => onChange(clean(e.target.value))} />
        <span className="sym">{sym(token)}</span>
      </div>
      <div className="amtsub">
        <span className={over ? 'warn' : ''}>{over ? 'More than you have' : `≈ ${fmtUsd(usd)}`}</span>
        <button type="button" className="max" id={id + '-max'} onClick={onMax}>Max</button>
      </div>
    </>
  );
}
// Which holding: one row per token on a network, the chosen one checked. `where` replaces the network in the sub line.
export function AssetPicker({ title, assets, selected, onPick, onBack, where }) {
  return (
    <div className="body">
      <Bar title={title} onBack={onBack} />
      <Card>
        {assets.map(a => { const on = a.id === selected; return <Row key={a.id} id={'pick-' + a.id} lead={<TokenMark token={a.token} chain={a.chain} />} title={TOKENS[a.token].name} sub={`${a.amount} · ${where || chainName(a.chain)}`} right={<Icon name={on ? 'check' : 'chevR'} size={20} className={on ? 'ok' : 'dim'} />} onClick={() => onPick(a.id)} />; })}
      </Card>
    </div>
  );
}
// The chosen holding, as the row that opens the picker; without `onClick` it is the only choice and just says so.
export function AssetRow({ id, a, onClick, where }) {
  return <Row id={id} lead={<TokenMark token={a.token} chain={a.chain} />} title={TOKENS[a.token].name} sub={`${a.amount} · ${where || chainName(a.chain)}`} right={onClick ? <Icon name="chevD" size={20} className="dim" /> : null} onClick={onClick} />;
}
export function Empty({ title, text, onBack }) {
  return <div className="body"><Bar title={title} onBack={onBack} /><Card><Row icon="wallet" title="Nothing here yet" sub={text} /></Card></div>;
}

// --- Send ----------------------------------------------------------------------------------------------------------
export function SendScreen() {
  const { state } = useStore();
  const assets = useAssets();
  const { back, open } = useNav();
  const [assetId, setAssetId] = useState(assets[0] ? assets[0].id : null);
  const [picking, setPicking] = useState(false);
  const [amount, setAmount] = useState('');
  const [to, setTo] = useState('');
  const a = assets.find(x => x.id === assetId) || assets[0];
  if (!a) return <Empty title="Send" text="This account holds nothing to send." onBack={back} />;
  if (picking) return <AssetPicker title="Send which asset?" assets={assets} selected={a.id} onPick={id => { setAssetId(id); setAmount(''); setPicking(false); }} onBack={() => setPicking(false)} />;
  const fee = feeFor('send', a.chain, a.token);
  const qty = parseFloat(amount) || 0;
  const max = floorQty(a.token, a.qty - fee.qty);   // the fee is taken in the currency being sent
  const over = qty > max;
  const price = a.qty > 0 ? a.usd / a.qty : PRICES[a.token];
  const who = resolveTo(to);
  const typed = to.trim().toLowerCase();
  const matches = CONTACTS.filter(c => !typed || c.name.toLowerCase().includes(typed));
  const ready = qty > 0 && !over && typed.length >= 3;
  const review = () => open({ kind: 'send', token: a.token, chain: a.chain, qty, to: who.to, short: who.short, known: who.known, icon: who.icon, ...(who.flagged ? { flagged: true, why: SCAM.why } : {}) });
  const sc = state.screened;
  return (
    <>
      <div className="body">
        <Bar title="Send" onBack={back} />
        {sc && <div id="send-screened"><Note icon="shield" tone="a">{sc.provider} refused to co-sign the send to {sc.to}. That address is on its list of known drainers. Nothing was sent.</Note></div>}
        <Card>
          <AssetRow id="send-asset" a={a} onClick={() => setPicking(true)} />
          <Amount id="send-amount" token={a.token} value={amount} onChange={setAmount} usd={qty * price} over={over} onMax={() => setAmount(String(max))} />
        </Card>
        <Card>
          <CardHead label="To" />
          <div style={{ padding: '0 16px 12px' }}>
            <input className="inp" id="send-to" placeholder="Name, ENS name or address" value={to} spellCheck={false} autoComplete="off" aria-label="Recipient" onChange={e => setTo(e.target.value)} />
          </div>
          {state.clip && !typed && <Row id="to-pasted" icon="copy" iconTone="b" title="Pasted address" sub={`${SCAM.short} · from your clipboard`} right={<Icon name="chevR" size={20} className="dim" />} onClick={() => setTo(SCAM.addr)} />}
          {matches.map(c => { const on = who.known && who.to === c.name; return <Row key={c.id} id={'to-' + c.id} icon={c.icon} iconTone={on ? 'g' : 'b'} title={c.name} sub={`${c.short} · ${c.sub}`} right={<Icon name={on ? 'check' : 'chevR'} size={20} className={on ? 'ok' : 'dim'} />} onClick={() => setTo(c.name)} />; })}
        </Card>
        <Facts rows={[['Network fee', fee.amount, fee.note], ['Arrives', arrivesOn(a.chain)]]} />
      </div>
      <div className="foot">
        <Btn kind="p" icon="send" id="btn-send-review" disabled={!ready} onClick={review}>Review</Btn>
      </div>
    </>
  );
}

// The signing key's daily spend limit, if this send goes over it. The limit counts the dollar value of what leaves
// (Chainlink prices on chain); the demo starts each day at nothing spent. The simulation runs the transaction against
// the policy contract, so Keel knows before signing that the network would refuse it.
function overLimit(state, sh) {
  const key = signerKey(state);
  const cap = key && key.limit && key.limit.day;
  const usd = sh.qty * (PRICES[sh.token] || 0);
  return cap && usd > cap ? { key, cap, usd } : null;
}

export function SendSheet() {
  const { state, dispatch } = useStore();
  const sh = state.sheet;
  const close = () => dispatch({ type: 'sheet', sheet: null });
  const s = sym(sh.token), q = fmtQty(sh.token, sh.qty), fee = feeFor('send', sh.chain, sh.token), rule = sendRule(sh), chain = chainOf(sh.chain);
  const simDone = !!state.sim && state.sim.phase === 'done';
  const over = simDone ? overLimit(state, sh) : null;
  return (
    <Sheet title="Send" onClose={close} footer={<ApproveFooter label="Send with Face ID" blocked={over ? 'Over today’s limit' : null} onApprove={() => dispatch({ type: 'sign' })} onReject={() => dispatch({ type: 'reject' })} note={over ? `${over.key.name} can send up to ${fmtCap(over.cap)} a day.` : `Nothing but ${q} ${s} and the network fee leaves.`} />}>
      <Sentence size={20} sub={`${chain.name} · ${sh.short}`}>Send <V>{q} {s}</V> to <V tone="a" icon={sh.icon || 'user'}>{sh.to}</V>.</Sentence>
      {over && <div id="send-overlimit"><Note icon="coins" tone="a">{over.key.name} can spend up to {fmtCap(over.cap)} a day, and this send is {fmtUsd(over.usd)}. The limit contract would reject it on chain and you’d still pay the fee, so Keel won’t sign it. Your Anchor has no limit and can still send it.</Note></div>}
      {!sh.known && <Note icon="info" tone="a">First time sending here. Check the address with the person you’re paying.</Note>}
      <TxTabs steps={[sendStep(sh)]} rule={rule} changes={sendChanges(sh)} />
      <Facts rows={[['Network fee', fee.amount, fee.note], ['Arrives', arrivesOn(sh.chain)], ['If anything differs', 'It fails · nothing leaves']]} />
      <Details>
        <Kv k="Format">{chain.transport} · {sh.token === 'eth' ? 'plain value transfer' : 'ERC-20 transfer'} · ERC-8211 check step</Kv>
        <Kv k="Simulation">eth_simulateV1 · the recipient’s balance after the transfer is the rule’s bound</Kv>
        <Kv k="Keel rule">{rule.tech} · if false the transfer reverts</Kv>
        <Kv k="Fee">{fee.gas} · {fee.amount}{sh.token === 'eth' ? ' · paid from the account' : ` · charged in ${s} by ${FEE_PAYER.name}, settled in ETH`}</Kv>
        <Kv k="Validity">10 min · nonce lane 2</Kv>
      </Details>
    </Sheet>
  );
}

// --- Swap ----------------------------------------------------------------------------------------------------------
// ETH for USDC or USDC for ETH, on the network the holding is on; the other side of the pair is the wallet's quote.
const SWAPPABLE = new Set(['eth', 'usdc']);
const otherOf = (t) => t === 'eth' ? 'usdc' : 'eth';

export function SwapScreen() {
  const assets = useAssets();
  const { back, open, toast } = useNav();
  const pool = assets.filter(a => SWAPPABLE.has(a.token));
  const [assetId, setAssetId] = useState(pool[0] ? pool[0].id : null);
  const [picking, setPicking] = useState(false);
  const [amount, setAmount] = useState('');
  const a = pool.find(x => x.id === assetId) || pool[0];
  if (!a) return <Empty title="Swap" text="Keel swaps between ETH and USDC. This account holds neither." onBack={back} />;
  if (picking) return <AssetPicker title="Swap which asset?" assets={pool} selected={a.id} onPick={id => { setAssetId(id); setAmount(''); setPicking(false); }} onBack={() => setPicking(false)} />;
  const toToken = otherOf(a.token);
  const fee = feeFor('swap', a.chain, a.token);
  const qty = parseFloat(amount) || 0;
  const max = floorQty(a.token, a.qty - fee.qty);
  const over = qty > max;
  const out = qty * PRICES[a.token] / PRICES[toToken];
  const min = out * (1 - 0.005);   // the quote, less the slippage the rule allows (SLIPPAGE in data.js)
  const held = assets.find(x => x.token === toToken && x.chain === a.chain);   // the pair the other way round, if held
  const flip = () => held ? (setAssetId(held.id), setAmount('')) : toast(`You don’t hold ${sym(toToken)} on ${chainName(a.chain)}`);
  const review = () => open({ kind: 'swap', token: a.token, toToken, chain: a.chain, qty, out, min });
  return (
    <>
      <div className="body">
        <Bar title="Swap" onBack={back} />
        <Card>
          <CardHead label="You pay" />
          <AssetRow id="swap-asset" a={a} onClick={() => setPicking(true)} />
          <Amount id="swap-amount" token={a.token} value={amount} onChange={setAmount} usd={qty * PRICES[a.token]} over={over} onMax={() => setAmount(String(max))} />
        </Card>
        <div className="flipwrap"><button type="button" className="flip" id="btn-swap-flip" aria-label="Swap the other way" title="Swap the other way" onClick={flip}><Icon name="arrowDown" size={18} /></button></div>
        <Card>
          <CardHead label="You get" />
          <Row lead={<TokenMark token={toToken} chain={a.chain} />} title={TOKENS[toToken].name} sub={chainName(a.chain)}
            right={<span className="val"><div className="tt">{qty > 0 ? `${fmtQty(toToken, out)} ${sym(toToken)}` : '—'}</div>{qty > 0 && <div className="ss">≈ {fmtUsd(out * PRICES[toToken])}</div>}</span>} />
        </Card>
        <Facts rows={[['Rate', rateText()], ['You get at least', qty > 0 ? `${fmtQty(toToken, min)} ${sym(toToken)}` : '—', 'Up to 0.5% under the quote, or it fails'], ['Network fee', fee.amount, fee.note]]} />
      </div>
      <div className="foot">
        <Btn kind="p" icon="swap" id="btn-swap-review" disabled={!(qty > 0 && !over)} onClick={review}>Review</Btn>
      </div>
    </>
  );
}

export function SwapSheet() {
  const { state, dispatch } = useStore();
  const sh = state.sheet;
  const close = () => dispatch({ type: 'sheet', sheet: null });
  const s = sym(sh.token), t = sym(sh.toToken), q = fmtQty(sh.token, sh.qty), m = fmtQty(sh.toToken, sh.min), fee = feeFor('swap', sh.chain, sh.token), rule = swapRule(sh), chain = chainOf(sh.chain);
  return (
    <Sheet title="Swap" onClose={close} footer={<ApproveFooter label="Swap with Face ID" onApprove={() => dispatch({ type: 'sign' })} onReject={() => dispatch({ type: 'reject' })} note={`You get at least ${m} ${t}, or nothing moves.`} />}>
      <Sentence size={20} sub={`${chain.name} · ${rateText()}`}>Swap <V>{q} {s}</V> for at least <V tone="c">{m} {t}</V>.</Sentence>
      <TxTabs steps={[swapStep(sh)]} rule={rule} changes={swapChanges(sh)} />
      <Facts rows={[['Rate', rateText()], ['Network fee', fee.amount, fee.note], ['Expires', 'in 10 min'], ['If anything differs', 'It fails · all or nothing']]} />
      <Details>
        <Kv k="Format">{chain.transport} · ERC-8211 smart batch · ERC-7730 intent from the router’s descriptor</Kv>
        <Kv k="Route">Uniswap v4 · {s}/{t} 0.05% pool · quoted from the simulation</Kv>
        <Kv k="Simulation">eth_simulateV1 · the output less 0.5% is the rule’s bound</Kv>
        <Kv k="Keel rule">{rule.tech} · if false the swap reverts</Kv>
        <Kv k="Fee">{fee.gas} · {fee.amount}{sh.token === 'eth' ? ' · paid from the account' : ` · charged in ${s} by ${FEE_PAYER.name}, settled in ETH`}</Kv>
        <Kv k="Validity">10 min · nonce lane 2</Kv>
      </Details>
    </Sheet>
  );
}
