// The private side of the wallet, its own tab. The private balance is money in a shielded pool on Ethereum: adding to
// it is a public deposit from Main account, and once the pool approves a deposit it can leave privately. A private send
// comes from a new account that exists for that one transaction and is signed by a one-time key with Face ID alone: no
// key of Main account, no co-signer. The private address is where others pay you privately; each payment waits at its
// own address until you move it into the pool. The tab says plainly what others can still see, and that Safenet and the
// spend limit only cover Main account.
import { useState } from 'react';
import { useStore } from '../state.jsx';
import { Icon } from '../icons.jsx';
import { Btn, Card, CardHead, Row, Bar, Sheet, ApproveFooter, Sentence, V, Details, Kv, Facts, TxTabs, TokenMark, Note, Scopes, Label, Chip, ChainDot } from '../ui.jsx';
import { TOKENS, CONTACTS, PRICES, ACCOUNTS, POOL, PAYMASTER, ANNOUNCER, REGISTRY, RECENT_ROOTS, PRIVATE_ADDR, feeFor, fmtQty, fmtUsd, floorQty, resolveTo, arrivesOn, psendSteps, psendChanges, psendRule, shieldStep, shieldRule, shieldChanges, pmoveStep, pmoveRule, pmoveChanges } from '../data.js';
import { TxRow, Receipt } from './History.jsx';
import { Amount, AssetPicker, AssetRow, Empty } from './Pay.jsx';

const sym = (t) => TOKENS[t].symbol;
// The keys a private transaction is signed with. Each exists for one address only, so there is nothing to pick.
const ONE_TIME = { name: 'One-time key', words: 'Face ID' };
const PAYMENT_KEY = { name: 'This payment’s key', words: 'Face ID' };

function useNav() {
  const { dispatch } = useStore();
  return { set: (patch) => dispatch({ type: 'set', patch }), open: (sheet) => dispatch({ type: 'sheet', sheet }), toast: (text) => dispatch({ type: 'toast', text }) };
}

// A payment found at your private address, still at the address it was paid to. It counts toward the private balance;
// moving it into the pool hides where it goes next from the person who paid.
function PaymentRow({ p }) {
  const { state } = useStore();
  const { open } = useNav();
  const moving = state.txs.some(t => t.status === 'pending' && t.spends === p.id);
  return (
    <Row lead={<TokenMark token={p.token} chain={p.chain} />} title={`Paid by ${p.from}`} sub={`${fmtQty(p.token, p.qty, true)} ${sym(p.token)} · ${p.time}`}
      right={moving ? <Chip tone="a" icon="clock">Moving</Chip> : <button type="button" className="lnk" id={'btn-pmove-' + p.id} onClick={() => open({ kind: 'pmove', paymentId: p.id, token: p.token, chain: p.chain, qty: p.qty, from: p.from, addr: p.addr })}>Move in</button>} />
  );
}

