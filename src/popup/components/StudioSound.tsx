import React from 'react';
import { useAppContext } from '../utils/AppContext';
import { usePlayerStore } from '../store/usePlayerStore';
import { Card } from './ui/Card';
import './StudioSound.css';

export default function StudioSound() {
  const isFilterOn = usePlayerStore(state => state.isFilterOn);
  const toggleAudioFilter = usePlayerStore(state => state.toggleAudioFilter);
  const { t } = useAppContext();

  return (
    <Card className="flex-between">
      <div><h3 className="section-title">{t.studioSound}</h3><p className="section-desc">{t.agcDesc}</p></div>
      <div className={`toggle-bg ${isFilterOn ? 'on' : 'off'}`} onClick={toggleAudioFilter}><div className="toggle-circle" /></div>
    </Card>
  )
}