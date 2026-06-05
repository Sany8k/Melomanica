import { create } from 'zustand';

export const EQ_PRESETS: Record<string, number[]> = {
  'Flat': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  'Rock': [5, 4, 3, -1, -2, -1, 2, 3, 4, 5],
  'Vocal': [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2],
  'Electronic': [4, 3, 1, -2, -3, 0, 1, 3, 4, 5],
};

interface PlayerState {
  isFilterOn: boolean;
  eqBands: number[];
  activePreset: string;
  customEqBands: number[];
  looperState: {
    start: number | null;
    end: number | null;
    speed: number;
    pitch: boolean;
  };
  
  toggleAudioFilter: () => Promise<void>;
  handleEqChange: (index: number, value: string) => void;
  applyPreset: (name: string) => void;
  resetEq: () => void;
  handleSetA: () => void;
  handleSetB: () => void;
  handleResetLooper: () => void;
  handleConfigChange: (speed: number, pitch: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  isFilterOn: true,
  eqBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  activePreset: 'Flat',
  customEqBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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

    set({ eqBands: newBands, activePreset: 'Custom', customEqBands: newBands });
    chrome.storage.local.set({ eqBands: newBands, activePreset: 'Custom', customEqBands: newBands });
  },

  applyPreset: (name: string) => {
    let newBands: number[];
    
    if (name === 'Custom') {
      newBands = [...get().customEqBands];
    } else if (EQ_PRESETS[name]) {
      newBands = [...EQ_PRESETS[name]];
    } else {
      return;
    }

    set({ eqBands: newBands, activePreset: name });
    chrome.storage.local.set({ eqBands: newBands, activePreset: name });
  },

  resetEq: () => {
    const empty = [...EQ_PRESETS['Flat']];
    set({ eqBands: empty, activePreset: 'Flat' });
    chrome.storage.local.set({ eqBands: empty, activePreset: 'Flat' });
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