function PrivateHome() {
  const { state } = useStore();
  const { set } = useNav();
  const [tab, setTab] = useState('balance');
  const ready = state.assets.private || [];
  const total = [...ready, ...state.privWait, ...state.privIn].reduce((n, a) => n + a.usd, 0);
  const activity = state.txs.filter(t => t.private || t.priv);
  const empty = !ready.length && !state.privWait.length && !state.privIn.length;
  return (
    <div className="body">
      <div className="bar"><span className="ttl" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Private</span></div>

      <div className="phero">
        <div className="pl"><Icon name="eyeOff" size={16} />Private balance</div>
        <div className="big">{fmtUsd(total)}</div>
        <div className="ps"><ChainDot id="ethereum" size={14} />Ethereum · only you can see it</div>
      </div>

      <div className="quick q3">
        <button type="button" id="btn-psend" onClick={() => set({ privPage: 'send' })}><span className="qi"><Icon name="send" size={22} /></span>Send</button>
        <button type="button" id="btn-preceive" onClick={() => set({ privPage: 'receive' })}><span className="qi"><Icon name="receive" size={22} /></span>Receive</button>
        <button type="button" id="btn-padd" onClick={() => set({ privPage: 'add' })}><span className="qi"><Icon name="plus" size={22} /></span>Add</button>
      </div>

      <div className="tabbed">
        <Card>
          <div className="ctabs" role="tablist">
            <button type="button" role="tab" id="ptab-balance" aria-selected={tab === 'balance'} className={tab === 'balance' ? 'on' : ''} onClick={() => setTab('balance')}><Icon name="coins" size={17} />Balance</button>
            <button type="button" role="tab" id="ptab-activity" aria-selected={tab === 'activity'} className={tab === 'activity' ? 'on' : ''} onClick={() => setTab('activity')}><Icon name="list" size={17} />Activity</button>
          </div>
          <div className="list">
            {tab === 'balance' && <>
              {ready.map(a => <Row key={a.id} lead={<TokenMark token={a.token} chain={a.chain} />} title="Ready to send" sub={a.amount} right={<span className="val"><div className="tt">{a.value}</div></span>} />)}
              {state.privWait.map(w => <Row key={w.id} lead={<TokenMark token={w.token} chain={w.chain} />} title="Waiting for approval" sub={`${fmtQty(w.token, w.qty, true)} ${sym(w.token)} · ${w.from}`} right={<span className="val"><div className="tt">{fmtUsd(w.usd)}</div></span>} />)}
              {state.privIn.map(p => <PaymentRow key={p.id} p={p} />)}
              {empty && <Row icon="eyeOff" iconTone="p" title="Nothing private yet" sub="Add money from Main account to start." />}
            </>}
            {tab === 'activity' && activity.map(t => <TxRow key={t.id} t={t} time={t.time.split(', ')[0]} onClick={() => set({ receiptId: t.id })} />)}
          </div>
        </Card>
      </div>

      <Scopes groups={[
        { label: 'Hidden from others', items: [['eyeOff', 'Which payments are from you'], ['eyeOff', 'Which payments are to you']] },
        { label: 'Anyone can see', items: [['eye', 'Money you add from Main account'], ['eye', 'Every amount and the address it goes to']] },
      ]} foot={['face', 'Face ID alone guards this balance. Safenet and your daily limit only cover Main account.']} />

      <Details>
        <Kv k="Pool">{POOL.name} · ETH pool {POOL.pool} · Ethereum</Kv>
        <Kv k="Adding">A public deposit from Main account · the pool approves it before it can leave privately · if it refuses, the money can go back to Main account</Kv>
        <Kv k="Sending">One EIP-8141 transaction from a new account · the EIP-8272 frame lets the withdrawal proof be checked in validation · {PAYMASTER.name.toLowerCase()} pays the gas, the withdrawal repays it</Kv>
        <Kv k="Keys">One per new account, from your seed phrase · none of them is on Main account’s Keystore</Kv>
        <Kv k="Address">ERC-5564 · listed for Main account in the ERC-6538 registry · payments found with your viewing key</Kv>
        <Kv k="Networks">Ethereum only · EIP-8130 has no validation slot for the proof · ERC-4337 would need a bundler</Kv>
      </Details>
    </div>
  );
}

