export const i18n = {
  ru: {
    menuMetronome: 'Метроном', metronomeBackground: 'Продолжает играть после закрытия окна',
    metronomeBeats: 'Ударов в такте', metronomeNotes: 'Длительность нот',
    metronomeTone: 'Нота удара', metronomeAccent: 'Нота акцента', metronomeVolume: 'Громкость',
    metronomeStart: 'Запустить', metronomeStop: 'Остановить',
    metronomePresets: 'Пресеты', metronomeNew: 'Новый пресет', metronomeSave: 'Сохранить',
    metronomeUnsaved: 'Есть несохранённые изменения', metronomeSaveHint: 'Изменения пресета сохраняются по кнопке',
    metronomeEmpty: 'Нет сохранённых пресетов', metronomeDelete: 'Удалить пресет',
    metronomeAudioError: 'Не удалось подключить метроном. Попробуйте запустить снова.',
    metronomeStorageError: 'Не удалось сохранить настройки. Проверьте свободное место.',
    editVolume: 'Изменить громкость', volumeAutoSaved: 'Изменения сохраняются автоматически.',
    globalVolume: 'Общая громкость', trackVolume: 'Громкость трека',
    trackVolumeDesc: '100% — использовать общую громкость. Другое значение имеет приоритет. Нажмите +, чтобы сохранить.',
    saveVolume: 'Сохранить громкость трека', noVolumeRules: 'Нет сохранённых настроек громкости.',
    enableVolume: 'Включить громкость трека', disableVolume: 'Отключить громкость трека', deleteVolume: 'Удалить настройку громкости',
    enableSkip: 'Включить пропуск', disableSkip: 'Отключить пропуск',
    studioSound: 'Студийный звук', agcDesc: 'Нормализация громкости', autoSkip: 'Авто-Скип',
    currentTrack: 'ТЕКУЩИЙ ТРЕК', nothingPlaying: 'Ничего не играет...', startSec: 'Старт (напр. 1:15)',
    endSec: 'Конец (напр. 2:30)', bookmarks: 'Закладки', saveMoment: 'Текущий момент',
    noBookmarks: 'Нет сохраненных моментов.', manualTime: 'Время', momentLabel: 'Название',
    errEnable: 'Включите песню', errFill: 'Заполните оба поля', errNum: 'Неверный формат времени', errNeg: 'Время не может быть < 0', errLogic: 'Старт должен быть < Конца',
    btnAdv: 'ПРО', btnMain: 'НАЗАД',
    menuEq: 'Эквалайзер', menuLooper: 'Лупер & Скорость', eqTitle: '10-полосный Эквалайзер', eqReset: 'СБРОСИТЬ',
    
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
    menuMetronome: 'Metronome', metronomeBackground: 'Keeps playing with the popup closed',
    metronomeBeats: 'Beats per bar', metronomeNotes: 'Note duration',
    metronomeTone: 'Beat note', metronomeAccent: 'Accent note', metronomeVolume: 'Volume',
    metronomeStart: 'Start', metronomeStop: 'Stop',
    metronomePresets: 'Presets', metronomeNew: 'New preset', metronomeSave: 'Save',
    metronomeUnsaved: 'Unsaved changes', metronomeSaveHint: 'Press Save to update a preset',
    metronomeEmpty: 'No saved presets', metronomeDelete: 'Delete preset',
    metronomeAudioError: 'Could not connect to the metronome. Try starting it again.',
    metronomeStorageError: 'Could not save settings. Check available storage.',
    editVolume: 'Edit volume', volumeAutoSaved: 'Changes are saved automatically.',
    globalVolume: 'Global Volume', trackVolume: 'Track Volume',
    trackVolumeDesc: '100% uses global volume. Any other value overrides it. Press + to save.',
    saveVolume: 'Save track volume', noVolumeRules: 'No saved volume settings.',
    enableVolume: 'Enable track volume', disableVolume: 'Disable track volume', deleteVolume: 'Delete volume setting',
    enableSkip: 'Enable skip', disableSkip: 'Disable skip',
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
