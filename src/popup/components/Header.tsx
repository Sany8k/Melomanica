import React from 'react';
import { useAppContext } from '../utils/AppContext';
import { Button } from './ui/Button';
import './Header.css';

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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Ссылки на GitHub и Донат */}
          <a href="https://github.com/Sany8k/Melomanica" target="_blank" rel="noreferrer" title="GitHub">
            <Button variant="icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </Button>
          </a>
          <a href="https://www.patreon.com/posts/support-160332557?utm_medium=clipboard_copy&utm_source=copyLink&utm_campaign=postshare_creator&utm_content=join_link" target="_blank" rel="noreferrer" title="Support Project">
            <Button variant="icon" className="success-text">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </Button>
          </a>

          <Button variant="outline" size="sm" style={{ padding: '4px 10px', borderRadius: '20px' }} onClick={() => setView(view === 'main' ? 'advanced' : 'main')}>
            {view === 'main' ? `⚙ ${t.btnAdv}` : `← ${t.btnMain}`}
          </Button>
          <button className="lang-btn" onClick={toggleLang}>{lang.toUpperCase()}</button>
        </div>
      </div>
  )
}