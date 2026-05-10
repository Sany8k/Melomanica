let videoElement: HTMLVideoElement | null = null;
let audioContext: AudioContext | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
let compressorNode: DynamicsCompressorNode | null = null;
let preGainNode: GainNode | null = null;
let isNormalized = true;
let isSkipping = false;

const target: HTMLElement | null = document.body;
const config = { childList: true, subtree: true };

// БАЗА ТАЙМКОДОВ
let skipRules: Record<string, { title: string, intervals: { start: number; end: number }[] }> = {};

// --- 💾 СИНХРОНИЗАЦИЯ С ПАМЯТЬЮ БРАУЗЕРА ---
chrome.storage.local.get(['skipRules'], (result) => {
  if (result.skipRules) {
    skipRules = result.skipRules;
    console.log('🎵 Melomanica: База таймкодов загружена', skipRules);
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.skipRules) {
    skipRules = changes.skipRules.newValue || {};
    console.log('🎵 Melomanica: База таймкодов обновлена на лету', skipRules);
  }
});

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
}

// --- 🥷 УМНЫЙ ЭКСТРАКТОР ID ---
function getActiveVideoId(): string | null {
  const urlId = new URLSearchParams(window.location.search).get('v');
  if (urlId) return urlId;

  const ytPlayer = document.querySelector('ytmusic-player');
  if (ytPlayer && ytPlayer.getAttribute('video-id')) {
    return ytPlayer.getAttribute('video-id');
  }

  const ytpLink = document.querySelector('.ytp-title-link');
  if (ytpLink) {
    const match = ytpLink.getAttribute('href')?.match(/v=([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
  }

  const anyPlayerLink = document.querySelector('ytmusic-player-bar a[href*="watch?v="]');
  if (anyPlayerLink) {
    const match = anyPlayerLink.getAttribute('href')?.match(/v=([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
  }

  return null;
}

// --- 🎧 ИНИЦИАЛИЗАЦИЯ АУДИО (Защита от SPA и Suspended) ---
function initAudio(element: HTMLVideoElement) {
  // Если это тот же самый элемент, ничего не делаем
  if (videoElement === element) return;
  videoElement = element;
  console.log('🎵 Melomanica: Video element attached!');

  if (!audioContext) {
    audioContext = new window.AudioContext();
  }

  // Решаем проблему Suspended AudioContext (браузеры блокируют автоплей аудио без жеста пользователя)
  if (audioContext.state === 'suspended') {
    const resumeAudio = () => {
      audioContext?.resume();
      document.removeEventListener('click', resumeAudio);
    };
    document.addEventListener('click', resumeAudio);
    videoElement.addEventListener('play', () => audioContext?.resume(), { once: true });
  }

  // Очищаем старые ноды при пересоздании видео
  if (sourceNode) sourceNode.disconnect();
  sourceNode = audioContext.createMediaElementSource(videoElement);

  if (!preGainNode) preGainNode = audioContext.createGain();
  preGainNode.gain.value = 2.0;

  if (!compressorNode) compressorNode = audioContext.createDynamicsCompressor();
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

  // НАСТРОЙКА АВТО-СКИПА
  videoElement.addEventListener('timeupdate', () => {
    if (isSkipping) return;

    const videoId = getActiveVideoId();
    if (!videoId || !videoElement) return;

    const currentTime = videoElement.currentTime;

    if (skipRules[videoId] && skipRules[videoId].intervals) {
      skipRules[videoId].intervals.forEach(rule => {
        if (currentTime >= rule.start && currentTime < rule.end) {
          isSkipping = true;
          videoElement!.currentTime = rule.end + 0.1; 
          console.log(`🎵 Melomanica: Скип фрагмента ${rule.start}s - ${rule.end}s`);

          setTimeout(() => {
            isSkipping = false;
          }, 1000);
        }
      });
    }
  });
}

const observer = new MutationObserver(() => {
  const element = document.querySelector('video');
  if (element) {
    initAudio(element);
    // НЕ отключаем observer, чтобы ловить пересоздание <video> при переходах по страницам SPA
  }
});

if (target) observer.observe(target, config);

// --- 📡 СВЯЗЬ С ИНТЕРФЕЙСОМ ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggle') {
    toggleEffect();
    sendResponse({ status: 'ok' });
  }
  
  if (message.action === 'GET_CURRENT_SONG') {
    const videoId = getActiveVideoId();
    const titleNode = document.querySelector('ytmusic-player-bar yt-formatted-string.title');
    const title = titleNode ? titleNode.textContent : 'Неизвестный трек';
    sendResponse({ videoId, title });
  }

  // НОВОЕ: Получение точного времени
  if (message.action === 'GET_CURRENT_TIME') {
    sendResponse({ currentTime: videoElement ? videoElement.currentTime : 0 });
  }

  // НОВОЕ: Перемотка на закладку
  if (message.action === 'PLAY_MOMENT') {
    if (videoElement && message.time !== undefined) {
      isSkipping = true; // Блокируем авто-скип на секунду
      videoElement.currentTime = message.time;
      videoElement.play();
      setTimeout(() => { isSkipping = false; }, 1000);
      sendResponse({ status: 'playing' });
    }
  }
  return true;
});