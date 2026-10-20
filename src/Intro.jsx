import { Fragment, useEffect, useRef } from 'react';
import { Icon } from './icons.jsx';
import { PencilRule } from './Sketch.jsx';
import { SETUP_PHRASE, ACCOUNTS } from './data.js';
import { CHAPTERS, WELCOME, CLOSING, SLIDES } from './tour.js';
import { useTour, docsHref, joinHref, cards } from './Tour.jsx';

// The tutorial's full-screen pages (Tour.jsx picks the view), drawn as sheets of one drawing on the mockup's grid paper.
// Every page has the same three parts, so nothing jumps from one page to the next:
//   the top    a running head (the standard's name, "a draft" in hand, "Interactive mockup") over a pencil rule with a
//              blue cross at each end, as a drawing sheet's border
//   the body   the page's words and its one figure, filling the space between the rules
//   the foot   Back, the progress (numbers in pencil rings, the current one inked with its name) and the one button,
//              under the same rule
// Two layouts share the content width:
//   split      a slide: the words on the left (the eyebrow, the headline, the lede, the small print) and the figure on
//              the right, both centred in the body, so the page reads left to right like a slide
//   stack      the welcome and a section's page: the head at the top, read from the top down, and the figure centred
//              in the space under it
// The pages:
//   Slide         the overview the mockup opens on. Its figure is a drawing read from the top down: today's account
//                 (EoaFigure: the seed phrase, the private key it makes, the address), the new account (KeysFigure: a
//                 list of keys over the same address), or every wallet's own account above one shared account
//                 (GapFigure). The two account drawings put the address in the same place, so the second slide reads
//                 as the first one changed. Notes in hand sit beside each part as callouts.
//   Welcome       after the slides: the sections as a ruled table, each with today's problem and what the visitor will
//                 try, and Start the tour. It says the tour starts from an EOA.
//   ChapterIntro  one section: its name as the largest line on the page with the mint marker strokes under it, its
//                 statement and facts under it, then a before and after (Gets): today in a hatched pencil box, a
//                 hand-drawn arrow, and what the new account gets in a mint band, one column per benefit, the two boxes
//                 one height. Under the facts it says what the section starts from: a set-up account, unless
//                 `intro.from` says otherwise.
//   Closing       the blueprint band: the ask, Join the Working Group, and the drawing's title block
// Back (the page's own, the strip's, or ←) goes to the page before. The pages cover the whole window and the mockup
// under them is inert. They fade in with opacity and a short rise, and they are gone at once when the visitor moves
// on. A page that follows another page keeps the sheet still (`.still`) and only its words rise, so the mockup never
// shows through between two slides.

