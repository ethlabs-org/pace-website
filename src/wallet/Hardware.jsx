import { useStore } from '../state.jsx';
import { Icon } from '../icons.jsx';
import { buildPages, idlePages, nameOrRaw } from './hwSpec.js';
import { signerSteps } from '../data.js';
import { signerKey } from '../state.jsx';
import { SketchFrame } from '../Sketch.jsx';

function Line({ ln, raw }) {
  switch (ln.t) {
    case 'title': return <div className="hl-title">{ln.text}</div>;
    case 'head': return <div className="hl-head">{ln.text}</div>;
    // a parameter row; one that comes from the signed descriptor (`d`) is not shown without it
    case 'row': return raw && ln.d ? null : <div className="hl-row"><span>{nameOrRaw(ln.l, raw)}</span><span>{ln.v}</span></div>;
    // a step of the batch: the descriptor's wording and where it runs, or the raw call when there is no descriptor
    case 'step': return <div className="hl-step"><span className="n">{ln.n}</span><span className="grow"><div>{raw ? ln.raw : ln.text}</div><div className="at">{raw ? 'No description · the raw call' : nameOrRaw(ln.at, raw)}</div></span></div>;
    case 'warn': return <div className="hl-warn">{ln.text}</div>;
    case 'list': return <div className="hl-text">{ln.prefix || ''}{ln.items.map(n => nameOrRaw(n, raw)).join(', ')}</div>;
    default: return <div className="hl-text">{ln.text}</div>;
  }
}

// A physical key: a round cap with the glyph, an engraved caption under it. Keys never disappear; they go dark when they do nothing.
function Key({ id, icon, label, tone = '', disabled, onClick }) {
  return (
    <button type="button" id={id} className={'hw-key ' + tone} disabled={disabled} onClick={onClick} title={label}>
      <span className="cap"><Icon name={icon} size={16} /></span>
      <small>{label}</small>
    </button>
  );
}

// The Anchor device, docked under the browser window: wordmark and LED, the screen, four keys, a port at the foot.
// While it has nothing to review it is folded down to its top and one line of screen (styles.css, .hw:not(.live)).
export function HardwarePanel() {
  const { state, dispatch } = useStore();
  // Docked whenever the selected key needs the device: Anchor alone, or a set it is part of.
  if (!signerSteps(signerKey(state), state.keys.main || []).some(st => st.kind === 'hw')) return null;
  const sheet = state.sheet;
  const active = !!(state.hw && state.hw.active && sheet && !sheet.hidden);
  const pages = active ? buildPages(sheet.kind, sheet, state) : idlePages(state);
  const page = Math.min(state.hw ? state.hw.page || 0 : 0, pages.length - 1);
  const p = pages[page];
  const last = page === pages.length - 1;
  return (
    <aside className={'hw' + (active ? ' live' : '')} aria-label="Anchor hardware wallet">
      <div className="hw-top">
        <span className="hw-led" aria-hidden="true" />
        <span className="hw-name">Anchor</span>
        <button type="button" id="hw-raw" className={'hw-toggle' + (state.hwRaw ? ' on' : '')} aria-pressed={state.hwRaw} onClick={() => dispatch({ type: 'set', patch: { hwRaw: !state.hwRaw } })} title="Signed descriptors give names; without them the device shows raw addresses"><Icon name="eye" size={11} />Raw</button>
      </div>
      <div className="hw-screen">
        <div className="hw-status"><span><Icon name="usb" size={11} />{state.skin === 'lantern' ? 'Lantern' : !state.onboarded && !state.hwLinked && !active ? 'USB' : 'Keel'}</span><span>{active ? 'Review' : 'Ready'}</span><span className="bat" aria-hidden="true" /></div>
        {p.lines.map((ln, i) => <Line key={i} ln={ln} raw={state.hwRaw} />)}
        {active && <div className="hw-pages">{pages.map((_, i) => <span key={i} className={i === page ? 'on' : ''} />)}</div>}
      </div>
      <div className="hw-keys">
        <Key id="hw-reject" icon="x" label="Reject" tone="no" disabled={!active} onClick={() => dispatch({ type: 'hwCancel' })} />
        <Key id="hw-back" icon="chevL" label="Back" disabled={!active || page === 0} onClick={() => dispatch({ type: 'hwPage', page: page - 1 })} />
        <Key id="hw-next" icon="chevR" label="Next" disabled={!active || last} onClick={() => dispatch({ type: 'hwPage', page: page + 1 })} />
        <Key id="hw-approve" icon="check" label="Approve" tone={active && last && !p.refuse ? 'ok' : ''} disabled={!(active && last && !p.refuse)} onClick={() => dispatch({ type: 'hwApprove' })} />
      </div>
      <SketchFrame fig={3} name="Anchor" note="a mock hardware wallet" radius={26} />
    </aside>
  );
}
