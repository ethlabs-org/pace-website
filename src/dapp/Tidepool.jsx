import { useState, useRef, useEffect } from 'react';
import { useStore } from '../state.jsx';
import { Icon } from '../icons.jsx';
import { ChainDot } from '../ui.jsx';
import { ACCOUNTS, TX_BATCH, TX_XCHAIN, TX_CLAIM, TOKENS, TIDEPOOL_REQ, TIDEPOOL_STRATEGY, permText, permUsage, fmtQty, shortDate, dateAfter } from '../data.js';

// Sections: id, label, icon. Below 460px only the open section keeps its label; the others are their icon with a tooltip.
const PAGES = [['vault', 'Vaults', 'vault'], ['automation', 'Pro', 'trend'], ['bridge', 'Cross-chain', 'bridge'], ['orders', 'Orders', 'tag'], ['signin', 'Sign in', 'user']];

function Nav() {
  const { state, dispatch } = useStore();
  const chain = state.dappPage === 'bridge' ? 'base' : 'ethereum';
  const chainName = chain === 'base' ? 'Base' : 'Ethereum';
  return (
    <div className="nav">
      <div className="row1">
        <span className="brand"><span className="mk"><Icon name="wave" size={17} /></span>Tidepool</span>
        <span className="right">
          <span className="pill" title={chainName}><ChainDot id={chain} size={18} /><span className="pname">{chainName}</span><Icon name="chevD" size={14} className="mut" /></span>
          <span className="pill" title={state.signedIn ? 'Connected · signed in' : 'Connected'}><span className={'avatar' + (state.signedIn ? ' in' : '')} /><span className="mono" style={{ fontWeight: 500 }}>{ACCOUNTS.main.short}</span><Icon name="chevD" size={14} className="mut" /></span>
        </span>
      </div>
      <div className="links">{PAGES.map(([id, label, icon]) => <button type="button" key={id} id={'dp-' + id} className={state.dappPage === id ? 'on' : ''} title={label} onClick={() => dispatch({ type: 'set', patch: { dappPage: id } })}><Icon name={icon} size={15} /><span className="tl">{label}</span></button>)}</div>
    </div>
  );
}

// A quiet row of icon + value. The key word lives in the tooltip; anything a user would infer is left out.
function Fact({ icon, chain, tip, tone = '', mono, children }) {
  return <span className={'fact ' + tone} title={tip}>{chain ? <ChainDot id={chain} size={14} /> : icon && <Icon name={icon} size={14} />}<span className={mono ? 'mono' : ''}>{children}</span></span>;
}
function Facts({ col, children }) { return <div className={'facts' + (col ? ' col' : '')}>{children}</div>; }