const LAST = CHAPTERS.length - 1;
// How long a section takes: about 15 seconds for a step with a card, 5 for a quiet one.
const secs = c => c.steps.reduce((t, x) => t + (x.quiet ? 5 : 15), 0);
const minutes = (list) => Math.max(1, Math.round(list.reduce((t, c) => t + secs(c), 0) / 60));
const pad = n => String(n).padStart(2, '0');
// A hyphenated name (EIP-8130, co-signer) stays on one line.
function keep(text) {
  return String(text).split(/(\S+-\S+)/).map((s, i) => (i % 2 ? <span key={i} className="nb">{s}</span> : <Fragment key={i}>{s}</Fragment>));
}
// "a *word*": the accent, a word or two written in hand, marked in mint as the site marks them: 'scribble' (two
// marker strokes under it, the site's hero) on a headline, 'hl' (a highlighter stroke, the site's display line) on
// a statement.
function accent(text, mark) {
  return String(text).split(/(\*[^*]+\*)/).map((s, i) => (s.startsWith('*')
    ? <em key={i} className={mark}>{s.slice(1, -1)}{mark === 'scribble' && <Scribble />}</em>
    : <Fragment key={i}>{keep(s)}</Fragment>));
}
// The site's mark: a rounded ink square with the E.
const Mark = () => (
  <svg className="ti-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect width="32" height="32" rx="7" /><path d="M9.6 8h12.8v3.2h-8.8v3.2h6.4v3.2h-6.4v3.2h8.8V24H9.6z" /></svg>
);
// A number in a pencil ring, as the site numbers its sections.
const No = ({ children }) => <span className="ti-no">{children}</span>;
// A figure's column name: a dot (red for today, mint for the new account) and small capitals, as the site labels its
// panels.
const Label = ({ now, as: T = 'span', style, role, children }) => (
  <T className={'ti-k ' + (now ? 'now' : 'was')} style={style} role={role}><i className="ti-dot" /><span>{keep(children)}</span></T>
);
// The underline: two marker strokes stretched to the word, drawn in once. Each stroke sits in a window that opens from
// the stroke's start as fast as a pen would draw it, while the stroke inside slides back by as much and holds still.
// Both moves are transforms, so the compositor runs the draw-in (a stroke-dashoffset animation kept the main thread
// busy on every frame of it). styles.css (.ti-scribble) has the geometry.
const STROKES = ['M5 15C62 9 128 6 196 7.5c44 1 86 3.5 118 7.5', 'M52 19.5c70-5 150-6.5 226-3'];
function Scribble() {
  return (
    <span className="ti-scribble" aria-hidden="true">
      {STROKES.map((d, i) => (
        <span key={d} className={'ti-sw s' + (i + 1)}>
          <span className="ti-si"><svg viewBox="0 0 320 24" preserveAspectRatio="none" focusable="false"><path d={d} /></svg></span>
        </span>
      ))}
    </span>
  );
}
// The devices a section's steps use, in the order they sit on the stage.
const DEVICES = [['app', 'Browser'], ['phone', 'Phone'], ['hw', 'Anchor']];
const devicesOf = (c) => DEVICES.filter(([d]) => c.steps.some(x => (x.dev || 'phone') === d)).map(([, name]) => name);

// The page takes the focus when it opens (a screen reader starts in it; → Enter and Esc work at once), without
// putting a focus ring on its button for a visitor who uses the mouse.
function usePageFocus() {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.focus({ preventScroll: true }); }, []);
  return ref;
}

export function TourScreens() {
  const { pos } = useTour();
  // `from` is the view before this page (Tour.jsx's page()). After another page the sheet is already on screen.
  const still = !!pos.from && pos.from !== 'step';
  if (pos.view === 'slide') return <Slide key={'s' + pos.n} still={still} />;
  if (pos.view === 'welcome') return <Welcome key={'w' + pos.n} still={still} />;
  if (pos.view === 'intro') return <ChapterIntro key={'i' + pos.n} still={still} />;
  if (pos.view === 'closing') return <Closing key={'c' + pos.n} still={still} />;
  return null;
}

// One page: the running head, the body, and the foot (Back, the progress, and the button that moves on).
function Page({ screen, name, still, back, progress, go, data, children }) {
  const ref = usePageFocus();
  return (
    <section ref={ref} tabIndex={-1} className={'ti' + (name ? ' ' + name : '') + (still ? ' still' : '')} role="dialog" aria-modal="true" aria-labelledby="ti-h" data-screen={screen} {...data}>
      <header className="ti-top">
        <span className="ti-top-l"><Mark /><b>New Ethereum Account Standard</b><span className="ti-top-note">a draft</span></span>
        <span className="ti-top-r">Interactive mockup</span>
        <PencilRule />
      </header>
      <div className="ti-body">{children}</div>
      <footer className="ti-foot">
        <PencilRule />
        <span className="ti-foot-l">{back}</span>
        <span className="ti-foot-c">{progress}</span>
        <span className="ti-foot-r">{go}</span>
      </footer>
    </section>
  );
}
const Back = ({ children }) => {
  const t = useTour();
  return <button type="button" className="ti-back" onClick={t.back}><Icon name="chevL" size={15} />{children}</button>;
};
const Go = ({ act, children }) => {
  const t = useTour();
  return <button type="button" className="ti-go" data-tour-act={act} onClick={t.next}>{children}<Icon name="arrowR" size={17} /></button>;
};
// Where the visitor is: the slides or the sections as numbers in pencil rings, the one on screen inked with its name
// beside it, the ones done in mint. `long` lists keep only the current name in narrower windows.
function Progress({ names, on, done = (k) => k < on, long }) {
  return (
    <ol className={'ti-prog' + (long ? ' long' : '')} aria-label="Progress">
      {names.map((x, k) => (
        <li key={x} className={k === on ? 'on' : done(k) ? 'done' : ''} aria-current={k === on ? 'step' : undefined}>
          <span className="ti-prog-n">{pad(k + 1)}</span><span className="ti-prog-t">{x}</span>
        </li>
      ))}
    </ol>
  );
}

