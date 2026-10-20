import { useStore } from '../state.jsx';
import { Icon } from '../icons.jsx';
import { Tidepool, TidepoolModal } from './Tidepool.jsx';
import { Framescan } from './Framescan.jsx';
import { SketchFrame } from '../Sketch.jsx';

export function Browser() {
  const { state, dispatch } = useStore();
  const tab = state.browserTab;
  const set = (browserTab) => dispatch({ type: 'set', patch: { browserTab } });
  const paths = { vault: 'vaults/eth', bridge: 'deposit/cross-chain', signin: 'sign-in' };
  const url = tab === 'tidepool' ? 'https://tidepool.fi/' + (paths[state.dappPage] || state.dappPage) : 'https://framescan.io/' + (state.fxTab === 'tx' ? 'tx/' + state.fxTx : state.fxTab);
  return (
    <div className="browser">
      <div className="chrome">
        <span className="dots"><span /><span /><span /></span>
        <button type="button" className={'tab' + (tab === 'tidepool' ? ' on' : '')} onClick={() => set('tidepool')}><Icon name="wave" size={14} /><span>tidepool.fi</span></button>
        <button type="button" className={'tab' + (tab === 'framescan' ? ' on' : '')} onClick={() => set('framescan')}><Icon name="search" size={14} /><span>framescan.io</span></button>
      </div>
      <div className="urlbar"><span className="url"><Icon name="lock" size={12} /><span>{url}</span></span></div>
      {/* the page scrolls; Tidepool's dialog is its sibling so it covers the window, not the document */}
      <div className="view">
        <div className="page">{tab === 'tidepool' ? <Tidepool /> : <Framescan />}</div>
        {tab === 'tidepool' && <TidepoolModal />}
      </div>
      <SketchFrame fig={1} name={tab === 'tidepool' ? 'Tidepool' : 'Framescan'} note={tab === 'tidepool' ? 'an app' : 'an explorer'} />
    </div>
  );
}
