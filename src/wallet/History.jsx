import { useStore } from '../state.jsx';
import { Icon } from '../icons.jsx';
import { Btn, Card, CardHead, Row, Chip, Kv, Bar, Cl, Details, chainName } from '../ui.jsx';

export function Receipt({ tx, onBack, title = 'History' }) {
  const { dispatch } = useStore();
  const pending = tx.status === 'pending';   // approved, not yet in a block
  const waiting = tx.kind === 'xchain' && !pending;
  const stuck = tx.status === 'stuck';
  const failed = tx.status === 'failed';   // in a block, but an assertion failed and the network undid the execution
  const held = waiting || stuck || pending;
  const amber = { background: 'var(--peach)', color: 'var(--peach-ink)' };
  const red = { background: '#FBEBE9', color: '#B0433C' };
  // Only the facts this transaction actually has; a received payment has no fee, key or reference.
  const facts = [];
  if (tx.sponsor) facts.push(<Kv key="fee" k="Network fee"><Chip tone="b" icon="bolt">paid by {tx.app}</Chip></Kv>);
  else if (tx.fee && tx.fee !== '—') facts.push(<Kv key="fee" k="Network fee"><span>{tx.fee}{tx.feeNote && <div className="xs dim" style={{ fontWeight: 500 }}>{tx.feeNote}</div>}</span></Kv>);
  if (tx.checks !== '—' && !pending) facts.push(<Kv key="checks" k="Checks"><span className={failed ? '' : 'ok'} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', ...(failed ? { color: red.color } : {}) }}><Icon name={failed ? 'ban' : 'check'} size={14} />{tx.checks}</span></Kv>);
  if (tx.keyPlain !== '—') facts.push(<Kv key="key" k={tx.kind === 'app' ? 'Sent by' : 'Approved with'}>{tx.keyPlain}</Kv>);
  if (tx.reference !== '—') facts.push(<Kv key="ref" k="Reference">{tx.reference}</Kv>);
  (tx.extra || []).forEach(([k, v]) => facts.push(<Kv key={k} k={k}>{v}</Kv>));   // a private transaction's own facts: where it came from
  return (
    <>
      <div className="body">
        <Bar title={title} onBack={onBack} />
        <div className="status" style={{ padding: '6px 0 4px' }}>
          <span className="bigok" style={held ? amber : failed ? red : undefined}><Icon key={held ? 'clock' : failed ? 'ban' : 'check'} name={held ? 'clock' : failed ? 'ban' : 'check'} size={30} /></span>   {/* keyed so the mark pops in when the receipt settles */}
          <h2 className="h2">{tx.title}</h2>
          <div className="sm mut">{stuck ? 'Stuck' : pending ? 'Confirming' : waiting ? 'Base done · Arbitrum waiting' : failed ? 'Undone' : 'Done'} · {tx.chain === '4 chains' ? 'all 4 networks' : chainName(tx.chain)} · {tx.time}</div>
          {stuck && <div style={{ marginTop: 4 }}><Chip tone="a" icon="clock">Waiting · {tx.why}</Chip></div>}
        </div>
        <Card>
          <CardHead label="What happened" />
          {tx.steps && tx.steps.length > 0
            ? tx.steps.map((s, i) => { const st = typeof s === 'string' ? { text: s } : s; const wait = held && (pending || i > 0); return <Cl key={i} ok={!wait && st.ok !== false} icon={wait ? 'clock' : undefined}>{st.text}</Cl>; })
            : <div style={{ padding: '0 16px 10px' }} className="sm">{tx.summary}</div>}
          <div style={{ height: 6 }} />
        </Card>
        {stuck && <Card><div style={{ padding: '12px 16px' }} className="sm mut">{tx.summary}</div></Card>}
        {facts.length > 0 && <Card>{facts}</Card>}
        {!pending && tx.phases && tx.phases.length > 0 && (
          <Details>
            {tx.changes.map(([k, v]) => <Kv key={k} k={k} mono>{v}</Kv>)}
            {tx.phases.map(p => <Kv key={p.n} k={`Phase ${p.n}`}>{p.name} · {p.ok === null ? 'waiting' : p.ok === false ? 'failed' : 'ok'}</Kv>)}
            {tx.validity !== '—' && <Kv k="Valid">{tx.validity} · {tx.lane}</Kv>}
            <Kv k="Signed with">{tx.keyUsed}</Kv>
            <Kv k="Metadata" mono>{tx.metadata}</Kv>
            <Kv k="Hash" mono>{tx.short}</Kv>
          </Details>
        )}
      </div>
      <div className="foot">
        {stuck
          ? <Btn kind="p" icon="speed" id="btn-speedup" onClick={() => dispatch({ type: 'toast', text: 'Speeding up isn’t part of this mockup' })}>Speed up</Btn>
          : <Btn kind="s" icon="ext" id="btn-framescan" onClick={() => dispatch({ type: 'set', patch: { browserTab: 'framescan', fxTab: 'tx', fxTx: tx.id, ...(tx.private || tx.priv ? { fxChain: tx.chain } : {}) } })}>See it on Framescan</Btn>}
      </div>
    </>
  );
}

// One history line. A stuck payment shows its state in place of the time, so it needs no banner elsewhere. Anything on
// the private side (a deposit into the pool, a private send, a payment to your private address) wears the ink tile.
export function TxRow({ t, time, onClick }) {
  const stuck = t.status === 'stuck', pending = t.status === 'pending', failed = t.status === 'failed';
  if (failed) return <Row icon="ban" iconTone="x" title={t.title} sub="Undone · only the fee was paid" right={<Chip tone="x">Undone</Chip>} onClick={onClick} />;
  const icon = stuck || pending ? 'clock' : t.kind === 'in' ? 'receive' : t.kind === 'out' ? 'send' : t.kind === 'swap' ? 'swap' : t.kind === 'key' ? 'key' : t.kind === 'xchain' ? 'link' : t.kind === 'app' ? 'grid' : t.kind === 'shield' || t.kind === 'move' ? 'eyeOff' : 'check';
  const tone = stuck || pending ? 'a' : t.private || t.priv ? 'p' : t.kind === 'batch' || t.kind === 'swap' ? 'g' : t.kind === 'xchain' || t.kind === 'in' ? 'b' : 'l';
  const appPaid = t.sponsor || (t.payer && /paid$/.test(t.payer.tag || ''));   // the app's session account relayed or sent it
  const sub = stuck ? `Stuck · ${t.why}` : pending ? 'Confirming' : t.sub ? t.sub : appPaid ? `${t.app} paid the network fee` : (t.chain === '4 chains' ? 'On all 4 networks' : chainName(t.chain));
  const right = stuck ? <Chip tone="a">Stuck</Chip> : pending ? <Chip tone="a">Confirming</Chip> : <span className="xs dim">{time}</span>;
  return <Row icon={icon} iconTone={tone} title={t.title} sub={sub} right={right} onClick={onClick} />;
}

export function History() {
  const { state, dispatch } = useStore();
  const tx = state.txs.find(t => t.id === state.receiptId);
  if (tx) return <Receipt tx={tx} onBack={() => dispatch({ type: 'set', patch: { receiptId: null } })} />;
  return (
    <div className="body">
      <div className="bar"><span className="ttl" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>History</span></div>
      <Card>
        {state.txs.filter(t => !t.private).map(t => (   /* private sends and payments live on the Private tab */
          <TxRow key={t.id} t={t} time={t.time} onClick={() => dispatch({ type: 'set', patch: { receiptId: t.id } })} />
        ))}
      </Card>
    </div>
  );
}
