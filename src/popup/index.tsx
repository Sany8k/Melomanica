import React from 'react'
import ReactDOM from 'react-dom/client'
import { Popup } from './Popup'
import './index.css'
import './components/components.css';
import './Popup.css';
import { AppProvider } from './utils/AppContext'

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <AppProvider>
      <Popup />
    </AppProvider>

  </React.StrictMode>,
)
