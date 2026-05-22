import React from 'react'
import { useAppContext } from '../utils/AppContext'

type HeaderProps = {
  view: 'main' | 'advanced';
  setView: (view: 'main' | 'advanced') => void;
}

export default function Header({ view, setView }: HeaderProps) {
  const { lang, t, toggleLang } = useAppContext();

  return (
      <div className="header-wrapper">
        <div className="logo-wrapper">
          <div className="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>
            </svg>
          </div>
          <h2 className="logo-title">Melomanica</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`adv-toggle-btn ${view === 'advanced' ? 'active' : ''}`} onClick={() => setView(view === 'main' ? 'advanced' : 'main')}>
            {view === 'main' ? `⚙ ${t.btnAdv}` : `← ${t.btnMain}`}
          </button>
          <button className="lang-btn" onClick={toggleLang}>{lang.toUpperCase()}</button>
        </div>
      </div>
  )
}
