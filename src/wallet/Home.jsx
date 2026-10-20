import { useState } from 'react';
import { useStore } from '../state.jsx';
import { Icon } from '../icons.jsx';
import { Card, Row, Chip, Label, Bar, TokenMark, AppMark, chainName } from '../ui.jsx';
import { ACCOUNTS, TOKENS, totalUsd, sessionSummary } from '../data.js';
import { TxRow } from './History.jsx';

const SHOW = 3;   // rows the tabbed card shows before "See all"; the list keeps this height on both tabs

// One holding, laid out exactly like a history line so the two tabs read the same.
function AssetRow({ a }) {
  return (
    <Row lead={<TokenMark token={a.token} chain={a.chain} />} title={TOKENS[a.token].name} sub={`${a.amount} · ${chainName(a.chain)}`}
      right={<span className="val"><div className="tt">{a.value}</div><div className={'ss' + (a.up ? ' ok' : '')}>{a.change}</div></span>} />
  );
}

// The full list, reached from "See all" on the home card.
export function AssetsScreen() {
  const { state, dispatch } = useStore();
  const assets = state.assets[state.accountId] || [];
  return (
    <div className="body">
      <Bar title="Assets" onBack={() => dispatch({ type: 'set', patch: { homePage: null } })} />
      <div className="hero" style={{ padding: '0 0 4px' }}>
        <div className="xs mut" style={{ fontWeight: 500 }}>Total balance</div>
        <div className="big">{totalUsd(assets)}</div>
      </div>
      <Card>{assets.map(a => <AssetRow key={a.id} a={a} />)}</Card>
    </div>
  );
}

// One app's access, small enough that several fit side by side: logo, what it does, then three icon-led facts.
function PermCard({ app, name, what, perms, onClick }) {
  return (
    <button type="button" className="pcard" onClick={onClick}>
      <span className="hd"><AppMark app={app} /><span className="grow"><div className="n">{name}</div><div className="d">{what}</div></span></span>
      <span className="perms">
        {perms.map(([icon, text]) => <span className="perm" key={icon}><Icon name={icon} size={14} /><span>{text}</span></span>)}
      </span>
    </button>
  );
}

