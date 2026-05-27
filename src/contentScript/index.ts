import { throttle } from "./utils/throttle";

let videoElement: HTMLVideoElement | null = null;
let audioContext: AudioContext | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
let compressorNode: DynamicsCompressorNode | null = null;
let preGainNode: GainNode | null = null;

let eqNodes: BiquadFilterNode[] = [];
const EQ_FREQS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

let isNormalized = true;
let isSkipping = false;
let currentEqBands = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

// --- 🔄 СОСТОЯНИЕ ЛУПЕРА (Временное, сбрасывается при смене трека) ---
let currentVideoId: string | null = null;
let loopStart: number | null = null;
let loopEnd: number | null = null;
let playbackSpeed = 1.0;
let preservesPitch = true;

const target: HTMLElement | null = document.body;
const config = { childList: true, subtree: true };

let skipRules: Record<string, { title: string, intervals: { start: number; end: number }[] }> = {};

chrome.storage.local.get(['skipRules', 'eqBands'], (result) => {
  if (result.skipRules) skipRules = result.skipRules;
  if (result.eqBands) currentEqBands = result.eqBands;
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.skipRules) skipRules = changes.skipRules.newValue || {};
    if (changes.eqBands) {
      currentEqBands = changes.eqBands.newValue;
      currentEqBands.forEach((val, i) => {
        if (eqNodes[i]) eqNodes[i].gain.value = val;
      });
    }
  }
});

function buildAudioChain() {
  if (!sourceNode || !audioContext || eqNodes.length === 0) return;
  sourceNode.disconnect(); preGainNode?.disconnect(); compressorNode?.disconnect(); eqNodes.forEach(n => n.disconnect());

  for (let i = 0; i < eqNodes.length - 1; i++) eqNodes[i].connect(eqNodes[i + 1]);
  const eqInput = eqNodes[0]; const eqOutput = eqNodes[eqNodes.length - 1];

  if (isNormalized && preGainNode && compressorNode) {
    sourceNode.connect(preGainNode); preGainNode.connect(eqInput); eqOutput.connect(compressorNode); compressorNode.connect(audioContext.destination);
  } else {
    sourceNode.connect(eqInput); eqOutput.connect(audioContext.destination);
  }
}

function toggleEffect() {
  isNormalized = !isNormalized;
  buildAudioChain();
}

