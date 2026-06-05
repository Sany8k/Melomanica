import React from 'react';
import { useAppContext } from '../utils/AppContext';
import { usePlayerStore, EQ_PRESETS } from '../store/usePlayerStore';
import { Button } from './ui/Button';

export default function EqControls() {
  const { t } = useAppContext();
  const eqBands = usePlayerStore(state => state.eqBands);
  const activePreset = usePlayerStore(state => state.activePreset);
  const handleEqChange = usePlayerStore(state => state.handleEqChange);
  const applyPreset = usePlayerStore(state => state.applyPreset);
  const resetEq = usePlayerStore(state => state.resetEq);

  return (
    <>
      <div className="animated-item" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="flex-between" style={{ marginBottom: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>{t.eqTitle}</h3>
          <Button variant="outline" size="sm" onClick={resetEq}>{t.eqReset}</Button>
        </div>

        <div 
          style={{ 
            display: 'flex', 
            gap: '8px', 
            overflowX: 'auto', 
            paddingBottom: '10px', 
            marginBottom: '10px',
            scrollbarWidth: 'none'
          }} 
          className="preset-container"
        >
          {Object.keys(EQ_PRESETS).map((presetName) => (
            <Button 
              key={presetName}
              variant={activePreset === presetName ? 'primary' : 'success'}
              size="sm"
              style={{ whiteSpace: 'nowrap', borderRadius: '16px' }}
              onClick={() => applyPreset(presetName)}
            >
              {presetName}
            </Button>
          ))}
          
          <Button 
            variant={activePreset === 'Custom' ? 'primary' : 'success'} 
            size="sm" 
            style={{ whiteSpace: 'nowrap', borderRadius: '16px' }}
            onClick={() => applyPreset('Custom')}
          >
            Custom
          </Button>
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