const walletName = s => s.skin === 'lantern' ? 'Lantern' : 'Keel';
// The action button of a page (`sec`: the page's second action, in the quiet style). It sends the request to the wallet,
// then waits with a spinner while the phone holds it; a rejection leaves a one-line notice under it until dismissed or
// the next request.
function Action({ kind, id, icon, sheet, sec, children }) {
  const { state, dispatch } = useStore();
  const waiting = !!state.sheet && state.sheet.kind === kind;
  const rejectedNow = !!state.flow && state.flow.kind === kind && state.flow.phase === 'rejected';
  const wallet = walletName(state);
  // When the Anchor takes over, its panel under the browser grows and the page gets shorter, which can push this
  // button out of view. Keep it in view, so the app still shows what is waiting for approval.
  const ref = useRef(null);
  const live = !!(state.hw && state.hw.active);
  useEffect(() => {
    if (!waiting || !live) return undefined;
    const t = setTimeout(() => { if (ref.current) ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 120);
    return () => clearTimeout(t);
  }, [waiting, live]);
  return (
    <>
      {waiting
        ? <button ref={ref} type="button" className="btn wait" disabled aria-busy="true"><span className="spin" aria-hidden="true" />Confirm in {wallet}</button>
        : <button type="button" className={'btn' + (sec ? ' s' : '')} id={id} onClick={() => dispatch({ type: 'sheet', sheet: sheet || { kind } })}>{icon && <Icon name={icon} size={18} />}{children}</button>}
      {rejectedNow && <div className="notice" role="status"><Icon name="ban" size={15} /><span className="grow">Rejected in {wallet}</span><button type="button" className="nx" aria-label="Dismiss" onClick={() => dispatch({ type: 'flow', flow: null })}><Icon name="x" size={14} /></button></div>}
    </>
  );
}

function ApyChart() {
  const vals = [3.9, 3.92, 3.95, 3.93, 3.98, 4.02, 4.05, 4.01, 4.04, 4.08, 4.12, 4.1, 4.15, 4.13, 4.18, 4.22, 4.2, 4.17, 4.21, 4.25, 4.23, 4.27, 4.24, 4.28, 4.26, 4.22, 4.19, 4.21, 4.2, 4.2];
  const w = 400, h = 150, pl = 36, pr = 12, pt = 10, pb = 24, lo = 3.6, hi = 4.6;
  const x = i => pl + i * (w - pl - pr) / (vals.length - 1);
  const y = v => pt + (hi - v) * (h - pt - pb) / (hi - lo);
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `M${x(0).toFixed(1)},${y(vals[0]).toFixed(1)} ` + vals.map((v, i) => `L${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ') + ` L${x(vals.length - 1).toFixed(1)},${h - pb} L${x(0).toFixed(1)},${h - pb} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', width: '100%', height: 'auto' }} aria-label="APY over the last 30 days">
      <defs>
        <linearGradient id="apy-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--t-acc)" stopOpacity="0.16" /><stop offset="1" stopColor="var(--t-acc)" stopOpacity="0" /></linearGradient>
      </defs>
      {[3.8, 4.0, 4.2, 4.4].map(g => <g key={g}><line x1={pl} y1={y(g)} x2={w - pr} y2={y(g)} stroke="var(--line-2)" strokeWidth="1" /><text x={pl - 7} y={y(g) + 4} textAnchor="end" fontSize="10" fill="var(--dim)" fontFamily="inherit" style={{ fontVariantNumeric: 'tabular-nums' }}>{g.toFixed(1)}%</text></g>)}
      <path d={area} fill="url(#apy-fill)" />
      <polyline points={pts} fill="none" stroke="var(--t-acc)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(29)} cy={y(vals[29])} r="4.5" fill="var(--t-acc)" stroke="#fff" strokeWidth="2.5" />
      {[[0, 'Aug 13'], [14, 'Aug 27'], [29, 'Sep 11']].map(([i, l]) => <text key={l} x={x(i)} y={h - 7} textAnchor={i === 0 ? 'start' : i === 29 ? 'end' : 'middle'} fontSize="10" fill="var(--dim)" fontFamily="inherit">{l}</text>)}
    </svg>
  );
}

// A step: an icon tile (or the network's logo) with the step number badged on it, one line of text, an optional chip on the right.
function Step({ n, icon, chain, title, right }) {
  return (
    <div className="step">
      <span className={'si' + (chain ? ' ch' : '')}>{chain ? <ChainDot id={chain} size={26} /> : <Icon name={icon} size={15} />}{n && <i>{n}</i>}</span>
      <span className="grow tt">{title}</span>
      {right && <span className="sr">{right}</span>}
    </div>
  );
}
function Cl({ ok = true, icon, children }) {
  return <div className="cl"><span className={'ico ' + (icon ? '' : ok ? 'ok' : 'no')}><Icon name={icon || (ok ? 'check' : 'ban')} size={15} /></span><span className="grow">{children}</span></div>;
}

function Vault() {
  const { state, dispatch } = useStore();
  const [amount, setAmount] = useState('1,000');
  return (
    <div className="wrap">
      <h1 className="h1">ETH Vault</h1>
      <div className="kpis">
        <div className="kpi"><div className="l">APY</div><div className="v">4.2%</div></div>
        <div className="kpi"><div className="l">Deposits</div><div className="v">$48.2M</div></div>
        <div className="kpi"><div className="l">Position</div><div className="v">{state.deposited ? '0.6338' : '0.3169'}<small>tpETH</small></div></div>
      </div>
      <div className="card panel">
        {state.deposited ? (
          <>
            <div className="okbox"><Icon name="check" size={20} className="ok" /><span><b>0.3169 tpETH</b> deposited</span></div>
            <button type="button" className="btn s" onClick={() => dispatch({ type: 'set', patch: { browserTab: 'framescan', fxTab: 'tx', fxTx: 'tx-batch' } })}><Icon name="ext" size={16} />View on Framescan</button>
            <button type="button" className="lnk center" id="btn-deposit-again" onClick={() => dispatch({ type: 'set', patch: { deposited: false } })}><Icon name="refresh" size={14} />Deposit again</button>
          </>
        ) : (
          <>
            <div className="tabs"><span className="on"><Icon name="arrowDown" size={14} />Deposit</span><span><Icon name="arrowUp" size={14} />Withdraw</span></div>
            <div className="field"><div className="fl"><span>You pay</span><span className="bal"><Icon name="wallet" size={12} />2,480.15 USDC</span></div><div className="fv"><input className="amt" value={amount} onChange={e => setAmount(e.target.value)} aria-label="Amount in USDC" /><span className="tok"><span className="ci" style={{ background: 'var(--t-acc)' }}>$</span>USDC</span></div></div>
            <div className="arrrow"><span className="arr"><Icon name="arrowDown" size={16} className="mut" /></span></div>
            <div className="field"><div className="fl"><span>You receive</span><span>≈ $999.40</span></div><div className="fv"><span className="amt">0.3169</span><span className="tok"><span className="ci" style={{ background: 'var(--ink)' }}>Ξ</span>tpETH</span></div></div>
            <div className="steps">
              <Step n="1" icon="shield" title="Check balance ≥ 1,000 USDC" />
              <Step n="2" icon="swap" title={`Swap ${amount} USDC for ETH`} />
              <Step n="3" icon="vault" title="Deposit the ETH into ETH Vault" right={<span className="chip g"><Icon name="sigma" size={12} />computed</span>} />
              <Step n="4" icon="send" title="Tip 0.005 ETH" />
            </div>
            <Facts>
              <Fact icon="bolt" tip="Network fee, taken in USDC">≈ 0.09 USDC</Fact>
              <Fact icon="clock" tip="Valid for">10 min</Fact>
              <Fact icon="pen" tip="One transaction, one signature">1 signature</Fact>
            </Facts>
            <Action kind="batch" id="btn-deposit">Swap & deposit</Action>
          </>
        )}
      </div>
      {/* rewards the vault has paid out, claimed in one call (the tutorial's lock chapter) */}
      <div className="card">
        <div className="chead"><span className="h3">Rewards</span><span className="sm mut">paid in USDC</span></div>
        <div className="cbody">
          <Facts>
            <Fact icon="coins" tip="Rewards to claim">18.40 USDC</Fact>
            <Fact icon="calendar" tip="Earned since">since Aug 13</Fact>
            <Fact icon="bolt" tip="Network fee, paid in ETH">≈ 0.000015 ETH</Fact>
          </Facts>
          <Action kind="claim" id="btn-claim" sec>Claim rewards</Action>
        </div>
      </div>
      <div className="card">
        <div className="chead"><span className="h3">APY</span><span className="sm mut">30 days</span></div>
        <div className="cbody"><ApyChart /></div>
      </div>
    </div>
  );
}

// A token as Tidepool draws it: a coloured circle with the symbol's first glyph (the same idiom as the deposit form).
const TOK = { usdc: ['$', 'var(--t-acc)'], eth: ['Ξ', 'var(--ink)'] };
function TokIcon({ token, size = 20 }) { const [g, bg] = TOK[token] || TOK.eth; return <span className="ci" style={{ background: bg, width: size, height: size, fontSize: Math.round(size * 0.5) }}>{g}</span>; }
const roundTo = (t, n) => Number(n.toFixed(t === 'usdc' ? 2 : 4));

// A granted permission and what is left of it: its title, a usage bar, one line of numbers.
function Use({ p }) {
  const cap = p.kind === 'stream' ? p.max : p.amount;
  const pct = cap > 0 ? Math.min(100, Math.round(100 * (p.spent || 0) / cap)) : 0;
  return <div className="use"><TokIcon token={p.token} size={26} /><span className="grow"><div className="tt">{permText(p).title}</div><div className="usebar"><i style={{ width: pct + '%' }} /></div><div className="sm mut">{permUsage(p)}</div></span></div>;
}
// One run under the grant: it landed, or the manager declined it in simulation and nothing moved.
function Run({ r, token, onScan }) {
  const s = TOKENS[token].symbol;
  return (
    <div className={'run' + (r.ok ? '' : ' bad')}>
      <span className="ri"><Icon name={r.ok ? 'check' : 'ban'} size={14} /></span>
      <span className="grow">{r.ok ? <><b>Charged {fmtQty(token, r.amount)} {s}</b></> : <><b>Declined</b> · {r.text}. Nothing moved.</>}</span>
      {r.ok && <button type="button" className="lnk" onClick={onScan}><Icon name="ext" size={13} />Framescan</button>}
    </div>
  );
}

// The Pro page: a subscription. Tidepool asks for one permission, encoded by the app (TIDEPOOL_STRATEGY in data.js):
// take up to the monthly price in USDC each month, for the term the user picks. The page shows the price as fixed, the
// term as the one choice, the rest as facts, and one button. Once subscribed: what is left this month, and charges the
// demo can run, each redeemed through the policy manager (ERC-7710) or declined in simulation when over the limit.
function Automation() {
  const { state, dispatch } = useStore();
  const S = TIDEPOOL_STRATEGY;
  const [days, setDays] = useState(S.vars.days);
  const req = S.request({ days });
  const sess = state.sessions.find(x => x.app === 'Tidepool');
  const price = `${fmtQty(S.token, S.price)} ${TOKENS[S.token].symbol}`;
  const cannot = (
    <div className="card aside">
      <div className="chead"><span className="h3"><Icon name="ban" size={15} className="mut" />Tidepool can’t</span></div>
      <div className="cbody">
        <Cl ok={false}>Take more than {price} a month</Cl>
        <Cl ok={false}>Move anything else</Cl>
        <Cl ok={false}>Charge after the term ends</Cl>
        <Cl ok={false}>Change your keys</Cl>
      </div>
    </div>
  );
  const facts = (
    <Facts>
      <Fact icon="calendar" tip="One charge a month at most">Charged monthly</Fact>
      <Fact icon="lock" tip="The permission allows only USDC, up to the price">{price} at most</Fact>
      <Fact icon="bolt" tip={`Tidepool’s billing account ${req.to.short} sends and pays for every charge`}>Fees paid by Tidepool</Fact>
    </Facts>
  );
  if (!state.sessionEnabled || !sess) {
    return (
      <div className="wrap">
        <h1 className="h1">Tidepool Pro</h1>
        <p className="lead">{S.outcome}</p>
        <div className="grid">
          <div className="card">
            <div className="cbody solo">
              <div className="field">
                <div className="fl"><span>Price</span><span>set by Tidepool</span></div>
                <div className="fv"><span className="amt">{fmtQty(S.token, S.price)}</span><span className="tok"><TokIcon token={S.token} />{TOKENS[S.token].symbol} a month</span></div>
              </div>
              <div className="fld"><div className="fl"><span>Subscribe for</span><span title={`Until ${dateAfter(days, true)}`}>until {dateAfter(days)}</span></div><div className="seg" role="tablist">{S.durations.map(([d, label]) => <button type="button" key={d} id={'days-' + d} role="tab" aria-selected={days === d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{label}</button>)}</div></div>
              {facts}
              <Action kind="session" id="btn-enable-session" sheet={{ kind: 'session', req }}>Subscribe</Action>
            </div>
          </div>
          {cannot}
        </div>
      </div>
    );
  }
  // Subscribed: what is left this month, and the charges the demo can run. The first is this month's price, which
  // fits; the second is the same price again, a second charge in the same month, which the policy declines. A button's
  // id counts the buttons (`btn-use-0`); `data-use` names it by its permission (`btn-use-p-usdc-1`), so it stays the
  // same button when another goes.
  const spend = sess.perms.filter(p => p.kind !== 'call');
  const tries = spend.flatMap(p => p.kind === 'periodic' ? [p.amount, p.amount].map((a, k) => ({ p, a, k, again: k > 0 })) : [{ p, a: roundTo(p.token, p.rate), k: 0 }]);
  const redeem = (p, a) => dispatch({ type: 'redeem', sessionId: sess.id, permId: p.id, amount: a });
  const runs = state.runs.slice(0, 4);
  return (
    <div className="wrap">
      <h1 className="h1">Tidepool Pro</h1>
      <div className="grid">
        <div className="card">
          <div className="chead"><span className="h3"><Icon name="check" size={15} className="ok" />Subscribed</span><span className="chip g"><Icon name="calendar" size={12} />until {shortDate(sess.expiry)}</span></div>
          <div className="cbody">
            <div className="uses">{spend.map(p => <Use key={p.id} p={p} />)}</div>
            {facts}
            {tries.length > 0 && <div className="fld"><div className="fl"><span>Try a charge</span></div><div className="row3" style={{ gridTemplateColumns: `repeat(${tries.length}, minmax(0, 1fr))` }}>{tries.map(({ p, a, k, again }, i) => <button type="button" key={i} className="btn s" id={`btn-use-${i}`} data-use={`btn-use-${p.id}-${k}`} onClick={() => redeem(p, a)}>{again ? 'Again' : 'Charge'} {fmtQty(p.token, a)} {TOKENS[p.token].symbol}</button>)}</div></div>}
            {runs.length > 0 && <div className="runs">{runs.map(r => { const p = sess.perms.find(x => x.id === r.permId) || { token: 'usdc' }; return <Run key={r.id} r={r} token={p.token} onScan={() => dispatch({ type: 'set', patch: { browserTab: 'framescan', fxTab: 'tx', fxTx: r.txId } })} />; })}</div>}
            <button type="button" className="lnk center" id="btn-turn-off" onClick={() => dispatch({ type: 'sheet', sheet: { kind: 'revokeSession', sessionId: sess.id, byApp: true } })}><Icon name="x" size={14} />Cancel Tidepool Pro</button>
          </div>
        </div>
        {cannot}
      </div>
    </div>
  );
}

function Bridge() {
  const { state } = useStore();
  const done = !!state.bridgeStatus;
  return (
    <div className="wrap">
      <h1 className="h1">Cross-chain deposit</h1>
      <div className="card">
        <div className="cbody solo">
          <div className="field"><div className="fl"><span>From</span><span className="bal"><Icon name="wallet" size={12} />3,900.00 USDC</span></div><div className="fv"><span className="amt">2,000</span><span className="tok"><ChainDot id="base" size={22} />Base · USDC</span></div></div>
          <div className="arrrow"><span className="arr"><Icon name="arrowDown" size={16} className="mut" /></span></div>
          <div className="field"><div className="fl"><span>To</span><span>USDC Vault · 5.1% APY</span></div><div className="fv"><span className="amt">2,000</span><span className="tok"><ChainDot id="arbitrum" size={22} />Arbitrum</span></div></div>
          <div className="steps">
            <Step n="1" chain="base" title="Send 2,000 USDC to the bridge" right={done && <span className="chip g"><Icon name="check" size={12} />done</span>} />
            <Step n="2" chain="arbitrum" title="Deposit it once it lands" right={done ? <span className="chip a"><Icon name="clock" size={12} />waiting</span> : <span className="chip g"><Icon name="sigma" size={12} />computed</span>} />
          </div>
          <Facts>
            <Fact icon="bolt" tip="Network fee, both networks">≈ 0.02 USDC</Fact>
            <Fact icon="clock" tip="Valid for">24 h</Fact>
            <Fact icon="pen" tip="One signature covers both chains">1 signature</Fact>
          </Facts>
          {!done
            ? <Action kind="xchain" id="btn-bridge">Bridge & deposit</Action>
            : <div className="okbox"><Icon name="check" size={18} className="ok" /><span>Base done · Arbitrum runs when the funds land</span></div>}
        </div>
      </div>
    </div>
  );
}

function Orders() {
  const { state } = useStore();
  return (
    <div className="wrap">
      <h1 className="h1">Limit order</h1>
      <div className="card">
        <div className="cbody solo">
          <div className="steps">
            <Step n="1" chain="ethereum" title="Sell 0.5 ETH at ≥ 3,300 USDC" />
            <Step n="2" chain="arbitrum" title="Sell 0.2 ETH at ≥ 3,300 USDC" />
          </div>
          <Facts>
            <Fact icon="pen" tip="One signature covers both entries">1 signature</Fact>
            <Fact icon="calendar" tip="Valid until">Until Sep 18</Fact>
          </Facts>
          {!state.orderSigned
            ? <Action kind="order" id="btn-order">Place order</Action>
            : <div className="okbox"><Icon name="check" size={18} className="ok" /><span>Order live on both chains</span></div>}
        </div>
      </div>
    </div>
  );
}

// Signing a message: the sign-in request and what Tidepool learns from the signature. No transaction is involved.
const SIGNIN_MESSAGE = `tidepool.fi wants you to sign in with your account:
${ACCOUNTS.main.address}

Sign in to Tidepool. This is a message, not a transaction: nothing is sent and nothing is paid.

URI: https://tidepool.fi
Chain ID: 1
Nonce: 8f2a91c4
Issued at: 2026-09-11T14:02:00Z
Expires: 2026-09-11T14:17:00Z`;

function SignIn() {
  const { state, dispatch } = useStore();
  return (
    <div className="wrap">
      <h1 className="h1">Sign in</h1>
      <div className="card">
        {!state.signedIn ? (
          <div className="cbody solo">
            <pre className="msg">{SIGNIN_MESSAGE}</pre>
            <Action kind="signin" id="btn-connect" icon="wallet">Sign in with wallet</Action>
          </div>
        ) : (
          <>
            <div className="chead"><span className="h3"><Icon name="check" size={15} className="ok" />Signed in</span><span className="chip g mono">{ACCOUNTS.main.short}</span></div>
            <div className="cbody">
              <Facts col>
                <Fact icon="key" tip="Signed with">{state.signedInKey || 'iPhone 16 Pro · key #1 · passkey'}</Fact>
                <Fact icon="check" tone="g" tip="That key can">Send transactions</Fact>
                <Fact icon="ban" tone="x" tip="That key can’t">Change your keys</Fact>
              </Facts>
              <button type="button" className="btn s" id="btn-signout" onClick={() => dispatch({ type: 'set', patch: { signedIn: false, signedInKey: null } })}><Icon name="x" size={15} />Sign out</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// What the dialog says per request: the busy title while the network confirms, then the result and its facts.
const RESULTS = {
  batch: { busy: 'Confirming on Ethereum', title: 'Deposited', amt: '0.3169 tpETH', sub: '≈ $999.40 · ETH Vault', tx: TX_BATCH,
    facts: [{ icon: 'shield', tone: 'g', tip: 'Transaction assertions', v: '5 of 5 passed' }, { icon: 'bolt', tip: 'Network fee, taken in USDC', v: '0.09 USDC' }, { icon: 'hash', tip: 'Transaction', v: TX_BATCH.short, mono: true }] },
  xchain: { busy: 'Confirming on Base', title: 'Sent from Base', amt: '2,000 USDC', sub: 'Arbitrum deposits it when it lands', tx: TX_XCHAIN,
    facts: [{ icon: 'bolt', tip: 'Network fee, both networks', v: '0.02 USDC' }, { icon: 'clock', tone: 'a', tip: 'Arbitrum waits up to', v: '24 h' }, { icon: 'hash', tip: 'Transaction', v: TX_XCHAIN.short, mono: true }] },
  session: (f) => { const req = f.req || TIDEPOOL_REQ(); const p = req.perms[0]; return { busy: 'Confirming on Ethereum', title: `${req.what} is on`, sub: `${permText(p).title} · until ${dateAfter(req.days)}`,
    facts: [{ icon: 'key', tip: 'Permission granted', v: '1 permission' }, { icon: 'user', tip: 'The account that charges', v: req.to.name }, { icon: 'bolt', tip: 'Tidepool sends and pays for every charge', v: 'Fees paid by Tidepool' }] }; },
  // Undone on chain: an assertion failed, so nothing moved. The transaction is in a block and its fee is paid.
  claim: { busy: 'Confirming on Ethereum', title: 'Claim undone', bad: true, sub: 'It also tried to move your tpETH. The network undid it.', tx: TX_CLAIM,
    facts: [{ icon: 'shield', tone: 'x', tip: 'Transaction assertions', v: 'Failed · no assertion allowed tpETH to move' }, { icon: 'bolt', tip: 'Network fee, paid anyway', v: '0.000015 ETH' }, { icon: 'hash', tip: 'Transaction', v: TX_CLAIM.short, mono: true }] },
  order: { busy: 'Placing order', title: 'Order placed', sub: 'Live on Ethereum and Arbitrum',
    facts: [{ chain: 'ethereum', tip: 'Ethereum', v: '0.5 ETH at ≥ 3,300 USDC' }, { chain: 'arbitrum', tip: 'Arbitrum', v: '0.2 ETH at ≥ 3,300 USDC' }, { icon: 'calendar', tip: 'Valid until', v: 'Until Sep 18' }] },
};

// Tidepool's own dialog, over the page once the wallet has approved: a spinner while the network confirms, then the result.
// Browser.jsx renders it beside the scrolling page so it sits in the window, not in the document.
export function TidepoolModal() {
  const { state, dispatch } = useStore();
  const f = state.flow;
  const c = f && (typeof RESULTS[f.kind] === 'function' ? RESULTS[f.kind](f) : RESULTS[f.kind]);
  if (!c || (f.phase !== 'confirming' && f.phase !== 'done')) return null;
  const done = f.phase === 'done';
  const close = () => dispatch({ type: 'flow', flow: null });
  const scan = () => dispatch({ type: 'set', patch: { flow: null, browserTab: 'framescan', fxTab: 'tx', fxTx: c.tx.id } });
  return (
    <div className="t tmodal" onClick={done ? close : undefined}>
      <div className="dlg" role="dialog" aria-modal="true" aria-label={done ? c.title : c.busy} onClick={e => e.stopPropagation()}>
        {done && <button type="button" className="xb" aria-label="Close" onClick={close}><Icon name="x" size={16} /></button>}
        <span className={'ring' + (done ? (c.bad ? ' no' : ' ok') : '')}>{done ? <Icon name={c.bad ? 'ban' : 'check'} size={32} /> : <span className="spin" aria-hidden="true" />}</span>
        <div>
          <div className="h2">{done ? c.title : c.busy}</div>
          {done && c.amt && <div className="amt">{c.amt}</div>}
          <div className="sub">{done ? c.sub : `${f.kind === 'order' ? 'Signed' : 'Approved'} in ${walletName(state)}`}</div>
        </div>
        {done && (
          <>
            <div className="fbox"><Facts col>{c.facts.map((x, i) => <Fact key={i} icon={x.icon} chain={x.chain} tone={x.tone || ''} tip={x.tip} mono={x.mono}>{x.v}</Fact>)}</Facts></div>
            <div className="btns">
              {c.tx && <button type="button" className="btn s" id="btn-result-scan" onClick={scan}><Icon name="ext" size={16} />View on Framescan</button>}
              <button type="button" className="btn" id="btn-result-done" onClick={close}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Tidepool() {
  const { state } = useStore();
  const page = { automation: <Automation />, bridge: <Bridge />, orders: <Orders />, signin: <SignIn /> }[state.dappPage] || <Vault />;
  return <div className="scr t"><Nav />{page}</div>;
}
