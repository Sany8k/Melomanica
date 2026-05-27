import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { i18n } from "./i18n";
import { CurrentSongType } from "../types/CurrentSongType";

type Lang = 'ru' | 'en';

interface AppContextType {
  lang: Lang;
  t: typeof i18n['ru'];
  currentSong: CurrentSongType | null;
  toggleLang: () => void;
  setLang: (lang: Lang) => void;
  setCurrentSong: (song: CurrentSongType | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>('ru');
  const [currentSong, setCurrentSong] = useState<CurrentSongType | null>(null);

  const t = i18n[lang];

  const toggleLang = () => {
    const newLang = lang === 'ru' ? 'en' : 'ru';
    setLang(newLang);
    chrome.storage.local.set({ lang: newLang });
  };

  useEffect(() => {
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
      toggleLang,  
      setLang,         
      setCurrentSong  
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