export const i18n = {
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