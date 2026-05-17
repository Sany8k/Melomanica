import { useState, useEffect } from 'react';
import './Popup.css';

type Lang = 'ru' | 'en';

const i18n = {
  ru: {
    studioSound: 'Студийный звук', agcDesc: 'Нормализация громкости', autoSkip: 'Авто-Скип',
    currentTrack: 'ТЕКУЩИЙ ТРЕК', nothingPlaying: 'Ничего не играет...', startSec: 'Старт (напр. 1:15)',
    endSec: 'Конец (напр. 2:30)', bookmarks: 'Закладки', saveMoment: 'Текущий момент',
    noBookmarks: 'Нет сохраненных моментов.', manualTime: 'Время', momentLabel: 'Название',
    errEnable: 'Включите песню', errFill: 'Заполните оба поля', errNum: 'Неверный формат времени', errNeg: 'Время не может быть < 0', errLogic: 'Старт должен быть < Конца',
    btnAdv: 'ПРО', btnMain: 'НАЗАД',
    menuEq: 'Эквалайзер', menuLooper: 'Лупер & Скорость', eqTitle: '10-полосный Эквалайзер', eqReset: 'СБРОСИТЬ',
    
    // LOOPER & SKIP BTNS
    loopStartBtn: 'Начало (A)', loopEndBtn: 'Конец (B)', loopReset: 'Сброс',
    speed: 'Скорость', pitchToggle: 'Сохранять питч', pitchDesc: 'Если выкл, звук "поплывет" как на кассете',
    notSet: 'Не задано',
    
    bands: [
      { f: '32', desc: 'Саб-бас (Гул, вибрация)' }, { f: '64', desc: 'Бас-бочка (Панч)' }, { f: '125', desc: 'Бас-гитара' },
      { f: '250', desc: 'Низа (Муть)' }, { f: '500', desc: 'Середина (Тело)' }, { f: '1k', desc: 'Вокал' },
      { f: '2k', desc: 'Атака (Резкость)' }, { f: '4k', desc: 'Присутствие' }, { f: '8k', desc: 'Тарелки' }, { f: '16k', desc: 'Воздух' }
    ]
  },
  en: {
    studioSound: 'Studio Sound', agcDesc: 'Volume Normalization', autoSkip: 'Auto-Skip',
    currentTrack: 'CURRENT TRACK', nothingPlaying: 'Nothing is playing...', startSec: 'Start (e.g. 1:15)',
    endSec: 'End (e.g. 2:30)', bookmarks: 'Bookmarks', saveMoment: 'Current Time',
    noBookmarks: 'No saved moments.', manualTime: 'Time', momentLabel: 'Label',
    errEnable: 'Play a song first', errFill: 'Fill both fields', errNum: 'Invalid time format', errNeg: 'Time cannot be < 0', errLogic: 'Start must be < End', btnAdv: 'PRO', btnMain: 'BACK',
    menuEq: 'Equalizer', menuLooper: 'Looper & Speed', eqTitle: '10-Band Equalizer', eqReset: 'RESET',

    loopStartBtn: 'Start (A)', loopEndBtn: 'End (B)', loopReset: 'Reset',
    speed: 'Speed', pitchToggle: 'Preserve Pitch', pitchDesc: 'If off, audio pitches up/down like a tape',
    notSet: 'Not set',
    
    bands: [
      { f: '32', desc: 'Sub-bass' }, { f: '64', desc: 'Kick Drum' }, { f: '125', desc: 'Bass Guitar' },
      { f: '250', desc: 'Low Mids' }, { f: '500', desc: 'Mids' }, { f: '1k', desc: 'Vocals' },
      { f: '2k', desc: 'Attack' }, { f: '4k', desc: 'Presence' }, { f: '8k', desc: 'Cymbals' }, { f: '16k', desc: 'Air' }
    ]
  }
};

// 🛠 УМНЫЙ ПАРСЕР ВРЕМЕНИ
const parseTimeToSeconds = (timeStr: string): number | null => {
  if (!timeStr.trim()) return null;
  // Заменяем точку, запятую, точку с запятой и пробел на двоеточие
  const normalized = timeStr.trim().replace(/[.,; ]+/g, ':');
  const parts = normalized.split(':');

  if (parts.length === 1) {
    const val = Number(parts[0]);
    return isNaN(val) ? null : val;
  } else if (parts.length === 2) {
    const m = Number(parts[0]);
    const s = Number(parts[1]);
    if (isNaN(m) || isNaN(s)) return null;
    return m * 60 + s;
  }
  return null;
};

