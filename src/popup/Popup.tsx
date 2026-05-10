import { useState, useEffect } from 'react';
import './Popup.css';

type Lang = 'ru' | 'en';

const i18n = {
  ru: {
    studioSound: 'Студийный звук',
    agcDesc: 'Нормализация громкости',
    autoSkip: 'Авто-Скип',
    currentTrack: 'ТЕКУЩИЙ ТРЕК',
    nothingPlaying: 'Ничего не играет...',
    startSec: 'Старт (сек)',
    endSec: 'Конец (сек)',
    addRule: 'Добавить правило',
    noRules: 'Правил пока нет.',
    skip: 'Пропуск:',
    bookmarks: 'Закладки',
    saveMoment: 'Текущий момент',
    noBookmarks: 'Нет сохраненных моментов.',
    manualTime: 'Сек',
    momentLabel: 'Название',
    errEnable: 'Включите песню',
    errFill: 'Заполните оба поля',
    errNum: 'Используйте только цифры',
    errNeg: 'Время не может быть отрицательным',
    errLogic: 'Начало должно быть раньше конца',
  },
  en: {
    studioSound: 'Studio Sound',
    agcDesc: 'Volume Normalization',
    autoSkip: 'Auto-Skip',
    currentTrack: 'CURRENT TRACK',
    nothingPlaying: 'Nothing is playing...',
    startSec: 'Start (sec)',
    endSec: 'End (sec)',
    addRule: 'Add Rule',
    noRules: 'No rules yet.',
    skip: 'Skip:',
    bookmarks: 'Bookmarks',
    saveMoment: 'Current Time',
    noBookmarks: 'No saved moments.',
    manualTime: 'Sec',
    momentLabel: 'Label',
    errEnable: 'Play a song first',
    errFill: 'Fill in both fields',
    errNum: 'Use numbers only',
    errNeg: 'Time cannot be negative',
    errLogic: 'Start time must be before End time',
  }
};