// --- Send privately -------------------------------------------------------------------------------------------------
// The Send form, drawing on the private balance. A contact with a private address is paid at a new address of theirs.
function PrivateSend() {
  const { state } = useStore();
  const { set, open } = useNav();
  const back = () => set({ privPage: null });
  const assets = state.assets.private || [];
  const [assetId, setAssetId] = useState(assets[0] ? assets[0].id : null);
  const [picking, setPicking] = useState(false);
  const [amount, setAmount] = useState('');
  const [to, setTo] = useState('');
  const a = assets.find(x => x.id === assetId) || assets[0];
  if (!a) return <Empty title="Send privately" text="Nothing is ready to send. Add money from Main account first." onBack={back} />;
  if (picking) return <AssetPicker title="Send which asset?" assets={assets} selected={a.id} where="Private balance" onPick={id => { setAssetId(id); setAmount(''); setPicking(false); }} onBack={() => setPicking(false)} />;
  const fee = feeFor('psend', a.chain, a.token);
  const qty = parseFloat(amount) || 0;
  const max = floorQty(a.token, a.qty - fee.qty);   // the fee comes out of the withdrawal
  const over = qty > max;
  const price = a.qty > 0 ? a.usd / a.qty : PRICES[a.token];
  const who = resolveTo(to);
  const typed = to.trim().toLowerCase();
  const matches = CONTACTS.filter(c => !typed || c.name.toLowerCase().includes(typed));
  const ready = qty > 0 && !over && typed.length >= 3;
  const review = () => open({ kind: 'psend', token: a.token, chain: a.chain, qty, to: who.to, short: who.short, known: who.known, icon: who.icon, priv: !!who.priv });
  return (
    <>
      <div className="body">
        <Bar title="Send privately" onBack={back} />
        <Card>
          <AssetRow id="psend-asset" a={a} where="Private balance" onClick={assets.length > 1 ? () => setPicking(true) : undefined} />
          <Amount id="psend-amount" token={a.token} value={amount} onChange={setAmount} usd={qty * price} over={over} onMax={() => setAmount(String(max))} />
        </Card>
        <Card>
          <CardHead label="To" />
          <div style={{ padding: '0 16px 12px' }}>
            <input className="inp" id="psend-to" placeholder="Name, ENS name or address" value={to} spellCheck={false} autoComplete="off" aria-label="Recipient" onChange={e => setTo(e.target.value)} />
          </div>
          {matches.map(c => { const on = who.known && who.to === c.name; return <Row key={c.id} id={'pto-' + c.id} icon={c.icon} iconTone={on ? 'g' : 'b'} title={c.name} sub={c.priv ? `${c.short} · has a private address` : `${c.short} · ${c.sub}`} right={<Icon name={on ? 'check' : 'chevR'} size={20} className={on ? 'ok' : 'dim'} />} onClick={() => setTo(c.name)} />; })}
        </Card>
        <Facts rows={[['Sent from', 'A new address', 'Used for this send only'], ['Network fee', fee.amount, 'Taken from the withdrawal'], ['Arrives', arrivesOn(a.chain)]]} />
      </div>
      <div className="foot">
        <Btn kind="p" icon="send" id="btn-psend-review" disabled={!ready} onClick={review}>Review</Btn>
      </div>
    </>
  );
}

export function PSendSheet() {
  const { state, dispatch } = useStore();
  const sh = state.sheet;
  const close = () => dispatch({ type: 'sheet', sheet: null });
  const s = sym(sh.token), q = fmtQty(sh.token, sh.qty), fee = feeFor('psend', sh.chain, sh.token), rule = psendRule(sh);
  return (
    <Sheet title="Send privately" onClose={close} footer={<ApproveFooter label="Send with Face ID" signer={ONE_TIME} onApprove={() => dispatch({ type: 'sign' })} onReject={() => dispatch({ type: 'reject' })} note="Made for this send only. It can spend only your private balance." />}>
      <Sentence size={20} sub="Ethereum · from your private balance">Send <V>{q} {s}</V> to <V tone="a" icon={sh.icon || 'user'}>{sh.to}</V> privately.</Sentence>
      {sh.priv && <Note icon="eyeOff">{sh.to} has a private address, so Keel pays a new address that only they can find.</Note>}
      {!sh.known && <Note icon="info" tone="a">First time sending here. Check the address with the person you’re paying.</Note>}
      <TxTabs steps={psendSteps(sh)} rule={rule} changes={psendChanges(sh)} />
      <Facts rows={[['Sent from', 'A new address', 'Used for this send only'], ['Network fee', fee.amount, 'Taken from the withdrawal'], ['Arrives', arrivesOn(sh.chain)], ['If anything differs', 'It fails · nothing leaves']]} />
      <Details>
        <Kv k="Format">EIP-8141 frame transaction · recent-roots, deploy and paying frames, then the calls</Kv>
        <Kv k="Proof">{POOL.name} withdrawal · checked in validation against a recent pool root ({RECENT_ROOTS})</Kv>
        <Kv k="Account">New, at its precomputed address · same code as every account · one key</Kv>
        <Kv k="Key">One-time secp256k1 key from your seed phrase · not on Main account’s Keystore</Kv>
        <Kv k="Fee">{fee.gas} · {PAYMASTER.name.toLowerCase()} pays the gas, the withdrawal repays {fee.amount}</Kv>
        {sh.priv && <Kv k="Recipient">ERC-5564 scheme 1 · a new address from {sh.to}’s meta-address · announced at {ANNOUNCER} with a view tag</Kv>}
        <Kv k="Keel rule">{rule.tech} · if false the send reverts</Kv>
        <Kv k="Validity">10 min · the new account’s first nonce · no metadata</Kv>
      </Details>
    </Sheet>
  );
}