// The head of a page, read from the top down: the eyebrow (a small label), the headline, and `side`, what supports
// it. `kind` 'sec' is a section's page.
function Head({ eyebrow, children, side, kind }) {
  return (
    <div className={'ti-hd' + (kind ? ' ' + kind : '')}>
      <p className="ti-eyebrow">{eyebrow}</p>
      <div className="ti-hd-main">{children}</div>
      {side && <div className="ti-hd-side">{side}</div>}
    </div>
  );
}
const Lede = ({ lines }) => <div className="ti-lede">{lines.map(x => <p key={x}>{keep(x)}</p>)}</div>;

function Slide({ still }) {
  const { pos } = useTour();
  const k = pos.s || 0, sl = SLIDES[k];
  return (
    <Page screen="slide" name="slide" still={still} data={{ 'data-slide': sl.id }}
      back={k ? <Back>Back</Back> : null} progress={<Progress names={SLIDES.map(x => x.name)} on={k} />} go={<Go act="next">Next</Go>}>
      <div className="ti-split">
        <div className="ti-split-text">
          <Head eyebrow={<><No>{pad(k + 1)}</No>{sl.name}</>} side={sl.lines && sl.lines.length > 0 && <Lede lines={sl.lines} />}>
            <h1 id="ti-h" className="ti-h">{accent(sl.head, 'scribble')}</h1>
          </Head>
          {sl.small && <Small text={sl.small} />}
        </div>
        <div className="ti-split-fig">
          {sl.figure === 'eoa' && <EoaFigure />}
          {sl.figure === 'keys' && <KeysFigure />}
          {sl.figure === 'gap' && <GapFigure />}
        </div>
      </div>
    </Page>
  );
}
// A hand-drawn arrow, its wobble baked into the path (no filter), pointing right; `Down` is one pointing down.
const Arrow = ({ className }) => (
  <svg className={className} viewBox="0 0 64 44" aria-hidden="true"><path d="M5 25.5C14 17 23 15.5 31.5 20.5c6.2 3.6 12.4 4.8 22.6.9" /><path d="M46.2 14.6l8.1 6.8-9.5 4.6" /></svg>
);
const Down = ({ now }) => (
  <svg className={'ti-flow-down' + (now ? ' now' : '')} viewBox="0 0 44 56" aria-hidden="true"><path d="M23.5 4C17 13 16.2 21.5 20.6 30c3.2 6.1 4.1 11.6.6 20.5" /><path d="M13.8 42.6l7.6 8.2 6.4-9.8" /></svg>
);
// The small print, as a drawing's note: a ruled line, a blue mono label, the text.
const Small = ({ text }) => <p className="ti-small"><span className="ti-small-k">Note</span><span>{keep(text)}</span></p>;
// A drawing read from the top down: each part with its name above it and a note in hand beside it, joined to the part
// by a leader line as a drawing labels its parts, and an arrow down to the next part. Red notes for today's account,
// mint for the new one.
function Part({ k, note, now, children }) {
  return (
    <>
      <span className="ti-flow-k">{k}</span>
      <div className="ti-flow-box">{children}</div>
      <span className={'ti-flow-note' + (now ? ' now' : '')}><span>{note}</span></span>
    </>
  );
}
// The address and what it holds, the same on both drawings so the second reads as the first one changed.
const Address = () => <span className="ti-eoa-addr"><span className="mono">{ACCOUNTS.main.short}</span><b>{ACCOUNTS.main.total}</b></span>;