export function Home() {
  const { state, dispatch } = useStore();
  const acct = ACCOUNTS[state.accountId];
  const [menu, setMenu] = useState(false);
  const [tab, setTab] = useState('assets');
  const go = (patch) => dispatch({ type: 'set', patch });
  const open = (sheet) => dispatch({ type: 'sheet', sheet });
  const toast = (text) => dispatch({ type: 'toast', text });
  const assets = state.assets[state.accountId] || [];
  const keys = state.keys[state.accountId] || [];
  const sessions = state.accountId === 'main' ? state.sessions : [];
  const sessionKeys = keys.filter(k => k.manager);
  const permCount = sessions.length + sessionKeys.length;
  const txs = state.accountId === 'main' ? state.txs.filter(t => !t.private) : [];   // private sends and payments live on the Private tab
  return (
    <div className="body">
      <div className="bar" style={{ position: 'relative' }}>
        <button type="button" id="btn-account" className="acct" onClick={() => setMenu(m => !m)}>
          <span className="avatar" style={{ background: state.accountId === 'main' ? 'linear-gradient(135deg,#2FA36B 0%,#0E6F47 60%,#0B4A31 100%)' : 'linear-gradient(135deg,#3B9BD9 0%,#1A56C4 60%,#12377E 100%)' }} />
          <span className="ttl">{acct.name}</span><Icon name="chevD" size={18} className="mut" />
        </button>
        <button type="button" className="addr" onClick={() => toast(`Copied ${acct.short}`)}><span className="mono">{acct.short}</span><Icon name="copy" size={14} className="mut" /></button>
        {menu && (
          <div className="menu">
            {Object.values(ACCOUNTS).map(a => (
              <button type="button" key={a.id} id={'acct-' + a.id} className={'mi' + (a.id === state.accountId ? ' on' : '')} onClick={() => { setMenu(false); go({ accountId: a.id }); }}>
                <span className="grow"><div className="tt">{a.name}</div><div className="ss">{a.controlledBy ? 'Managed by your ' + a.controlledBy.toLowerCase() : 'Your everyday account'}</div></span>
                {a.id === state.accountId && <Icon name="check" size={18} className="ok" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="hero">
        <div className="xs mut" style={{ fontWeight: 500 }}>Total balance</div>
        <div className="big">{totalUsd(assets)}</div>
        <div className="herosub">
          {state.locked
            ? <Chip tone="a" icon="lock">Changes frozen</Chip>
            : <><span className="ok" style={{ fontWeight: 600 }}>{state.accountId === 'main' && assets.length ? '+$148.20 (1.2%)' : '+$0.00 (0.0%)'}</span><span className="dim">today</span></>}
        </div>
      </div>

      <div className="quick">
        <button type="button" id="btn-send" onClick={() => go({ homePage: 'send' })}><span className="qi"><Icon name="send" size={22} /></span>Send</button>
        <button type="button" onClick={() => toast(`Receive at ${acct.short} · any network`)}><span className="qi"><Icon name="receive" size={22} /></span>Receive</button>
        <button type="button" id="btn-swap" onClick={() => go({ homePage: 'swap' })}><span className="qi"><Icon name="swap" size={22} /></span>Swap</button>
        <button type="button" onClick={() => toast('Buying isn’t part of this mockup')}><span className="qi"><Icon name="plus" size={22} /></span>Buy</button>
      </div>

      <div className="tabbed">
        <Card>
          <div className="ctabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'assets'} className={tab === 'assets' ? 'on' : ''} onClick={() => setTab('assets')}><Icon name="coins" size={17} />Assets</button>
            <button type="button" role="tab" aria-selected={tab === 'history'} className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}><Icon name="list" size={17} />History</button>
          </div>
          <div className="list">
            {tab === 'assets' && assets.slice(0, SHOW).map(a => <AssetRow key={a.id} a={a} />)}
            {tab === 'assets' && !assets.length && <Row icon="receive" iconTone="g" title="Nothing here yet" sub={`Receive at ${acct.short} on any network`} />}
            {tab === 'history' && txs.slice(0, SHOW).map(t => <TxRow key={t.id} t={t} time={t.time.split(', ')[1] || t.time} onClick={() => go({ screen: 'history', receiptId: t.id })} />)}
            {tab === 'history' && state.accountId !== 'main' && <Row icon="check" iconTone="g" title="Orbit · position opened" sub="By the Trading bot · Orbit paid the network fee" right={<span className="xs dim">Sep 10</span>} />}
          </div>
          {tab === 'assets' && !assets.length ? null
            : tab === 'assets'
            ? <button type="button" className="cardlink" onClick={() => go({ homePage: 'assets' })}>See all {assets.length} asset{assets.length === 1 ? '' : 's'}<Icon name="chevR" size={16} /></button>
            : <button type="button" className="cardlink" onClick={() => go({ screen: 'history', receiptId: null })}>See all history<Icon name="chevR" size={16} /></button>}
        </Card>
      </div>

      <div>
        <div className="secthead">
          <Label>App permissions{permCount > 0 && <span className="cnt">{permCount}</span>}</Label>
          <button type="button" className="link" onClick={() => go({ screen: 'keys', keysTab: 'apps' })}>Manage</button>
        </div>
        {permCount === 0 ? (
          <Card><Row icon="check" iconTone="g" title="No app has access" sub="Only your own devices and keys can act for you." /></Card>
        ) : (
          <div className="hscroll">
            {sessions.map(s => (
              <PermCard key={s.id} app={s.app} name={s.name} what={s.what} onClick={() => open({ kind: 'sessionDetail', sessionId: s.id })}
                perms={[['wallet', sessionSummary(s).limitShort], ['lock', sessionSummary(s).scope], ['calendar', `Until ${s.expiry}`]]} />
            ))}
            {sessionKeys.map(k => (
              <PermCard key={k.id} app={k.manager} name={k.name} what={`Through ${k.manager}`} onClick={() => open({ kind: 'keyDetail', keyId: k.id })}
                perms={[['wallet', k.policy], ['globe', k.chains.length === 4 ? 'All 4 networks' : k.chains.map(chainName).join(', ') + ' only'], ['calendar', `Until ${k.expiry}`]]} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
