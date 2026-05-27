import React from 'react'
import { useAppContext } from '../utils/AppContext'
import { usePlayerStore } from '../store/usePlayerStore';

export default function EqControls() {
  const { t } = useAppContext();
  const eqBands = usePlayerStore(state => state.eqBands);
  const handleEqChange = usePlayerStore(state => state.handleEqChange);
  const resetEq = usePlayerStore(state => state.resetEq);

  return (
    <>
      <div className="animated-item" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="flex-between" style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>{t.eqTitle}</h3>
          <button className="btn-hover" onClick={resetEq} style={{ background: 'none', border: '1px solid #48484a', color: '#ff453a', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>{t.eqReset}</button>
        </div>
        <div className="eq-panel">
          {t.bands.map((band, i) => (
            <div key={i} className="eq-column">
              <div className="eq-freq">{band.f}</div>
              <div className="eq-val">{eqBands[i] > 0 ? `+${eqBands[i]}` : eqBands[i]}</div>
              <input type="range" className="eq-slider" min="-12" max="12" step="1" value={eqBands[i]} onChange={(e) => handleEqChange(i, e.target.value)} />
              <div className="eq-desc" title={band.desc}>{band.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
