import React, { useState } from 'react';
import { useAppContext } from '../utils/AppContext';
import { parseTimeToSeconds } from '../utils/time';
import { formatTime } from '../utils/formatTime';
import { usePlayerStore } from '../store/usePlayerStore';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import './LooperControls.css';

export default function LooperControls(): JSX.Element {
  const { t, currentSong } = useAppContext();

  const looperState = usePlayerStore(state => state.looperState);
  const handleSetA = usePlayerStore(state => state.handleSetA);
  const handleSetB = usePlayerStore(state => state.handleSetB);
  const handleResetLooper = usePlayerStore(state => state.handleResetLooper);
  const handleConfigChange = usePlayerStore(state => state.handleConfigChange);

  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const applyManualA = () => {
    const s = parseTimeToSeconds(start);
    if (s !== null && s >= 0) {
      handleSetA(s);
      setStart('');
    }
  };

  const applyManualB = () => {
    const e = parseTimeToSeconds(end);
    if (e !== null && e >= 0) {
      handleSetB(e);
      setEnd('');
    }
  };

  const handleKeyDownA = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') applyManualA();
  };

  const handleKeyDownB = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') applyManualB();
  };

  return (
    <>
      <div className="animated-item looper-container">
        <div className="flex-between looper-header">
          <h3 className="looper-title">A-B Looper</h3>
          <Button variant="outline" size="sm" onClick={handleResetLooper}>{t.loopReset}</Button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <Button variant="primary" size="lg" fullWidth disabled={!currentSong} onClick={() => handleSetA()}>
            <div className="looper-btn-label">{t.loopStartBtn}</div>
            <div className="looper-btn-time">{formatTime(looperState.start, t.notSet)}</div>
          </Button>
          <Button variant="success" size="lg" fullWidth disabled={!currentSong} onClick={() => handleSetB()}>
            <div className="looper-btn-label">{t.loopEndBtn}</div>
            <div className="looper-btn-time">{formatTime(looperState.end, t.notSet)}</div>
          </Button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', flex: 1, gap: '4px' }}>
            <Input 
              placeholder="0:00 (A)" 
              value={start} 
              onChange={e => setStart(e.target.value)} 
              onKeyDown={handleKeyDownA}
              disabled={!currentSong} 
            />
            <Button variant="primary" onClick={applyManualA} disabled={!currentSong || !start}>✓</Button>
          </div>
          <div style={{ display: 'flex', flex: 1, gap: '4px' }}>
            <Input 
              placeholder="0:00 (B)" 
              value={end} 
              onChange={e => setEnd(e.target.value)} 
              onKeyDown={handleKeyDownB}
              disabled={!currentSong} 
            />
            <Button variant="success" onClick={applyManualB} disabled={!currentSong || !end}>✓</Button>
          </div>
        </div>

        <hr className="divider looper-divider" />

        <div className="speed-section">
          <div className="flex-between speed-header">
            <h4 className="speed-title">{t.speed}</h4>
            <div className="speed-value">{looperState.speed.toFixed(2)}x</div>
          </div>

          <input
            type="range" 
            className="speed-slider" 
            min="0.25" max="3" step="0.05"
            value={looperState.speed}
            onChange={(e) => handleConfigChange(Number(e.target.value), looperState.pitch)}
            disabled={!currentSong}
            style={{ cursor: currentSong ? 'pointer' : 'not-allowed' }}
          />

          <div className="speed-labels">
            <span className="speed-label-left">0.25x</span>
            <span className="speed-label-center">1.0x</span>
            <span className="speed-label-right">3.0x</span>
          </div>
        </div>

        <Card className="flex-between pitch-card">
          <div>
            <h3 className="section-title">{t.pitchToggle}</h3>
            <p className="section-desc">{t.pitchDesc}</p>
          </div>
          <div className={`toggle-bg ${looperState.pitch ? 'on' : 'off'}`} onClick={() => handleConfigChange(looperState.speed, !looperState.pitch)}>
            <div className="toggle-circle" />
          </div>
        </Card>

      </div>
    </>
  );
}