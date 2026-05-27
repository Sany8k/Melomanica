import { create } from 'zustand';
import { Lang } from '../types/Lang';

interface PlayerState {
  isFilterOn: boolean;
  eqBands: number[];
  looperState: {
    start: number | null;
    end: number | null;
    speed: number;
    pitch: boolean;
  };
  
  toggleAudioFilter: () => Promise<void>;
  handleEqChange: (index: number, value: string) => void;
  resetEq: () => void;
  handleSetA: () => void;
  handleSetB: () => void;
  handleResetLooper: () => void;
  handleConfigChange: (speed: number, pitch: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  isFilterOn: true,
  eqBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  looperState: { start: null, end: null, speed: 1.0, pitch: true },

  toggleAudioFilter: async () => {
    const currentFilter = get().isFilterOn;
    const newState = !currentFilter;
    
    set({ isFilterOn: newState });
    chrome.storage.local.set({ isFilterOn: newState });

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' });
  },

  handleEqChange: (index, value) => {
    const currentBands = get().eqBands;
    const newBands = [...currentBands];
    newBands[index] = Number(value);

    set({ eqBands: newBands });
    chrome.storage.local.set({ eqBands: newBands });
  },

  resetEq: () => {
    const empty = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    set({ eqBands: empty });
    chrome.storage.local.set({ eqBands: empty });
  },

  handleSetA: () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'SET_LOOP_A' }, (res) => {
          if (res) set((state) => ({ looperState: { ...state.looperState, start: res.start, end: res.end } }));
        });
      }
    });
  },

  handleSetB: () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'SET_LOOP_B' }, (res) => {
          if (res) set((state) => ({ looperState: { ...state.looperState, start: res.start, end: res.end } }));
        });
      }
    });
  },

  handleResetLooper: () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'RESET_LOOPER' }, () => {
          set({ looperState: { start: null, end: null, speed: 1.0, pitch: true } });
        });
      }
    });
  },

  handleConfigChange: (speed, pitch) => {
    set({ looperState: { start: get().looperState.start, end: get().looperState.end, speed, pitch } });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'SET_LOOPER_CONFIG', speed, pitch });
      }
    });
  },
}));