// --- Receive privately ----------------------------------------------------------------------------------------------
function PrivateReceive() {
  const { state } = useStore();
  const { set, toast } = useNav();
  return (
    <div className="body">
      <Bar title="Receive privately" onBack={() => set({ privPage: null })} />
      <Card className="paddr">
        <span className="pmark"><Icon name="eyeOff" size={26} /></span>
        <div className="label">Your private address</div>
        <div className="mono pmeta" title={PRIVATE_ADDR.meta}>{PRIVATE_ADDR.short}</div>
        <button type="button" className="lnk" id="btn-paddr-copy" onClick={() => toast('Copied your private address')}><Icon name="copy" size={15} />Copy</button>
      </Card>
      <Note icon="eyeOff">Anyone can pay this. Their wallet pays a new address made from it every time, and only you can find those payments.</Note>
      <Facts rows={[['Listed for', ACCOUNTS.main.short, 'Payers’ wallets can look it up'], ['Works on', 'Ethereum']]} />
      <div>
        <div className="secthead"><Label>Found for you{state.privIn.length > 0 && <span className="cnt">{state.privIn.length}</span>}</Label></div>
        <Card>
          {state.privIn.length
            ? state.privIn.map(p => <PaymentRow key={p.id} p={p} />)
            : <Row icon="check" iconTone="g" title="Nothing waiting" sub="Payments you moved in are in your private balance." />}
        </Card>
      </div>
      <Details>
        <Kv k="Standard">ERC-5564 scheme 1 · secp256k1 with view tags</Kv>
        <Kv k="Keys">A spending key and a viewing key, from your seed phrase · the viewing key finds payments and can’t spend them</Kv>
        <Kv k="Registry">ERC-6538 at {REGISTRY} · listed for {ACCOUNTS.main.short} on {PRIVATE_ADDR.listed}, signed by Main account</Kv>
        <Kv k="Finding">Keel reads announcements from {ANNOUNCER} and checks each view tag first, which skips 255 in 256</Kv>
        <Kv k="Address" mono>{PRIVATE_ADDR.meta}</Kv>
      </Details>
    </div>
  );
}

// A payment moved from its own address into the pool, paid for out of the payment itself.
export function PMoveSheet() {
  const { state, dispatch } = useStore();
  const sh = state.sheet;
  const close = () => dispatch({ type: 'sheet', sheet: null });
  const s = sym(sh.token), q = fmtQty(sh.token, sh.qty), fee = feeFor('pmove', sh.chain, sh.token), rule = pmoveRule(sh);
  return (
    <Sheet title="Move to private balance" onClose={close} footer={<ApproveFooter label="Move with Face ID" signer={PAYMENT_KEY} onApprove={() => dispatch({ type: 'sign' })} onReject={() => dispatch({ type: 'reject' })} note="Safenet doesn’t check private moves." />}>
      <Sentence size={20} sub={`Ethereum · from ${sh.addr}`}>Move <V>{q} {s}</V> from {sh.from}’s payment into your private balance.</Sentence>
      <Note icon="eyeOff">{sh.from} knows the address they paid. Once the money is in your private balance, where it goes next isn’t linked to that address.</Note>
      <TxTabs steps={[pmoveStep(sh)]} rule={rule} changes={pmoveChanges(sh)} />
      <Facts rows={[['Network fee', fee.amount, 'Paid from the payment'], ['Ready to send', 'After the pool approves it']]} />
      <Details>
        <Kv k="Format">EIP-8141 frame transaction from the payment’s address · default account code · ERC-8211 check step</Kv>
        <Kv k="Key">Your spending key plus a secret shared with the payer’s wallet · only you can make it</Kv>
        <Kv k="Pool">{POOL.name} · ETH pool {POOL.pool}</Kv>
        <Kv k="Fee">{fee.gas} · {fee.amount} · paid from the payment, so nothing else funds the address</Kv>
        <Kv k="Keel rule">{rule.tech} · if false the deposit reverts</Kv>
        <Kv k="Validity">10 min · the address’s first nonce</Kv>
      </Details>
    </Sheet>
  );
}