export const Popup = () => {
  const [view, setView] = useState<'main' | 'advanced'>('main');
  const [advTab, setAdvTab] = useState<'eq' | 'looper'>('eq');
  const [lang, setLang] = useState<Lang>('ru');
  const [isFilterOn, setIsFilterOn] = useState(true);
  const [rules, setRules] = useState<Record<string, { title: string, intervals: { start: number; end: number }[] }>>({});
  const [favorites, setFavorites] = useState<Record<string, { title: string, moments: { time: number, label: string }[] }>>({});
  const [eqBands, setEqBands] = useState<number[]>([0,0,0,0,0,0,0,0,0,0]);
  const [currentSong, setCurrentSong] = useState<{ id: string, title: string } | null>(null);
  
  const [start, setStart] = useState(''); const [end, setEnd] = useState('');
  const [manualTime, setManualTime] = useState(''); const [manualLabel, setManualLabel] = useState('');
  const [error, setError] = useState('');
  const [editingMoment, setEditingMoment] = useState<{ id: string, index: number } | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const [looperState, setLooperState] = useState({ start: null as number | null, end: null as number | null, speed: 1.0, pitch: true });

  const t = i18n[lang];

  useEffect(() => {
    chrome.storage.local.get(['skipRules', 'isFilterOn', 'lang', 'favorites', 'eqBands'], (data) => {
      if (data.skipRules) setRules(data.skipRules);
      if (data.favorites) setFavorites(data.favorites);
      if (data.eqBands) setEqBands(data.eqBands);
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
        chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_LOOPER_STATE' }, (response) => {
          if (!chrome.runtime.lastError && response) {
            setLooperState({ start: response.start, end: response.end, speed: response.speed, pitch: response.pitch });
          }
        });
      }
    });
  }, []);

  const formatTime = (secs: number | null) => {
    if (secs === null) return t.notSet;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // --- ФУНКЦИИ ЛУПЕРА ---
  const handleSetA = () => { chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => { if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { action: 'SET_LOOP_A' }, (res) => { if (res) setLooperState(prev => ({ ...prev, start: res.start, end: res.end })); }); }); };
  const handleSetB = () => { chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => { if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { action: 'SET_LOOP_B' }, (res) => { if (res) setLooperState(prev => ({ ...prev, start: res.start, end: res.end })); }); }); };
  const handleResetLooper = () => { chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => { if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { action: 'RESET_LOOPER' }, () => { setLooperState({ start: null, end: null, speed: 1.0, pitch: true }); }); }); };
  const handleConfigChange = (speed: number, pitch: boolean) => { setLooperState(prev => ({ ...prev, speed, pitch })); chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => { if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { action: 'SET_LOOPER_CONFIG', speed, pitch }); }); };

  // --- ОБЩИЕ ФУНКЦИИ ---
  const handleEqChange = (index: number, value: string) => { const newBands = [...eqBands]; newBands[index] = Number(value); setEqBands(newBands); chrome.storage.local.set({ eqBands: newBands }); };
  const resetEq = () => { const empty = [0,0,0,0,0,0,0,0,0,0]; setEqBands(empty); chrome.storage.local.set({ eqBands: empty }); };
  const toggleLang = () => { const newLang = lang === 'ru' ? 'en' : 'ru'; setLang(newLang); chrome.storage.local.set({ lang: newLang }); };
  const toggleAudioFilter = async () => { const newState = !isFilterOn; setIsFilterOn(newState); chrome.storage.local.set({ isFilterOn: newState }); const tabs = await chrome.tabs.query({ active: true, currentWindow: true }); if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' }); };
  
  // 🛠 ФУНКЦИЯ ДЛЯ ВЗЯТИЯ ВРЕМЕНИ ДЛЯ СКИПОВ
  const fetchCurrentTimeForInput = (type: 'start' | 'end') => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_CURRENT_TIME' }, (r) => {
          if (r && r.currentTime !== undefined) {
            const formatted = formatTime(r.currentTime);
            if (type === 'start') setStart(formatted);
            else setEnd(formatted);
          }
        });
      }
    });
  };

  const handleAddRule = () => {
    if (!currentSong) return setError(t.errEnable); 
    
    // Парсим умным парсером
    const s = parseTimeToSeconds(start);
    const e = parseTimeToSeconds(end);

    if (s === null || e === null) return setError(t.errNum);
    if (s < 0 || e < 0) return setError(t.errNeg);
    if (s >= e) return setError(t.errLogic);

    const newRules = { ...rules }; const videoId = currentSong.id;
    if (!newRules[videoId]) newRules[videoId] = { title: currentSong.title, intervals: [] };
    newRules[videoId].intervals.push({ start: s, end: e }); newRules[videoId].intervals.sort((a, b) => a.start - b.start);
    setRules(newRules); chrome.storage.local.set({ skipRules: newRules }); setStart(''); setEnd(''); setError('');
  };
  
  const handleDeleteRule = (id: string, indexToRemove: number) => { const newRules = { ...rules }; newRules[id].intervals = newRules[id].intervals.filter((_, i) => i !== indexToRemove); if (newRules[id].intervals.length === 0) delete newRules[id]; setRules(newRules); chrome.storage.local.set({ skipRules: newRules }); };
  
  const saveMomentToStorage = (time: number, customLabel: string) => { if (!currentSong) return; const newFavs = { ...favorites }; const videoId = currentSong.id; if (!newFavs[videoId]) newFavs[videoId] = { title: currentSong.title, moments: [] }; newFavs[videoId].moments.push({ time, label: customLabel.trim() || `Момент ${newFavs[videoId].moments.length + 1}` }); newFavs[videoId].moments.sort((a, b) => a.time - b.time); setFavorites(newFavs); chrome.storage.local.set({ favorites: newFavs }); };
  const handleSaveCurrentMoment = () => { chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => { if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_CURRENT_TIME' }, (r) => { if (r && r.currentTime !== undefined) saveMomentToStorage(Math.floor(r.currentTime), ''); }); }); };
  
  const handleSaveManualMoment = () => { 
    if (!currentSong || !manualTime || !manualLabel.trim()) return setError(t.errFill); 
    const time = parseTimeToSeconds(manualTime);
    if (time === null) return setError(t.errNum);
    saveMomentToStorage(time, manualLabel); 
    setManualTime(''); setManualLabel(''); setError(''); 
  };
  
  const playMoment = (targetVideoId: string, time: number) => { chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => { const tab = tabs[0]; if (!tab?.id) return; const onYouTubeMusic = (tab.url || '').includes('music.youtube.com'); if (onYouTubeMusic && currentSong?.id === targetVideoId) { chrome.tabs.sendMessage(tab.id, { action: 'PLAY_MOMENT_LOCAL', time }); } else if (onYouTubeMusic) { chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func: (vid, t) => { const ytApp = document.querySelector('ytmusic-app') as any; if (ytApp && typeof ytApp.navigate_ === 'function') ytApp.navigate_(`/watch?v=${vid}&t=${t}`); else window.location.href = `/watch?v=${vid}&t=${t}`; }, args: [targetVideoId, time] }); } else { chrome.tabs.update(tab.id, { url: `https://music.youtube.com/watch?v=${targetVideoId}&t=${time}` }); } }); };
  const handleStartEdit = (e: any, id: string, i: number, label: string) => { e.stopPropagation(); setEditingMoment({ id, index: i }); setEditLabel(label); };
  const handleCancelEdit = () => setEditingMoment(null);
  const handleSaveEdit = () => { if (!editingMoment) return; const { id, index } = editingMoment; if (editLabel.trim() !== '') { const newFavs = { ...favorites }; newFavs[id].moments[index].label = editLabel.trim(); setFavorites(newFavs); chrome.storage.local.set({ favorites: newFavs }); } setEditingMoment(null); };
  const handleDeleteMoment = (id: string, indexToRemove: number) => { const newFavs = { ...favorites }; newFavs[id].moments = newFavs[id].moments.filter((_, i) => i !== indexToRemove); if (newFavs[id].moments.length === 0) delete newFavs[id]; setFavorites(newFavs); chrome.storage.local.set({ favorites: newFavs }); };

  return (
    <div className={`popup-container ${view === 'advanced' ? 'wide' : ''}`}>
      <div className="header-wrapper">
        <div className="logo-wrapper">
          <div className="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>
            </svg>
          </div>
          <h2 className="logo-title">Melomanica</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`adv-toggle-btn ${view === 'advanced' ? 'active' : ''}`} onClick={() => setView(view === 'main' ? 'advanced' : 'main')}>
            {view === 'main' ? `⚙ ${t.btnAdv}` : `← ${t.btnMain}`}
          </button>
          <button className="lang-btn" onClick={toggleLang}>{lang.toUpperCase()}</button>
        </div>
      </div>

      {view === 'main' ? (
        <div className="animated-item">
          <div className="section-card flex-between">
            <div><h3 className="section-title">{t.studioSound}</h3><p className="section-desc">{t.agcDesc}</p></div>
            <div className={`toggle-bg ${isFilterOn ? 'on' : 'off'}`} onClick={toggleAudioFilter}><div className="toggle-circle"/></div>
          </div>
          <hr className="divider" />
          
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>{t.autoSkip}</h3>
          <div className={`track-info-card ${currentSong ? 'active' : 'inactive'}`}>
            <div className="track-label">{t.currentTrack}</div>
            <div className="track-title">{currentSong ? currentSong.title : t.nothingPlaying}</div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            {/* 🛠 НОВЫЕ КНОПКИ ВЗЯТИЯ ВРЕМЕНИ */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button className={`btn-hover btn-primary ${!currentSong ? 'btn-disabled' : ''}`} disabled={!currentSong} style={{ flex: 1, padding: '6px', fontSize: '11px', borderRadius: '6px', flexDirection: 'row', gap: '5px' }} onClick={() => fetchCurrentTimeForInput('start')}>
                 ⏱ {t.loopStartBtn}
              </button>
              <button className={`btn-hover btn-primary ${!currentSong ? 'btn-disabled' : ''}`} disabled={!currentSong} style={{ flex: 1, padding: '6px', fontSize: '11px', borderRadius: '6px', flexDirection: 'row', gap: '5px' }} onClick={() => fetchCurrentTimeForInput('end')}>
                 ⏱ {t.loopEndBtn}
              </button>
            </div>
            
            <div className="input-group">
              <input type="text" placeholder={t.startSec} value={start} onChange={e => setStart(e.target.value)} className="input-default" style={{ width: '100%' }} disabled={!currentSong} />
              <input type="text" placeholder={t.endSec} value={end} onChange={e => setEnd(e.target.value)} className="input-default" style={{ width: '100%' }} disabled={!currentSong} />
              <button className={`btn-hover btn-success ${!currentSong ? 'btn-disabled' : ''}`} onClick={handleAddRule} disabled={!currentSong} style={{ padding: '0 15px', fontSize: '18px' }}>+</button>
            </div>
            {error && <div style={{ color: '#ff453a', fontSize: '12px' }}>{error}</div>}
          </div>
          
          <div className="list-container">
            {Object.keys(rules).length === 0 ? ( <div className="list-empty">Правил пока нет</div> ) : ( Object.entries(rules).map(([id, ruleData]) => ( ruleData.intervals.map((rule, index) => ( <div key={`rule-${id}-${index}`} className="list-item animated-item"> <div style={{ overflow: 'hidden' }}> <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', width: '180px' }}>{ruleData.title}</div> <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '2px' }}>{formatTime(rule.start)} — {formatTime(rule.end)}</div> </div> <button className="delete-btn" onClick={() => handleDeleteRule(id, index)}>✕</button> </div> )) )) )}
          </div>
          <hr className="divider" />
          <div className="flex-between" style={{ marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>{t.bookmarks}</h3>
            <button className={`btn-hover btn-success ${!currentSong ? 'btn-disabled' : ''}`} onClick={handleSaveCurrentMoment} disabled={!currentSong} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '15px' }}>⚡ {t.saveMoment}</button>
          </div>
          <div className="input-group">
            <input type="text" placeholder={t.manualTime} value={manualTime} onChange={e => setManualTime(e.target.value)} className="input-default" style={{ width: '30%' }} disabled={!currentSong} />
            <input type="text" placeholder={t.momentLabel} value={manualLabel} onChange={e => setManualLabel(e.target.value)} className="input-default" style={{ width: '55%' }} disabled={!currentSong} />
            <button className={`btn-hover btn-success ${!currentSong ? 'btn-disabled' : ''}`} onClick={handleSaveManualMoment} disabled={!currentSong} style={{ width: '15%', fontSize: '18px' }}>+</button>
          </div>
          <div className="list-container">
            {Object.keys(favorites).length === 0 ? ( <div className="list-empty">{t.noBookmarks}</div> ) : ( Object.entries(favorites).map(([id, favData]) => ( favData.moments.map((moment, index) => { const isEditing = editingMoment?.id === id && editingMoment?.index === index; return ( <div key={`fav-${id}-${index}`} className={`list-item animated-item ${!isEditing ? 'list-item-clickable' : ''}`} onClick={() => !isEditing && playMoment(id, moment.time)}> <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}> <div className="badge">{Math.floor(moment.time / 60)}:{(moment.time % 60).toString().padStart(2, '0')}</div> <div className="item-content"> {isEditing ? ( <input autoFocus type="text" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }} onBlur={handleCancelEdit} className="input-default" style={{ padding: '4px 6px', fontSize: '12px', margin: 0, height: '26px' }} /> ) : ( <> <div style={{ fontSize: '13px', fontWeight: 500, color: '#f5f5f7', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{moment.label}</div> <div style={{ fontSize: '10px', color: '#8e8e93', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{favData.title}</div> </> )} </div> </div> <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}> {isEditing ? ( <button className="icon-btn success-text" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }}>✓</button> ) : ( <button className="icon-btn edit-text" onClick={(e) => handleStartEdit(e, id, index, moment.label)}>✎</button> )} <button className="delete-btn" onMouseDown={(e) => { if (isEditing) e.preventDefault(); }} onClick={(e) => { e.stopPropagation(); if (isEditing) { handleCancelEdit(); } else { handleDeleteMoment(id, index); } }}>✕</button> </div> </div> ); }) )) )}
          </div>
        </div>
      ) : (
        <div className="adv-layout animated-item">
          <div className="adv-sidebar">
            <div className={`adv-tab ${advTab === 'eq' ? 'active' : ''}`} onClick={() => setAdvTab('eq')}>{t.menuEq}</div>
            <div className={`adv-tab ${advTab === 'looper' ? 'active' : ''}`} onClick={() => setAdvTab('looper')}>{t.menuLooper}</div>
          </div>
          
          <div className="adv-content">
            {advTab === 'eq' && (
              <div className="animated-item" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="flex-between" style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>{t.eqTitle}</h3>
                  <button className="btn-hover" onClick={resetEq} style={{ background: 'none', border: '1px solid #48484a', color: '#ff453a', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>{t.eqReset}</button>
                </div>
                <div className="eq-panel">
                  {t.bands.map((band, i) => (
                    <div key={i} className="eq-column">
                      <div className="eq-freq">{band.f}</div>
                      <div className="eq-val">{eqBands[i] > 0 ? `+${eqBands[i]}` : eqBands[i]}</div>
                      <input type="range" className="eq-slider" min="-12" max="12" step="1" value={eqBands[i]} onChange={(e) => handleEqChange(i, e.target.value)} />
                      <div className="eq-desc" title={band.desc}>{band.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {advTab === 'looper' && (
              <div className="animated-item" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="flex-between" style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>A-B Looper</h3>
                  <button className="btn-hover" onClick={handleResetLooper} style={{ background: 'none', border: '1px solid #48484a', color: '#ff453a', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>{t.loopReset}</button>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <button className={`btn-hover btn-primary ${!currentSong ? 'btn-disabled' : ''}`} onClick={handleSetA} disabled={!currentSong} style={{ flex: 1, padding: '15px 0' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'normal', marginBottom: '5px' }}>{t.loopStartBtn}</div>
                    <div style={{ fontSize: '18px' }}>{formatTime(looperState.start)}</div>
                  </button>
                  <button className={`btn-hover btn-success ${!currentSong ? 'btn-disabled' : ''}`} onClick={handleSetB} disabled={!currentSong} style={{ flex: 1, padding: '15px 0' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'normal', marginBottom: '5px' }}>{t.loopEndBtn}</div>
                    <div style={{ fontSize: '18px' }}>{formatTime(looperState.end)}</div>
                  </button>
                </div>

                <hr className="divider" style={{ margin: '10px 0 20px 0' }}/>

                <div style={{ marginBottom: '20px' }}>
                  <div className="flex-between" style={{ marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px' }}>{t.speed}</h4>
                    <div style={{ fontSize: '14px', color: '#0a84ff', fontWeight: 'bold' }}>{looperState.speed.toFixed(2)}x</div>
                  </div>
                  
                  <input 
                    type="range" className="speed-slider" min="0.25" max="3" step="0.05" 
                    value={looperState.speed} 
                    onChange={(e) => handleConfigChange(Number(e.target.value), looperState.pitch)}
                    disabled={!currentSong}
                    style={{ width: '100%', cursor: currentSong ? 'pointer' : 'not-allowed' }}
                  />
                  
                  <div style={{ position: 'relative', height: '15px', fontSize: '10px', color: '#8e8e93', marginTop: '8px' }}>
                    <span style={{ position: 'absolute', left: '0' }}>0.25x</span>
                    <span style={{ position: 'absolute', left: '27.27%', transform: 'translateX(-50%)' }}>1.0x</span>
                    <span style={{ position: 'absolute', right: '0' }}>3.0x</span>
                  </div>
                </div>

                <div className="section-card flex-between" style={{ padding: '10px 15px', marginBottom: 0 }}>
                  <div>
                    <h3 className="section-title">{t.pitchToggle}</h3>
                    <p className="section-desc">{t.pitchDesc}</p>
                  </div>
                  <div className={`toggle-bg ${looperState.pitch ? 'on' : 'off'}`} onClick={() => handleConfigChange(looperState.speed, !looperState.pitch)}>
                    <div className="toggle-circle"/>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Popup;