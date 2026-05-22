import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { i18n } from "./i18n";
import { CurrentSongType } from "../types/CurrentSongType";

type Lang = 'ru' | 'en';

interface AppContextType {
  lang: Lang;
  t: typeof i18n['ru'];
  currentSong: CurrentSongType;
  setCurrentSong: (song: CurrentSongType) => void;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  isFilterOn: boolean;
  setIsFilterOn: (on: boolean) => void;
  toggleAudioFilter: () => void;
  eqBands: number[];
  setEqBands: (bands: number[]) => void;
  looperState: { start: number | null; end: number | null; speed: number; pitch: boolean };
  setLooperState: (state: { start: number | null; end: number | null; speed: number; pitch: boolean }) => void;
  handleEqChange: (index: number, value: string) => void;
  resetEq: () => void;
  handleSetA: () => void;
  handleSetB: () => void;
  handleResetLooper: () => void;
  handleConfigChange: (speed: number, pitch: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>('ru');
  const [currentSong, setCurrentSong] = useState<CurrentSongType>(null);
  const [isFilterOn, setIsFilterOn] = useState(true);
  const [eqBands, setEqBands] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [looperState, setLooperState] = useState({ start: null as number | null, end: null as number | null, speed: 1.0, pitch: true });

  const t = i18n[lang];

  const toggleLang = () => {
    const newLang = lang === 'ru' ? 'en' : 'ru';
    setLang(newLang);
    chrome.storage.local.set({ lang: newLang });
  };

  const toggleAudioFilter = async () => {
    const newState = !isFilterOn; setIsFilterOn(newState);
    chrome.storage.local.set({ isFilterOn: newState });
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' });
  };

  const handleEqChange = (index: number, value: string) => {
    const newBands = [...eqBands]; newBands[index] = Number(value);
    setEqBands(newBands); chrome.storage.local.set({ eqBands: newBands });
  };

  const resetEq = () => {
    const empty = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    setEqBands(empty);
    chrome.storage.local.set({ eqBands: empty });
  };

  const handleSetA = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { action: 'SET_LOOP_A' }, (res) => {
        if (res) setLooperState(prev => ({ ...prev, start: res.start, end: res.end }));
      });
    });
  };

  const handleSetB = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { action: 'SET_LOOP_B' }, (res) => {
        if (res) setLooperState(prev => ({ ...prev, start: res.start, end: res.end }));
      });
    });
  };

  const handleResetLooper = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { action: 'RESET_LOOPER' }, () => {
        setLooperState({ start: null, end: null, speed: 1.0, pitch: true });
      });
    });
  };

  const handleConfigChange = (speed: number, pitch: boolean) => {
    setLooperState(prev => ({ ...prev, speed, pitch }));
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { action: 'SET_LOOPER_CONFIG', speed, pitch });
    });
  };



useEffect(() => {
    chrome.storage.local.get(['lang', 'isFilterOn', 'eqBands'], (data) => {
      if (data.lang) setLang(data.lang);
      if (data.isFilterOn !== undefined) setIsFilterOn(data.isFilterOn);
      if (data.eqBands) setEqBands(data.eqBands);
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

  return (
    <AppContext.Provider value={{
      lang,
      t,
      currentSong,
      setLang,
      toggleLang,
      setCurrentSong,
      isFilterOn,
      setIsFilterOn,
      toggleAudioFilter,
      eqBands,
      setEqBands,
      looperState,
      setLooperState,
      handleEqChange,
      resetEq,
      handleSetA,
      handleSetB,
      handleResetLooper,
      handleConfigChange
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within an AppProvider");
  return context;
};