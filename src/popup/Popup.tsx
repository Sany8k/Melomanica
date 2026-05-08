import { useState, useEffect } from 'react';

// --- СЛОВАРИ (Вынесены из компонента для оптимизации памяти) ---
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
    errEnable: 'Включите песню в YouTube Music',
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
    errEnable: 'Play a song in YouTube Music first',
    errFill: 'Fill in both fields',
    errNum: 'Use numbers only',
    errNeg: 'Time cannot be negative',
    errLogic: 'Start time must be before End time',
  }
};

export const Popup = () => {
  // Состояния
  const [lang, setLang] = useState<Lang>('ru');
  const [isFilterOn, setIsFilterOn] = useState(true);
  const [rules, setRules] = useState<Record<string, { title: string, intervals: { start: number; end: number }[] }>>({});
  
  const [currentSong, setCurrentSong] = useState<{ id: string, title: string } | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');

  const t = i18n[lang];

  // ИНИЦИАЛИЗАЦИЯ
  useEffect(() => {
    chrome.storage.local.get(['skipRules', 'isFilterOn', 'lang'], (data) => {
      if (data.skipRules) setRules(data.skipRules);
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

  // ПЕРЕКЛЮЧЕНИЕ ЯЗЫКА
  const toggleLang = () => {
    const newLang = lang === 'ru' ? 'en' : 'ru';
    setLang(newLang);
    chrome.storage.local.set({ lang: newLang });
  };

  // УПРАВЛЕНИЕ АУДИО
  const toggleAudioFilter = async () => {
    const newState = !isFilterOn;
    setIsFilterOn(newState);
    chrome.storage.local.set({ isFilterOn: newState });

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' });
    }
  };

  // ДОБАВЛЕНИЕ ПРАВИЛА
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

    if (!newRules[videoId]) {
      newRules[videoId] = { title: currentSong.title, intervals: [] };
    }
    
    newRules[videoId].intervals.push({ start: s, end: e });

    setRules(newRules);
    chrome.storage.local.set({ skipRules: newRules });
    
    setStart('');
    setEnd('');
    setError('');
  };

  // УДАЛЕНИЕ ПРАВИЛА
  const handleDeleteRule = (id: string, indexToRemove: number) => {
    const newRules = { ...rules };
    newRules[id].intervals = newRules[id].intervals.filter((_, index) => index !== indexToRemove);
    
    if (newRules[id].intervals.length === 0) delete newRules[id];

    setRules(newRules);
    chrome.storage.local.set({ skipRules: newRules });
  };

  return (
    <>
      {/* Внедряем CSS для анимаций и скроллбара */}
      <style>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #48484a; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #636366; }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animated-item {
          animation: fadeIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        
        .btn-hover:hover { filter: brightness(1.1); transform: scale(0.98); }
        .btn-hover:active { filter: brightness(0.9); }
      `}</style>

      <div style={{
        width: '320px', backgroundColor: '#1c1c1e', color: '#f5f5f7',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '20px', boxSizing: 'border-box', overflow: 'hidden'
      }}>
        
        {/* HEADER & LANG */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, #ff2a5f, #ff719a)', padding: '8px', borderRadius: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
              </svg>
            </div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Melomanica</h2>
          </div>
          
          <button 
            onClick={toggleLang}
            style={{
              background: '#2c2c2e', border: '1px solid #3a3a3c', color: '#8e8e93',
              borderRadius: '8px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer',
              transition: 'color 0.2s'
            }}
          >
            {lang.toUpperCase()}
          </button>
        </div>

        {/* AUDIO FILTER */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: '#2c2c2e', padding: '15px', borderRadius: '12px', marginBottom: '20px'
        }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{t.studioSound}</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#8e8e93' }}>{t.agcDesc}</p>
          </div>
          <div onClick={toggleAudioFilter} style={{
              width: '50px', height: '30px', backgroundColor: isFilterOn ? '#34c759' : '#3a3a3c',
              borderRadius: '15px', position: 'relative', cursor: 'pointer', transition: '0.3s ease'
            }}>
            <div style={{
              width: '26px', height: '26px', backgroundColor: 'white', borderRadius: '50%',
              position: 'absolute', top: '2px', left: isFilterOn ? '22px' : '2px', transition: '0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}/>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #3a3a3c', margin: '0 0 20px 0' }} />

        {/* AUTO SKIP FORM */}
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>{t.autoSkip}</h3>
        
        <div style={{ 
          backgroundColor: currentSong ? '#3a3a3c' : '#2c2c2e', 
          padding: '10px', borderRadius: '8px', marginBottom: '10px',
          border: currentSong ? '1px solid #48484a' : '1px dashed #48484a',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '4px' }}>{t.currentTrack}</div>
          <div style={{ fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentSong ? currentSong.title : t.nothingPlaying}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="number" min="0" placeholder={t.startSec} 
              value={start} onChange={e => setStart(e.target.value)}
              style={inputStyle} disabled={!currentSong}
            />
            <input 
              type="number" min="0" placeholder={t.endSec} 
              value={end} onChange={e => setEnd(e.target.value)}
              style={inputStyle} disabled={!currentSong}
            />
          </div>
          
          <div style={{ height: '14px', transition: 'opacity 0.2s', opacity: error ? 1 : 0 }}>
            <span style={{ color: '#ff453a', fontSize: '12px' }}>{error}</span>
          </div>
          
          <button 
            className="btn-hover"
            onClick={handleAddRule} disabled={!currentSong}
            style={{
              backgroundColor: currentSong ? '#0a84ff' : '#3a3a3c', 
              color: currentSong ? 'white' : '#8e8e93',
              border: 'none', borderRadius: '8px', padding: '10px',
              fontSize: '14px', fontWeight: 600, 
              cursor: currentSong ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease', marginTop: '2px'
            }}
          >
            {t.addRule}
          </button>
        </div>

        {/* RULES LIST */}
        <div style={{ backgroundColor: '#2c2c2e', borderRadius: '12px', padding: '10px', maxHeight: '180px', overflowY: 'auto' }}>
          {Object.keys(rules).length === 0 ? (
            <div style={{ textAlign: 'center', color: '#8e8e93', fontSize: '13px', padding: '20px 0' }}>
              {t.noRules}
            </div>
          ) : (
            Object.entries(rules).map(([id, ruleData]) => (
              ruleData.intervals.map((rule, index) => (
                <div key={`${id}-${index}`} className="animated-item" style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  backgroundColor: '#3a3a3c', padding: '10px', borderRadius: '8px', marginBottom: '8px'
                }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', width: '180px' }}>
                      {ruleData.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '2px' }}>
                      {t.skip} {rule.start}с — {rule.end}с
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDeleteRule(id, index)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', color: '#ff453a', transition: 'transform 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    ✕
                  </button>
                </div>
              ))
            ))
          )}
        </div>
      </div>
    </>
  );
};

const inputStyle = {
  backgroundColor: '#3a3a3c', border: '1px solid #48484a', color: 'white',
  padding: '10px', borderRadius: '8px', fontSize: '14px', outline: 'none',
  width: '100%', boxSizing: 'border-box' as const, transition: 'border-color 0.2s',
};

export default Popup;