// Today's account, drawn (the first slide): the seed phrase, the one private key it makes, and the address that key
// controls, with a reviewer's red notes on what can go wrong. The words are the mockup's own phrase.
function EoaFigure() {
  return (
    <figure className="ti-flow" aria-label="An EOA: a seed phrase makes one private key, which controls the address">
      <Part k="Seed phrase" note="anyone who has it takes everything">
        <ol className="ti-eoa-words">{SETUP_PHRASE.map((w, i) => <li key={w}><i>{i + 1}</i>{w}</li>)}</ol>
      </Part>
      <Down />
      <Part k="Private key" note="one key, and it can’t change">
        <span className="ti-eoa-key"><span className="ti-icon"><Icon name="key" size={18} /></span><span className="mono">0x4c0f…9a1e</span></span>
      </Part>
      <Down />
      <Part k="Your address" note="no limit on what it can move"><Address /></Part>
    </figure>
  );
}

// The new account, drawn (the second slide): the list of keys over the same address. The quantum-safe key is dashed:
// it is the one a visitor adds later.
const KEY_ROWS = [
  ['phone', 'Your phone', 'Face ID · everyday payments, capped'],
  ['device', 'A hardware wallet', 'can change the keys'],
  ['book', 'A backup key', 'from your seed phrase · recovery only'],
  ['lock', 'A quantum-safe key', 'add it any time', 'later'],
];
function KeysFigure() {
  return (
    <figure className="ti-flow now" aria-label="The new account: a list of keys controls one address">
      <Part k="A list of keys" note="add or remove any of them" now>
        <ul className="ti-keys-list">
          {KEY_ROWS.map(([icon, name, role, later]) => (
            <li key={name} className={later ? 'later' : ''}>
              <span className="ti-icon"><Icon name={icon} size={17} /></span>
              <span><b>{name}</b><span>{role}</span></span>
            </li>
          ))}
        </ul>
      </Part>
      <Down now />
      <Part k="Your address" note="the same address, the money stays" now><Address /></Part>
    </figure>
  );
}

