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

let currentVideoId: string | null = null;
let loopStart: number | null = null;
let loopEnd: number | null = null;
let playbackSpeed = 1.0;
let preservesPitch = true;
let activeSkipTimers: number[] = [];

let looperAnimationFrameId: number | null = null;

function startHighPrecisionLooper() {
  if (!videoElement) return;

  const checkLoop = () => {
    if (loopStart !== null && loopEnd !== null && !isSkipping) {
      if (videoElement!.currentTime >= loopEnd || videoElement!.currentTime < loopStart) {
        isSkipping = true;
        videoElement!.currentTime = loopStart;
        setTimeout(() => { isSkipping = false; }, 50);
      }
    }
    looperAnimationFrameId = requestAnimationFrame(checkLoop);
  };

  if (looperAnimationFrameId === null) {
    looperAnimationFrameId = requestAnimationFrame(checkLoop);
  }
}

function stopHighPrecisionLooper() {
  if (looperAnimationFrameId !== null) {
    cancelAnimationFrame(looperAnimationFrameId);
    looperAnimationFrameId = null;
  }
}

const target: HTMLElement | null = document.body;
const config = { childList: true, subtree: true };

let skipRules: Record<string, { title: string, intervals: { start: number; end: number }[] }> = {};

chrome.storage.local.get(['skipRules', 'eqBands'], (result) => {
  if (result.skipRules) skipRules = result.skipRules;
  if (result.eqBands) currentEqBands = result.eqBands;
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.skipRules) {
      skipRules = changes.skipRules.newValue || {};
      if (currentVideoId) scheduleSkipsForTrack(currentVideoId);
    }
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
  
  try {
    sourceNode.disconnect(); preGainNode?.disconnect(); compressorNode?.disconnect(); eqNodes.forEach(n => n.disconnect());
  } catch(e) {}

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
  return null;
}

function getActiveTrackTitle(): string {
  const ytMusicTitleNode = document.querySelector('ytmusic-player-bar yt-formatted-string.title');
  if (ytMusicTitleNode && ytMusicTitleNode.textContent) return ytMusicTitleNode.textContent;

  const ytTitleNode = document.querySelector('h1.ytd-watch-metadata yt-formatted-string');
  if (ytTitleNode && ytTitleNode.textContent) return ytTitleNode.textContent;

  return 'Неизвестный трек';
}

function resetLooper() {
  loopStart = null;
  loopEnd = null;
  playbackSpeed = 1.0;
  preservesPitch = true;
  stopHighPrecisionLooper();

  if (videoElement) {
    videoElement.playbackRate = 1.0;
    (videoElement as any).preservesPitch = true;
    (videoElement as any).mozPreservesPitch = true;
    (videoElement as any).webkitPreservesPitch = true;
  }
}

function clearSkipMemory() {
  activeSkipTimers.forEach(clearTimeout);
  activeSkipTimers = [];
}

function scheduleSkipsForTrack(videoId: string) {
  clearSkipMemory();

  const trackRules = skipRules[videoId];
  if (!trackRules || !trackRules.intervals || !videoElement) return;

  const currentTime = videoElement.currentTime;

  const activeSkip = trackRules.intervals.find(rule => currentTime >= rule.start && currentTime < rule.end);

  if (activeSkip) {
    isSkipping = true;
    videoElement.currentTime = activeSkip.end + 0.1;
    setTimeout(() => { isSkipping = false; }, 500);
    return; 
  }

  trackRules.intervals.forEach(rule => {
    if (rule.start > currentTime) {
      const delayInMs = (rule.start - currentTime) * 1000;
      
      const timerId = window.setTimeout(() => {
        if (!videoElement) return;
        isSkipping = true;
        videoElement.currentTime = rule.end + 0.1;
        setTimeout(() => { isSkipping = false; }, 500); 
      }, delayInMs);
      
      activeSkipTimers.push(timerId);
    }
  });
}

function initAudio(element: HTMLVideoElement) {
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

  if (!sourceNode) {
    try {
      sourceNode = audioContext.createMediaElementSource(videoElement);
    } catch(e) {}
  }

  if (!preGainNode) { preGainNode = audioContext.createGain(); preGainNode.gain.value = 2.0; }
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

  const handlePlaybackChange = () => {
    const videoId = getActiveVideoId();
    if (!videoId || !videoElement) return;

    if (currentVideoId !== videoId) {
      currentVideoId = videoId;
      resetLooper();
    }
    
    scheduleSkipsForTrack(videoId);
  };

  videoElement.addEventListener('playing', handlePlaybackChange);
  videoElement.addEventListener('seeked', handlePlaybackChange);
}

function tryInit() {
  const element = document.querySelector('video');
  if (element && element.dataset.audioInitialized !== 'true') {
    initAudio(element);
  }
}

tryInit();

document.addEventListener('yt-navigate-finish', () => {
  setTimeout(tryInit, 500); 
});

document.addEventListener('ytmusic-navigate-finish', () => {
  setTimeout(tryInit, 500);
});

const observer = new MutationObserver(() => {
  tryInit();
});

const targetNode = document.body || document.documentElement;
if (targetNode) {
  observer.observe(targetNode, { childList: true, subtree: true });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggle') {
    toggleEffect(); sendResponse({ status: 'ok' });
  }

  if (message.action === 'GET_CURRENT_SONG') {
    sendResponse({ videoId: getActiveVideoId(), title: getActiveTrackTitle() });
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
  
  if (message.action === 'GET_LOOPER_STATE') {
    sendResponse({ start: loopStart, end: loopEnd, speed: playbackSpeed, pitch: preservesPitch });
  }

  if (message.action === 'SET_LOOP_A' && videoElement) {
    loopStart = message.time !== undefined ? message.time : videoElement.currentTime;
    if (loopStart !== null && loopEnd !== null && loopStart >= loopEnd) {
      loopEnd = null;
    }
    if (loopStart !== null && loopEnd !== null) {
      startHighPrecisionLooper(); 
    }
    sendResponse({ start: loopStart, end: loopEnd });
  }
  
  if (message.action === 'SET_LOOP_B' && videoElement) {
    loopEnd = message.time !== undefined ? message.time : videoElement.currentTime;
    if (loopStart !== null && loopEnd !== null && loopEnd <= loopStart) {
      loopStart = null;
    }
    if (loopStart !== null && loopEnd !== null) {
      startHighPrecisionLooper();
    }
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
    sendResponse({
      song: { videoId: getActiveVideoId(), title: getActiveTrackTitle() },
      looper: { start: loopStart, end: loopEnd, speed: playbackSpeed, pitch: preservesPitch }
    });
  }

  return true;
});