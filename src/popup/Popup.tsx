import { useState } from 'react';
import './Popup.css';
import Header from './components/Header';
import StudioSound from './components/StudioSound';
import AutoSkip from './components/AutoSkip';
import Bookmarks from './components/Bookmarks';
import EqControls from './components/EqControls';
import LooperControls from './components/LooperControls';
import { useAppContext } from './utils/AppContext';

export const Popup = () => {
  const { t } = useAppContext();
  
  const [view, setView] = useState<'main' | 'advanced'>('main');
  const [advTab, setAdvTab] = useState<'eq' | 'looper'>('eq');

  return (
    <div className={`popup-container ${view === 'advanced' ? 'wide' : ''}`}>
      <Header view={view} setView={setView} />

      {view === 'main' ? (
        <div className="animated-item">
          <StudioSound />
          <hr className="divider" />
          <AutoSkip />
          <hr className="divider" />
          <Bookmarks />
        </div>
      ) : (
        <div className="adv-layout animated-item">
          <div className="adv-sidebar">
            <div className={`adv-tab ${advTab === 'eq' ? 'active' : ''}`} onClick={() => setAdvTab('eq')}>{t.menuEq}</div>
            <div className={`adv-tab ${advTab === 'looper' ? 'active' : ''}`} onClick={() => setAdvTab('looper')}>{t.menuLooper}</div>
          </div>
          
          <div className="adv-content">
            {advTab === 'eq' && <EqControls />}
            {advTab === 'looper' && <LooperControls />}
          </div>
        </div>
      )}
    </div>
  );
};

export default Popup;