// Why the standard has to exist (the third slide), as the site's landing draws it: on top every wallet ships its own
// account, so every app, hardware wallet and explorer is wired to every account; under it the wallets ship one account
// and each of them is wired to it once. Nothing moves: the wires are still lines.
const GAP_USERS = [['grid', 'Apps'], ['device', 'Hardware wallets'], ['search', 'Explorers']];
const SHAPES = [<circle key="c" cx="8" cy="8" r="5.25" />, <rect key="s" x="2.75" y="2.75" width="10.5" height="10.5" rx="1.5" />, <path key="t" d="M8 2.5L13.75 13.25H2.25Z" />];
const col = (i, n) => ((i + 0.5) / n) * 100;
function Wires({ pairs, tall }) {
  return (
    <svg className={'ti-gap-wires' + (tall ? ' tall' : '')} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {pairs.map(([a, b], k) => <line key={k} x1={col(a, 3)} y1="0" x2={col(b, 3)} y2="100" vectorEffect="non-scaling-stroke" />)}
    </svg>
  );
}
const GapRow = ({ items, kind }) => (
  <ul className={'ti-gap-row ' + (kind || '')}>
    {items.map(([icon, name], i) => <li key={name}>{icon === 'shape' ? <svg className={'ti-gap-shape s' + i} viewBox="0 0 16 16" aria-hidden="true">{SHAPES[i]}</svg> : <Icon name={icon} size={15} />}<span>{name}</span></li>)}
  </ul>
);
function GapFigure() {
  const wallets = ['A', 'B', 'C'].map(x => ['wallet', `Wallet ${x}`]);
  const straight = [[0, 0], [1, 1], [2, 2]];
  const tangle = [0, 1, 2].flatMap(a => [0, 1, 2].map(b => [a, b]));
  return (
    <div className="ti-gap">
      <section className="ti-box was ti-gap-p" aria-label="If every wallet builds its own account">
        <Label as="p">If every wallet builds its own</Label>
        <GapRow items={wallets} />
        <Wires pairs={straight} />
        <GapRow items={['A', 'B', 'C'].map(x => ['shape', `Account ${x}`])} kind="acct" />
        <Wires pairs={tangle} tall />
        <GapRow items={GAP_USERS} kind="use" />
        <p className="ti-gap-note">Every app, hardware wallet and explorer supports each account separately.</p>
      </section>
      <section className="ti-box now ti-gap-p" aria-label="If every wallet ships this standard">
        <Label as="p" now>If every wallet ships this standard</Label>
        <GapRow items={wallets} />
        <Wires pairs={straight.map(([a]) => [a, 1])} />
        <p className="ti-gap-bar"><Mark />New Ethereum Account Standard</p>
        <Wires pairs={straight.map(([a]) => [1, a])} tall />
        <GapRow items={GAP_USERS} kind="use" />
        <p className="ti-gap-note">Each supports one account, and it works in every wallet.</p>
      </section>
    </div>
  );
}