export const Popup = () => {
  const [lang, setLang] = useState<Lang>('en');
  const [isFilterOn, setIsFilterOn] = useState(true);
  const [rules, setRules] = useState<Record<string, { title: string, intervals: { start: number; end: number }[] }>>({});
  const [favorites, setFavorites] = useState<Record<string, { title: string, moments: { time: number, label: string }[] }>>({});
  const [currentSong, setCurrentSong] = useState<{ id: string, title: string } | null>(null);
  
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  
  const [manualTime, setManualTime] = useState('');
  const [manualLabel, setManualLabel] = useState('');
  
  const [error, setError] = useState('');

  const t = i18n[lang];

  useEffect(() => {
    chrome.storage.local.get(['skipRules', 'isFilterOn', 'lang', 'favorites'], (data) => {
      if (data.skipRules) setRules(data.skipRules);
      if (data.favorites) setFavorites(data.favorites);
      if (data.lang) setLang(data.lang);
      if (data.isFilterOn !== undefined) setIsFilterOn(data.isFilterOn);
      else chrome.storage.local.set({ isFilterOn: true });
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_CURRENT_SONG' }, (response) => {
          if (!chrome.runtime.lastError && response?.videoId) {
            setCurrentSong({ id: response.videoId, title: response.title });
          }
        });
      }
    });
  }, []);

  const toggleLang = () => {
    const newLang = lang === 'ru' ? 'en' : 'ru';
    setLang(newLang);
    chrome.storage.local.set({ lang: newLang });
  };

  const toggleAudioFilter = async () => {
    const newState = !isFilterOn;
    setIsFilterOn(newState);
    chrome.storage.local.set({ isFilterOn: newState });

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' });
    }
  };

  const handleAddRule = () => {
    if (!currentSong) return setError(t.errEnable);
    if (start === '' || end === '') return setError(t.errFill);

    const s = Number(start);
    const e = Number(end);

    if (isNaN(s) || isNaN(e)) return setError(t.errNum);
    if (s < 0 || e < 0) return setError(t.errNeg);
    if (s >= e) return setError(t.errLogic);

    const newRules = { ...rules };
    const videoId = currentSong.id;

    if (!newRules[videoId]) newRules[videoId] = { title: currentSong.title, intervals: [] };
    
    newRules[videoId].intervals.push({ start: s, end: e });
    newRules[videoId].intervals.sort((a, b) => a.start - b.start);

    setRules(newRules);
    chrome.storage.local.set({ skipRules: newRules });
    
    setStart('');
    setEnd('');
    setError('');
  };

  const handleDeleteRule = (id: string, indexToRemove: number) => {
    const newRules = { ...rules };
    newRules[id].intervals = newRules[id].intervals.filter((_, index) => index !== indexToRemove);
    if (newRules[id].intervals.length === 0) delete newRules[id];
    setRules(newRules);
    chrome.storage.local.set({ skipRules: newRules });
  };

  const handleSaveCurrentMoment = () => {
    if (!currentSong) return setError(t.errEnable);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_CURRENT_TIME' }, (response) => {
          if (response && response.currentTime !== undefined) {
            saveMomentToStorage(Math.floor(response.currentTime), '');
          }
        });
      }
    });
  };

  // ИСПРАВЛЕНИЕ: Добавлена строгая проверка на пустое название
  const handleSaveManualMoment = () => {
    if (!currentSong) return setError(t.errEnable);
    if (manualTime === '' || manualLabel.trim() === '') return setError(t.errFill);
    
    const time = Number(manualTime);
    if (isNaN(time) || time < 0) return setError(t.errNeg);

    saveMomentToStorage(time, manualLabel);
    setManualTime('');
    setManualLabel('');
    setError('');
  };

  const saveMomentToStorage = (time: number, customLabel: string) => {
    if (!currentSong) return;
    const videoId = currentSong.id;
    const newFavs = { ...favorites };

    if (!newFavs[videoId]) {
      newFavs[videoId] = { title: currentSong.title, moments: [] };
    }
    
    const label = customLabel.trim() || `Момент ${newFavs[videoId].moments.length + 1}`;
    newFavs[videoId].moments.push({ time, label });
    newFavs[videoId].moments.sort((a, b) => a.time - b.time);

    setFavorites(newFavs);
    chrome.storage.local.set({ favorites: newFavs });
  };

  const playMoment = (targetVideoId: string, time: number) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        if (currentSong && currentSong.id === targetVideoId) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'PLAY_MOMENT', time });
        } else {
          chrome.tabs.update(tabs[0].id, { 
            url: `https://music.youtube.com/watch?v=${targetVideoId}&t=${time}` 
          });
        }
      }
    });
  };

  const handleDeleteMoment = (id: string, indexToRemove: number) => {
    const newFavs = { ...favorites };
    newFavs[id].moments = newFavs[id].moments.filter((_, index) => index !== indexToRemove);
    if (newFavs[id].moments.length === 0) delete newFavs[id];
    setFavorites(newFavs);
    chrome.storage.local.set({ favorites: newFavs });
  };

  return (
    <div className="popup-container">
      
      {/* HEADER */}
      <div className="header-wrapper">
        <div className="logo-wrapper">
          <div className="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
          </div>
          <h2 className="logo-title">Melomanica</h2>
        </div>
        <button className="lang-btn" onClick={toggleLang}>
          {lang.toUpperCase()}
        </button>
      </div>

      {/* STUDIO SOUND */}
      <div className="section-card flex-between">
        <div>
          <h3 className="section-title">{t.studioSound}</h3>
          <p className="section-desc">{t.agcDesc}</p>
        </div>
        <div className={`toggle-bg ${isFilterOn ? 'on' : 'off'}`} onClick={toggleAudioFilter}>
          <div className="toggle-circle"/>
        </div>
      </div>

      <hr className="divider" />

      {/* AUTO SKIP */}
      <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>{t.autoSkip}</h3>
      <div className={`track-info-card ${currentSong ? 'active' : 'inactive'}`}>
        <div className="track-label">{t.currentTrack}</div>
        <div className="track-title">
          {currentSong ? currentSong.title : t.nothingPlaying}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div className="input-group">
          <input type="number" min="0" placeholder={t.startSec} value={start} onChange={e => setStart(e.target.value)} className="input-default" style={{ width: '100%' }} disabled={!currentSong} />
          <input type="number" min="0" placeholder={t.endSec} value={end} onChange={e => setEnd(e.target.value)} className="input-default" style={{ width: '100%' }} disabled={!currentSong} />
          <button className={`btn-hover btn-primary ${!currentSong ? 'btn-disabled' : ''}`} onClick={handleAddRule} disabled={!currentSong} style={{ padding: '0 15px', fontSize: '18px' }}>
            +
          </button>
        </div>
        {error && <div style={{ color: '#ff453a', fontSize: '12px' }}>{error}</div>}
      </div>

      {/* RULES LIST */}
      <div className="list-container">
        {Object.keys(rules).length === 0 ? (
          <div className="list-empty">{t.noRules}</div>
        ) : (
          Object.entries(rules).map(([id, ruleData]) => (
            ruleData.intervals.map((rule, index) => (
              <div key={`rule-${id}-${index}`} className="list-item animated-item">
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', width: '180px' }}>{ruleData.title}</div>
                  <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '2px' }}>{t.skip} {rule.start}с — {rule.end}с</div>
                </div>
                <button className="delete-btn" onClick={() => handleDeleteRule(id, index)}>✕</button>
              </div>
            ))
          ))
        )}
      </div>

      <hr className="divider" />

      {/* BOOKMARKS HEADER */}
      <div className="flex-between" style={{ marginBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>{t.bookmarks}</h3>
        <button className={`btn-hover btn-success ${!currentSong ? 'btn-disabled' : ''}`} onClick={handleSaveCurrentMoment} disabled={!currentSong} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '15px' }}>
          ⚡ {t.saveMoment}
        </button>
      </div>

      {/* MANUAL BOOKMARK INPUT */}
      <div className="input-group">
        <input type="number" min="0" placeholder={t.manualTime} value={manualTime} onChange={e => setManualTime(e.target.value)} className="input-default" style={{ width: '30%' }} disabled={!currentSong} />
        <input type="text" placeholder={t.momentLabel} value={manualLabel} onChange={e => setManualLabel(e.target.value)} className="input-default" style={{ width: '55%' }} disabled={!currentSong} />
        <button className={`btn-hover btn-success ${!currentSong ? 'btn-disabled' : ''}`} onClick={handleSaveManualMoment} disabled={!currentSong} style={{ width: '15%', fontSize: '18px' }}>
          +
        </button>
      </div>

      {/* BOOKMARKS LIST */}
      <div className="list-container">
        {Object.keys(favorites).length === 0 ? (
          <div className="list-empty">{t.noBookmarks}</div>
        ) : (
          Object.entries(favorites).map(([id, favData]) => (
            favData.moments.map((moment, index) => (
              <div key={`fav-${id}-${index}`} className="list-item list-item-clickable animated-item" onClick={() => playMoment(id, moment.time)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="badge">
                    {Math.floor(moment.time / 60)}:{(moment.time % 60).toString().padStart(2, '0')}
                  </div>
                  <div style={{ overflow: 'hidden', width: '130px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#f5f5f7', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {moment.label}
                    </div>
                    <div style={{ fontSize: '10px', color: '#8e8e93', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {favData.title}
                    </div>
                  </div>
                </div>
                <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteMoment(id, index); }}>✕</button>
              </div>
            ))
          ))
        )}
      </div>

    </div>
  );
};

export default Popup;