// --- Add from Main account ------------------------------------------------------------------------------------------
// A public deposit into the pool. The pool takes ETH on Ethereum, so that is the one holding offered.
function PrivateAdd() {
  const { state } = useStore();
  const { set, open } = useNav();
  const back = () => set({ privPage: null });
  const [amount, setAmount] = useState('');
  const a = (state.assets.main || []).find(x => x.token === 'eth' && x.chain === 'ethereum');
  if (!a) return <Empty title="Add to private balance" text="Main account holds no ETH on Ethereum, the one asset the pool takes." onBack={back} />;
  const fee = feeFor('shield', a.chain, a.token);
  const qty = parseFloat(amount) || 0;
  const max = floorQty(a.token, a.qty - fee.qty);
  const over = qty > max;
  const price = a.qty > 0 ? a.usd / a.qty : PRICES[a.token];
  const review = () => open({ kind: 'shield', token: a.token, chain: a.chain, qty });
  return (
    <>
      <div className="body">
        <Bar title="Add to private balance" onBack={back} />
        <Card>
          <CardHead label="From Main account" />
          <AssetRow id="padd-asset" a={a} />
          <Amount id="padd-amount" token={a.token} value={amount} onChange={setAmount} usd={qty * price} over={over} onMax={() => setAmount(String(max))} />
        </Card>
        <Note icon="eye" tone="a">Anyone can see this deposit came from Main account. Once the pool approves it, where the money goes next isn’t linked to it.</Note>
        <Facts rows={[['Ready to send', 'After the pool approves it'], ['Works with', 'ETH on Ethereum'], ['Network fee', fee.amount, fee.note]]} />
      </div>
      <div className="foot">
        <Btn kind="p" icon="plus" id="btn-padd-review" disabled={!(qty > 0 && !over)} onClick={review}>Review</Btn>
      </div>
    </>
  );
}

export function ShieldSheet() {
  const { state, dispatch } = useStore();
  const sh = state.sheet;
  const close = () => dispatch({ type: 'sheet', sheet: null });
  const s = sym(sh.token), q = fmtQty(sh.token, sh.qty), fee = feeFor('shield', sh.chain, sh.token), rule = shieldRule(sh);
  return (
    <Sheet title="Add to private balance" onClose={close} footer={<ApproveFooter label="Add with Face ID" onApprove={() => dispatch({ type: 'sign' })} onReject={() => dispatch({ type: 'reject' })} note={`Nothing but ${q} ${s} and the network fee leaves.`} />}>
      <Sentence size={20} sub="Ethereum · a public deposit">Move <V>{q} {s}</V> from Main account into your private balance.</Sentence>
      <TxTabs steps={[shieldStep(sh)]} rule={rule} changes={shieldChanges(sh)} />
      <Facts rows={[['Seen by others', 'This deposit', 'From Main account'], ['Ready to send', 'After the pool approves it'], ['Network fee', fee.amount, fee.note]]} />
      <Details>
        <Kv k="Format">EIP-8141 frame transaction from Main account · ERC-8211 check step</Kv>
        <Kv k="Pool">{POOL.name} · ETH pool {POOL.pool} · entrypoint {POOL.entry}</Kv>
        <Kv k="Approval">The pool’s association set provider checks where the money came from · if it refuses, the money can go back to Main account</Kv>
        <Kv k="Secret">The deposit’s secret comes from your seed phrase · only it can withdraw the money</Kv>
        <Kv k="Keel rule">{rule.tech} · if false the deposit reverts</Kv>
        <Kv k="Fee">{fee.gas} · {fee.amount} · paid from the account</Kv>
        <Kv k="Validity">10 min · nonce lane 2</Kv>
      </Details>
    </Sheet>
  );
}

// The tab: a receipt when one is open, a sub-page, or the private balance.
export function PrivateScreen() {
  const { state } = useStore();
  const { set } = useNav();
  const tx = state.receiptId ? state.txs.find(t => t.id === state.receiptId) : null;
  if (tx) return <Receipt tx={tx} title="Private" onBack={() => set({ receiptId: null })} />;
  if (state.privPage === 'send') return <PrivateSend />;
  if (state.privPage === 'receive') return <PrivateReceive />;
  if (state.privPage === 'add') return <PrivateAdd />;
  return <PrivateHome />;
}