function Welcome({ still }) {
  const list = CHAPTERS.slice(1);
  return (
    <Page screen="welcome" name="welcome" still={still} back={<Back>Overview</Back>} go={<Go act="showme">{WELCOME.start}</Go>}>
      <Head eyebrow={<><No>00</No>The tour</>} side={<><Lede lines={[WELCOME.line]} /><p className="ti-meta">{list.length} sections<i>·</i>about {minutes(list)} minutes<i>·</i>{WELCOME.reset}</p></>}>
        <h1 id="ti-h" className="ti-h">{accent(WELCOME.head, 'scribble')}</h1>
      </Head>
      <div className="ti-fig">
        <div className="ti-toc" role="table" aria-label="The sections">
          <div className="ti-toc-r head" role="row">
            <span role="columnheader">Section</span>
            <Label role="columnheader">Today</Label>
            <Label now role="columnheader">You will try</Label>
          </div>
          {list.map((c, k) => (
            <div className="ti-toc-r" role="row" key={c.id}>
              <span className="ti-toc-t" role="cell"><span className="ti-toc-mk"><Icon name={c.icon} size={15} /><span>{pad(k + 1)}</span></span><b>{keep(c.title)}</b></span>
              <span className="ti-toc-was" role="cell">{keep(c.toc.today)}</span>
              <span className="ti-toc-now" role="cell">{keep(c.toc.try)}</span>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

// What a section starts from when its `intro.from` doesn't say: an account set up like the one Post-Quantum Ready
// builds.
const FROM_DEMO = 'This section starts from a set-up account: the Anchor, a backup key, and Face ID checked by Safenet with a $1,000 daily limit.';

function ChapterIntro({ still }) {
  const t = useTour();
  const { pos, chapter: c } = t;
  const facts = [`${cards(c)} steps`, `about ${minutes([c])} min`, devicesOf(c).join(', ')];
  return (
    <Page screen="intro" still={still} data={{ 'data-chapter': c.id }} back={<Back>{pos.ch > 1 ? CHAPTERS[pos.ch - 1].title : 'Welcome'}</Back>}
      progress={<Progress long names={CHAPTERS.slice(1).map(x => x.title)} on={pos.ch - 1} done={(k) => !!t.did[`${k + 1}/${CHAPTERS[k + 1].steps.length - 1}`]} />}
      go={<Go act="showme">Show me</Go>}>
      <Head kind="sec" eyebrow={<><span className="ti-ico"><Icon name={c.icon} size={18} /></span><No>{pad(pos.ch)} / {pad(LAST)}</No></>}
        side={<><p className="ti-sub">{accent(c.intro.head, 'hl')}</p><p className="ti-meta">{facts.map((x, k) => <Fragment key={x}>{k > 0 && <i>·</i>}{x}</Fragment>)}</p><p className="ti-from"><span>{keep(c.intro.from || FROM_DEMO)}</span></p></>}>
        <h1 id="ti-h" className="ti-t"><span className="ti-t-mark">{keep(c.title)}<Scribble /></span></h1>
      </Head>
      <div className="ti-fig">
        <Gets was={c.intro.was || 'Today, with an EOA'} today={c.intro.today} gets={c.intro.gets} />
        {c.intro.small && <Small text={c.intro.small} />}
      </div>
    </Page>
  );
}

// Today and the new account as a before and after, in one row. Today is a pencil box with section hatching, the way
// a drawing marks what is cut away, as tall as its words. A mint arrow, level with it, leads to the new account's band,
// where each benefit is a column: an icon on a paper blob, its name, its line.
function Gets({ was, today, gets }) {
  return (
    <div className="ti-ga">
      <div className="ti-ga-was">
        <section className="ti-box was ti-was" aria-label={was}>
          <Label as="p">{was}</Label>
          <p className="ti-was-t">{keep(today)}</p>
        </section>
        <span className="ti-arrow" aria-hidden="true"><Arrow /></span>
      </div>
      <section className="ti-box now ti-now" aria-label="With the new account">
        <Label as="p" now>With the new account</Label>
        <ul style={{ '--n': gets.length }}>
          {gets.map(([name, line, icon]) => (
            <li key={name}>
              <span className="ti-icon"><Icon name={icon || 'check'} size={20} /></span>
              <b>{keep(name)}</b>
              <span>{keep(line)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// The site's closing band: a blueprint sheet with the ask on the left and the drawing's title block on the right,
// its "Reviewed by" line still empty, and a DRAFT stamp over the block's corner.
const TITLE_ROWS = [
  ['Project', 'New Ethereum Account Standard'],
  ['Number', 'ERC-XXXX'],
  ['Status', 'Draft, open for comment'],
  ['Target', 'Hegotá'],
  ['Drawn by', 'Ethlabs'],
];
function Closing({ still }) {
  return (
    <Page screen="closing" name="closing" still={still} back={<Back>{CHAPTERS[LAST].title}</Back>}>
      <div className="ti-bp">
        <div className="ti-bp-copy">
          <p className="ti-bp-k">The end · you finished the interactive mockup</p>
          <h1 id="ti-h" className="ti-bp-h">{accent(CLOSING.head)}</h1>
          {CLOSING.lines.map(x => <p key={x} className="ti-bp-p">{keep(x)}</p>)}
          <div className="ti-bp-cta">
            <a className="ti-go light" data-tour-act="join" href={joinHref()} target="_blank" rel="noreferrer">Join the Working Group<Icon name="arrowR" size={17} /></a>
            <a className="ti-ghost light" href={docsHref({ page: '', hash: '' })} target="_blank" rel="noreferrer">Read the docs<Icon name="ext" size={13} /></a>
          </div>
        </div>
        <div className="ti-tblock">
          <dl>
            {TITLE_ROWS.map(([k, v]) => <div className="tb-row" key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            <div className="tb-row tb-open"><dt>Reviewed by</dt><dd><span className="tb-hand">your team?</span></dd></div>
          </dl>
          <span className="tb-stamp" aria-hidden="true">Draft</span>
        </div>
      </div>
    </Page>
  );
}
