import React from 'react'
import { useAppContext } from '../utils/AppContext';
import { formatTime } from '../utils/formatTime';

export default function LooperControls() {
  const { t, looperState, setLooperState, handleSetA, handleSetB, handleResetLooper, handleConfigChange, currentSong } = useAppContext();

  return (
    <>
      <div className="animated-item" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="flex-between" style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>A-B Looper</h3>
          <button className="btn-hover" onClick={handleResetLooper} style={{ background: 'none', border: '1px solid #48484a', color: '#ff453a', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>{t.loopReset}</button>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button className={`btn-hover btn-primary ${!currentSong ? 'btn-disabled' : ''}`} onClick={handleSetA} disabled={!currentSong} style={{ flex: 1, padding: '15px 0' }}>
            <div style={{ fontSize: '12px', fontWeight: 'normal', marginBottom: '5px' }}>{t.loopStartBtn}</div>
            <div style={{ fontSize: '18px' }}>{formatTime(looperState.start)}</div>
          </button>
          <button className={`btn-hover btn-success ${!currentSong ? 'btn-disabled' : ''}`} onClick={handleSetB} disabled={!currentSong} style={{ flex: 1, padding: '15px 0' }}>
            <div style={{ fontSize: '12px', fontWeight: 'normal', marginBottom: '5px' }}>{t.loopEndBtn}</div>
            <div style={{ fontSize: '18px' }}>{formatTime(looperState.end)}</div>
          </button>
        </div>

        <hr className="divider" style={{ margin: '10px 0 20px 0' }} />

        <div style={{ marginBottom: '20px' }}>
          <div className="flex-between" style={{ marginBottom: '10px' }}>
            <h4 style={{ margin: 0, fontSize: '14px' }}>{t.speed}</h4>
            <div style={{ fontSize: '14px', color: '#0a84ff', fontWeight: 'bold' }}>{looperState.speed.toFixed(2)}x</div>
          </div>

          <input
            type="range" className="speed-slider" min="0.25" max="3" step="0.05"
            value={looperState.speed}
            onChange={(e) => handleConfigChange(Number(e.target.value), looperState.pitch)}
            disabled={!currentSong}
            style={{ width: '100%', cursor: currentSong ? 'pointer' : 'not-allowed' }}
          />

          <div style={{ position: 'relative', height: '15px', fontSize: '10px', color: '#8e8e93', marginTop: '8px' }}>
            <span style={{ position: 'absolute', left: '0' }}>0.25x</span>
            <span style={{ position: 'absolute', left: '27.27%', transform: 'translateX(-50%)' }}>1.0x</span>
            <span style={{ position: 'absolute', right: '0' }}>3.0x</span>
          </div>
        </div>

        <div className="section-card flex-between" style={{ padding: '10px 15px', marginBottom: 0 }}>
          <div>
            <h3 className="section-title">{t.pitchToggle}</h3>
            <p className="section-desc">{t.pitchDesc}</p>
          </div>
          <div className={`toggle-bg ${looperState.pitch ? 'on' : 'off'}`} onClick={() => handleConfigChange(looperState.speed, !looperState.pitch)}>
            <div className="toggle-circle" />
          </div>
        </div>

      </div>
    </>
  )
}
