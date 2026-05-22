import React from 'react'
import { useAppContext } from '../utils/AppContext'

export default function CurrentTrack(): JSX.Element {
  const { t, currentSong } = useAppContext();

  return (
    <div className={`track-info-card ${currentSong ? 'active' : 'inactive'}`}>
      <div className="track-label">{t.currentTrack}</div>
      <div className="track-title">{currentSong ? currentSong.title : t.nothingPlaying}</div>
    </div>
  )
}
