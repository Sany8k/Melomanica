import React, { useEffect, useState } from 'react';
import CurrentTrack from './CurrentTrack';
import { useAppContext } from '../utils/AppContext';
import { parseTimeToSeconds } from '../utils/time';
import { formatTime } from '../utils/formatTime';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import './AutoSkip.css'

export default function AutoSkip(): JSX.Element {
  const { t, currentSong } = useAppContext();
  const [error, setError] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [rules, setRules] = useState<Record<string, { title: string, intervals: { start: number; end: number }[] }>>({});

  const handleAddRule = () => {
    if (!currentSong) return setError(t.errEnable);

    const s = parseTimeToSeconds(start);
    const e = parseTimeToSeconds(end);

    if (s === null || e === null) return setError(t.errNum);
    if (s < 0 || e < 0) return setError(t.errNeg);
    if (s >= e) return setError(t.errLogic);

    const newRules = { ...rules };
    const videoId = currentSong.id;
    if (!newRules[videoId]) newRules[videoId] = { title: currentSong.title, intervals: [] };
    newRules[videoId].intervals.push({ start: s, end: e });
    newRules[videoId].intervals.sort((a, b) => a.start - b.start);
    setRules(newRules);
    chrome.storage.local.set({ skipRules: newRules });
    setStart('');
    setEnd('');
    setError('');
  };

  const handleDeleteRule = (id: string, indexToRemove: number) => {
    const newRules = { ...rules };
    newRules[id].intervals = newRules[id].intervals.filter((_, i) => i !== indexToRemove);
    if (newRules[id].intervals.length === 0) delete newRules[id];
    setRules(newRules);
    chrome.storage.local.set({ skipRules: newRules });
  };

  const fetchCurrentTimeForInput = (type: 'start' | 'end') => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_CURRENT_TIME' }, (r) => {
          if (r && r.currentTime !== undefined) {
            const formatted = formatTime(r.currentTime, t.notSet);
            if (type === 'start') setStart(formatted);
            else setEnd(formatted);
          }
        });
      }
    });
  };

  useEffect((): void => {
    chrome.storage.local.get(['skipRules'], (data) => {
      if (data.skipRules) setRules(data.skipRules);
    });
  }, []);

  return (
    <>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>{t.autoSkip}</h3>
      <CurrentTrack />
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <Button variant="primary" size="sm" fullWidth disabled={!currentSong} onClick={() => fetchCurrentTimeForInput('start')}>
            ⏱ {t.loopStartBtn}
          </Button>
          <Button variant="primary" size="sm" fullWidth disabled={!currentSong} onClick={() => fetchCurrentTimeForInput('end')}>
            ⏱ {t.loopEndBtn}
          </Button>
        </div>

        <div className="input-group">
          <Input placeholder={t.startSec} value={start} onChange={e => setStart(e.target.value)} disabled={!currentSong} />
          <Input placeholder={t.endSec} value={end} onChange={e => setEnd(e.target.value)} disabled={!currentSong} />
          <Button variant="success" onClick={handleAddRule} disabled={!currentSong} style={{ padding: '0 15px', fontSize: '18px' }}>+</Button>
        </div>
        {error && <div style={{ color: '#ff453a', fontSize: '12px' }}>{error}</div>}
      </div>

      <div className="list-container">
        {Object.keys(rules).length === 0 ? (<div className="list-empty">Правил пока нет</div>) : (Object.entries(rules).map(([id, ruleData]) => (ruleData.intervals.map((rule, index) => (
          <div key={`rule-${id}-${index}`} className="list-item animated-item">
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', width: '180px' }}>{ruleData.title}</div>
              <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '2px' }}>{formatTime(rule.start, t.notSet)} — {formatTime(rule.end, t.notSet)}</div>
            </div>
            <Button variant="danger" onClick={() => handleDeleteRule(id, index)}>✕</Button>
          </div>
        )))))}
      </div>
    </>
  )
}