function getActiveVideoId(): string | null {
  const urlId = new URLSearchParams(window.location.search).get('v');
  if (urlId) return urlId;
  const ytPlayer = document.querySelector('ytmusic-player');
  if (ytPlayer && ytPlayer.getAttribute('video-id')) return ytPlayer.getAttribute('video-id');
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

// 🛠 СБРОС ЛУПЕРА (Вызывается при смене трека или из попапа)
function resetLooper() {
  loopStart = null;
  loopEnd = null;
  playbackSpeed = 1.0;
  preservesPitch = true;
  if (videoElement) {
    videoElement.playbackRate = 1.0;
    (videoElement as any).preservesPitch = true;
    (videoElement as any).mozPreservesPitch = true;
    (videoElement as any).webkitPreservesPitch = true;
  }
}

// --- Выделенная логика проверки правил для Throttle ---
const checkPlaybackRules = (currentTime: number, videoId: string) => {
  // Логика лупера
  if (loopStart !== null && loopEnd !== null && currentTime >= loopEnd) {
    isSkipping = true;
    videoElement!.currentTime = loopStart;
    setTimeout(() => { isSkipping = false; }, 100);
    return; // Выходим, чтобы не конфликтовать со скипами
  }

  // Логика скипов
  if (skipRules[videoId] && skipRules[videoId].intervals) {
    skipRules[videoId].intervals.forEach(rule => {
      if (currentTime >= rule.start && currentTime < rule.end) {
        isSkipping = true;
        videoElement!.currentTime = rule.end + 0.1;
        setTimeout(() => { isSkipping = false; }, 1000);
      }
    });
  }
};

// Оборачиваем проверку в throttle (лимит 250 мс)
const throttledSkipCheck = throttle(checkPlaybackRules, 250);

function initAudio(element: HTMLVideoElement) {
  // 1. ОПТИМИЗАЦИЯ ПАМЯТИ: Защита от повторной инициализации
  if (element.dataset.audioInitialized === 'true') return;
  element.dataset.audioInitialized = 'true';

  if (videoElement === element) return;
  videoElement = element;

  if (!audioContext) audioContext = new window.AudioContext();

  if (audioContext.state === 'suspended') {
    const resumeAudio = () => { audioContext?.resume(); document.removeEventListener('click', resumeAudio); };
    document.addEventListener('click', resumeAudio);
    videoElement.addEventListener('play', () => audioContext?.resume(), { once: true });
  }

  if (sourceNode) sourceNode.disconnect();
  sourceNode = audioContext.createMediaElementSource(videoElement);

  if (!preGainNode) preGainNode = audioContext.createGain(); preGainNode.gain.value = 2.0;
  if (!compressorNode) {
    compressorNode = audioContext.createDynamicsCompressor();
    compressorNode.threshold.value = -30; compressorNode.ratio.value = 4;
  }

  if (eqNodes.length === 0) {
    EQ_FREQS.forEach((freq, i) => {
      const node = audioContext!.createBiquadFilter();
      node.type = 'peaking'; node.frequency.value = freq; node.Q.value = 1.41; node.gain.value = currentEqBands[i] || 0;
      eqNodes.push(node);
    });
  }
  chrome.storage.local.get(['isFilterOn'], (data) => {
    isNormalized = data.isFilterOn !== undefined ? data.isFilterOn : true;
    buildAudioChain();
  });

  videoElement.addEventListener('timeupdate', () => {
    if (isSkipping) return;
    const videoId = getActiveVideoId();
    if (!videoId || !videoElement) return;

    // Сброс лупера при смене трека
    if (currentVideoId !== videoId) {
      currentVideoId = videoId;
      resetLooper();
    }

    const currentTime = videoElement.currentTime;
    
    // 3. ОПТИМИЗАЦИЯ CPU: Используем throttled функцию вместо прямого вызова
    throttledSkipCheck(currentTime, videoId);
  });
}

const observer = new MutationObserver(() => {
  const element = document.querySelector('video');
  if (element) {
    initAudio(element);
    // 2. ОПТИМИЗАЦИЯ DOM: Отключаем observer, как только нашли video
    observer.disconnect(); 
  }
});

if (target) observer.observe(target, config);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggle') {
    toggleEffect(); sendResponse({ status: 'ok' });
  }
  if (message.action === 'GET_CURRENT_SONG') {
    const videoId = getActiveVideoId();
    const titleNode = document.querySelector('ytmusic-player-bar yt-formatted-string.title');
    const title = titleNode ? titleNode.textContent : 'Неизвестный трек';
    sendResponse({ videoId, title });
  }
  if (message.action === 'GET_CURRENT_TIME') {
    sendResponse({ currentTime: videoElement ? videoElement.currentTime : 0 });
  }
  if (message.action === 'PLAY_MOMENT_LOCAL' && videoElement) {
    isSkipping = true;
    videoElement.currentTime = message.time;
    videoElement.play();
    setTimeout(() => { isSkipping = false; }, 1000);
    sendResponse({ status: 'ok' });
  }

  // --- API ЛУПЕРА ---
  if (message.action === 'GET_LOOPER_STATE') {
    sendResponse({ start: loopStart, end: loopEnd, speed: playbackSpeed, pitch: preservesPitch });
  }
  if (message.action === 'SET_LOOP_A' && videoElement) {
    loopStart = videoElement.currentTime;
    if (loopEnd !== null && loopStart >= loopEnd) loopEnd = null; // Защита от старт > конец
    sendResponse({ start: loopStart, end: loopEnd });
  }
  if (message.action === 'SET_LOOP_B' && videoElement) {
    loopEnd = videoElement.currentTime;
    if (loopStart !== null && loopEnd <= loopStart) loopStart = null;
    sendResponse({ start: loopStart, end: loopEnd });
  }
  if (message.action === 'RESET_LOOPER') {
    resetLooper();
    sendResponse({ status: 'ok' });
  }
  if (message.action === 'SET_LOOPER_CONFIG' && videoElement) {
    playbackSpeed = message.speed;
    preservesPitch = message.pitch;
    videoElement.playbackRate = playbackSpeed;
    (videoElement as any).preservesPitch = preservesPitch;
    (videoElement as any).mozPreservesPitch = preservesPitch;
    (videoElement as any).webkitPreservesPitch = preservesPitch;
    sendResponse({ status: 'ok' });
  }
  if (message.action === 'GET_SYNC_DATA') {
    const videoId = getActiveVideoId();
    const titleNode = document.querySelector('ytmusic-player-bar yt-formatted-string.title');
    const title = titleNode ? titleNode.textContent : 'Неизвестный трек';
    
    sendResponse({ 
      song: { videoId, title },
      looper: { start: loopStart, end: loopEnd, speed: playbackSpeed, pitch: preservesPitch }
    });
  }
  return true;
});