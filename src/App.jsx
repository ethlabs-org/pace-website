import { memo, useEffect } from 'react';
import { StoreProvider, useStore } from './state.jsx';
import { Browser } from './dapp/Browser.jsx';
import { Phone } from './wallet/Phone.jsx';
import { HardwarePanel } from './wallet/Hardware.jsx';
import { SketchDefs } from './Sketch.jsx';
import { TourProvider, TourBar, TourMarks, useTour } from './Tour.jsx';
import { TourScreens } from './Intro.jsx';

// The stage: the app in its browser window (with the Anchor under it when it is the approver), the tutorial's column
// where its prompts and cards sit, and the phone. Keyed by the starts, so a new chapter or a put-back step mounts fresh:
// no tab, open box or scroll position carries over. Within a chapter the stage stays, so what the visitor did carries
// from step to step. The devices follow the store themselves; the stage is memoized so the tutorial moving on (a step
// starting, the ring finding its target) doesn't render them all again.
const Stage = memo(function Stage({ take }) {
  return (
    <main className="stage" key={take}>
      <div className="col-app">
        <Browser />
        <HardwarePanel />
      </div>
      {/* the tutorial's column: Marks (Tour.jsx) puts the tag, the prompt and the card here */}
      <div className="guide" aria-hidden="true" />
      <Phone />
    </main>
  );
});
const Defs = memo(SketchDefs);

function Shell() {
  const { state, dispatch } = useStore();
  // While a full-screen page of the tutorial shows (Intro.jsx), the mockup under it takes no focus and no clicks.
  const covered = useTour().pos.view !== 'step';
  // The network: a request the wallet approved confirms a moment later, and the app and the wallet settle together.
  // The wallet's own sends and swaps, which the app knows nothing about, settle on the same timer.
  const settling = state.txs.filter(t => t.status === 'pending' && t.own).map(t => t.id).join(',');
  useEffect(() => {
    const confirming = !!state.flow && state.flow.phase === 'confirming';
    if (!confirming && !settling) return undefined;
    const t = setTimeout(() => dispatch({ type: 'confirm' }), 1800);
    return () => clearTimeout(t);
  }, [state.flow, settling, dispatch]);
  // The pool approves a deposit some time after it lands. The pool publishes no typical wait, so the demo just
  // compresses it, the same way it compresses a block.
  const waiting = state.privWait.map(w => w.id).join(',');
  useEffect(() => {
    if (!waiting) return undefined;
    const t = setTimeout(() => dispatch({ type: 'depositApproved' }), 9000);
    return () => clearTimeout(t);
  }, [waiting, dispatch]);
  return (
    <>
    <div className="app" inert={covered || undefined}>
      <Defs />
      {/* the stage, then the tutorial's strip */}
      <div className="work">
        <Stage take={state.take} />
        <TourMarks />
      </div>
      <TourBar />
    </div>
    <TourScreens />
    </>
  );
}

export default function App() {
  return <StoreProvider><TourProvider><Shell /></TourProvider></StoreProvider>;
}
