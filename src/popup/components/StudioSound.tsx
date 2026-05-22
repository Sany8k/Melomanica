import React from 'react'
import { useAppContext } from '../utils/AppContext'

export default function StudioSound() {
  const { t, isFilterOn, toggleAudioFilter } = useAppContext();

  return (
    <div className="section-card flex-between">
      <div><h3 className="section-title">{t.studioSound}</h3><p className="section-desc">{t.agcDesc}</p></div>
      <div className={`toggle-bg ${isFilterOn ? 'on' : 'off'}`} onClick={toggleAudioFilter}><div className="toggle-circle" /></div>
    </div>
  )
}
