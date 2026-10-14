import { useEffect, useState } from 'react';
import './Popup.css';
import Header from './components/Header';
import StudioSound from './components/StudioSound';
import AutoSkip from './components/AutoSkip';
import Bookmarks from './components/Bookmarks';
import EqControls from './components/EqControls';
import LooperControls from './components/LooperControls';
import Metronome from './components/Metronome';
import { useAppContext } from './utils/AppContext';
import { usePlayerStore } from './store/usePlayerStore';
import TrackVolume, { GlobalVolume } from './components/VolumeControls';
import { syncVolumeSettings } from './store/useVolumeStore';

export const Popup = () => {
  const { t, setLang, setCurrentSong } = useAppContext();
  const setPlayerState = usePlayerStore.setState;
  
  const [view, setView] = useState<'main' | 'advanced'>('main');
  const [advTab, setAdvTab] = useState<'eq' | 'looper' | 'metronome'>('eq');

  useEffect(syncVolumeSettings, []);

  useEffect(() => {
    chrome.storage.local.get(['lang', 'isFilterOn', 'eqBands', 'ultraBassEnabled', 'activePreset', 'customEqBands'], (data) => {
      if (data.lang) setLang(data.lang);

      setPlayerState({
        isFilterOn: data.isFilterOn !== undefined ? data.isFilterOn : true,
        ultraBassEnabled: data.ultraBassEnabled === true,
        eqBands: data.eqBands || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        activePreset: data.activePreset || 'Flat',
        customEqBands: data.customEqBands || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      });
    });

    const refreshPlayer = () => chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_SYNC_DATA' }, (response) => {
          if (!chrome.runtime.lastError && response) {
            if (response.song && response.song.videoId) {
              setCurrentSong({ id: response.song.videoId, title: response.song.title });
            } else {
              setCurrentSong(null);
            }
            if (response.looper) {
              setPlayerState({ looperState: response.looper });
            }
          }
        });
      }
    });
    refreshPlayer();
    const timer = window.setInterval(refreshPlayer, 1000);
    return () => window.clearInterval(timer);
  }, [setLang, setCurrentSong, setPlayerState]);

  return (
    <div className={`popup-container ${view === 'advanced' ? 'wide' : ''} ${view === 'advanced' && advTab === 'metronome' ? 'metronome-wide' : ''}`}>
      <Header view={view} setView={setView} />

      {view === 'main' ? (
        <div className="animated-item">
          <StudioSound />
          <GlobalVolume />
          <hr className="divider" />
          <TrackVolume />
          <hr className="divider" />
          <AutoSkip />
          <hr className="divider" />
          <Bookmarks />
        </div>
      ) : (
        <div className={`adv-layout animated-item ${advTab === 'eq' ? 'eq-layout' : ''}`}>
          <div className="adv-sidebar">
            <div className={`adv-tab ${advTab === 'eq' ? 'active' : ''}`} onClick={() => setAdvTab('eq')}>{t.menuEq}</div>
            <div className={`adv-tab ${advTab === 'looper' ? 'active' : ''}`} onClick={() => setAdvTab('looper')}>{t.menuLooper}</div>
            <div className={`adv-tab ${advTab === 'metronome' ? 'active' : ''}`} onClick={() => setAdvTab('metronome')}>{t.menuMetronome}</div>
          </div>
          
          <div className="adv-content">
            {advTab === 'eq' && <EqControls />}
            {advTab === 'looper' && <LooperControls />}
            {advTab === 'metronome' && <Metronome />}
          </div>
        </div>
      )}
    </div>
  );
};

export default Popup;
