let videoElement: HTMLVideoElement | null = null;
let audioContext: AudioContext | null = null;
var target: HTMLElement | null = document.body;

let sourceNode: MediaElementAudioSourceNode | null = null;
let compressorNode: DynamicsCompressorNode | null = null;
let preGainNode: GainNode | null = null;
let isNormalized = true;
let isSkipping = false;

const config = {
  attributes: true,
  childList: true,
  subtree: true,
};

// БАЗА ТАЙМКОДОВ (Теперь это let, чтобы мы могли её перезаписывать)
let skipRules: Record<string, { title: string, intervals: { start: number; end: number }[] }> = {};

// --- 💾 СИНХРОНИЗАЦИЯ С ПАМЯТЬЮ БРАУЗЕРА ---

// 1. При старте страницы запрашиваем базу из хранилища
chrome.storage.local.get(['skipRules'], (result) => {
  if (result.skipRules) {
    skipRules = result.skipRules;
    console.log('🎵 Melomanica: База таймкодов загружена', skipRules);
  }
});

// 2. Слушаем изменения (сработает мгновенно, когда ты нажмешь "Добавить" в Popup)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.skipRules) {
    skipRules = changes.skipRules.newValue || {};
    console.log('🎵 Melomanica: База таймкодов обновлена на лету', skipRules);
  }
});
// ------------------------------------------

function toggleEffect() {
  isNormalized = !isNormalized;
  
  sourceNode?.disconnect();
  preGainNode?.disconnect();
  compressorNode?.disconnect();
  
  if (isNormalized) {
    if (sourceNode && preGainNode && compressorNode && audioContext) {
      sourceNode.connect(preGainNode);
      preGainNode.connect(compressorNode);
      compressorNode.connect(audioContext.destination);
    }
  } else {
    if (sourceNode && audioContext) {
      sourceNode.connect(audioContext.destination);
    }
  }
} (window as any).toggleEffect = toggleEffect;

// --- 🥷 УМНЫЙ ЭКСТРАКТОР ID ---
function getActiveVideoId(): string | null {
  // 1. Проверяем URL (работает, если страница песни открыта напрямую)
  const urlId = new URLSearchParams(window.location.search).get('v');
  if (urlId) return urlId;

  // 2. Главный контейнер плеера (Самый надежный способ для плейлистов)
  const ytPlayer = document.querySelector('ytmusic-player');
  if (ytPlayer && ytPlayer.getAttribute('video-id')) {
    return ytPlayer.getAttribute('video-id');
  }

  // 3. Внутренняя скрытая ссылка самого тега видео
  const ytpLink = document.querySelector('.ytp-title-link');
  if (ytpLink) {
    const match = ytpLink.getAttribute('href')?.match(/v=([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
  }

  // 4. Любая ссылка в нижнем плеере (запасной вариант)
  const anyPlayerLink = document.querySelector('ytmusic-player-bar a[href*="watch?v="]');
  if (anyPlayerLink) {
    const match = anyPlayerLink.getAttribute('href')?.match(/v=([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
  }

  return null;
}

const observer: MutationObserver = new MutationObserver((mutationsList, observer: MutationObserver) => {
  const element = document.querySelector('video');

  if (element !== null) {
    videoElement = element;
    console.log('Video element was found!');
    observer.disconnect();

    audioContext = new window.AudioContext();
    sourceNode = audioContext.createMediaElementSource(videoElement);

    preGainNode = audioContext.createGain();
    preGainNode.gain.value = 2.0;

    compressorNode = audioContext.createDynamicsCompressor();
    compressorNode.threshold.value = -30;
    compressorNode.ratio.value = 4;
    compressorNode.knee.value = 12;
    compressorNode.attack.value = 0.01; 
    compressorNode.release.value = 0.8;
    
    chrome.storage.local.get(['isFilterOn'], (data) => {
      isNormalized = data.isFilterOn !== undefined ? data.isFilterOn : true;
      
      if (isNormalized) {
        sourceNode!.connect(preGainNode!);
        preGainNode!.connect(compressorNode!);
        compressorNode!.connect(audioContext!.destination);
      } else {
        sourceNode!.connect(audioContext!.destination);
      }
    });

    console.log('Статус контекста:', audioContext.state);

    // НАСТРОЙКА АВТО-СКИПА
// НАСТРОЙКА АВТО-СКИПА
    videoElement.addEventListener('timeupdate', () => {
      // Если мы в процессе перемотки — ничего не делаем, ждем
      if (isSkipping) return;

      const videoId = getActiveVideoId();
      const currentTime = videoElement!.currentTime;

      // Перемотка
      if (videoId && skipRules[videoId].intervals) {
        skipRules[videoId].intervals.forEach(rule => {
          // Если попали в зону пропуска
          if (currentTime >= rule.start && currentTime < rule.end) {
            
            isSkipping = true; // Включаем защиту от двойного срабатывания
            
            // Перематываем чуть-чуть дальше конца (+0.1 сек), чтобы наверняка выйти из зоны
            videoElement!.currentTime = rule.end + 0.1; 
            console.log(`🎵 Melomanica: Скип фрагмента ${rule.start}s - ${rule.end}s`);

            // Даем плееру YouTube 1 секунду, чтобы прогрузить буфер, затем снимаем блокировку
            setTimeout(() => {
              isSkipping = false;
            }, 1000);

          }
        });
      }
    });
  }
});

observer.observe(target, config);

// --- 📡 СВЯЗЬ С ИНТЕРФЕЙСОМ ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggle') {
    toggleEffect();
  }
  
  // Попап просит данные о текущей песне
  if (message.action === 'GET_CURRENT_SONG') {
    const videoId = getActiveVideoId(); // Используем нашего умного шпиона
    
    // Ищем название песни в нижнем баре
    const titleNode = document.querySelector('ytmusic-player-bar yt-formatted-string.title');
    const title = titleNode ? titleNode.textContent : 'Неизвестный трек';
    
    sendResponse({ videoId, title });
  }
  return true;
});