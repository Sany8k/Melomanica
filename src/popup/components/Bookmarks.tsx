import React, { useEffect, useState } from 'react'
import { useAppContext } from '../utils/AppContext';
import { parseTimeToSeconds } from '../utils/time';

export default function Bookmarks() {
  const { t, currentSong } = useAppContext();
  const [error, setError] = useState('');
  const [manualTime, setManualTime] = useState(''); const [manualLabel, setManualLabel] = useState('');
  const [favorites, setFavorites] = useState<Record<string, { title: string, moments: { time: number, label: string }[] }>>({});
  const [editingMoment, setEditingMoment] = useState<{ id: string, index: number } | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const saveMomentToStorage = (time: number, customLabel: string) => {
    if (!currentSong) return; const newFavs = { ...favorites };
    const videoId = currentSong.id;
    if (!newFavs[videoId]) newFavs[videoId] = { title: currentSong.title, moments: [] };
    newFavs[videoId].moments.push({ time, label: customLabel.trim() || `Момент ${newFavs[videoId].moments.length + 1}` });
    newFavs[videoId].moments.sort((a, b) => a.time - b.time); setFavorites(newFavs);
    chrome.storage.local.set({ favorites: newFavs });
  };

  const handleSaveCurrentMoment = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_CURRENT_TIME' }, (r) => {
        if (r && r.currentTime !== undefined) saveMomentToStorage(Math.floor(r.currentTime), '');
      });
    });
  };

  const handleSaveManualMoment = () => {
    if (!currentSong || !manualTime || !manualLabel.trim()) return setError(t.errFill);
    const time = parseTimeToSeconds(manualTime);
    if (time === null) return setError(t.errNum);
    saveMomentToStorage(time, manualLabel);
    setManualTime(''); setManualLabel(''); setError('');
  };

  const playMoment = (targetVideoId: string, time: number) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]; if (!tab?.id) return;
      const onYouTubeMusic = (tab.url || '').includes('music.youtube.com');
      if (onYouTubeMusic && currentSong?.id === targetVideoId) {
        chrome.tabs.sendMessage(tab.id, { action: 'PLAY_MOMENT_LOCAL', time });
      } else if (onYouTubeMusic) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id }, world: 'MAIN', func: (vid, t) => {
            const ytApp = document.querySelector('ytmusic-app') as any; if (ytApp && typeof ytApp.navigate_ === 'function') ytApp.navigate_(`/watch?v=${vid}&t=${t}`);
            else window.location.href = `/watch?v=${vid}&t=${t}`;
          }, args: [targetVideoId, time]
        });
      }
      else {
        chrome.tabs.update(tab.id, { url: `https://music.youtube.com/watch?v=${targetVideoId}&t=${time}` });
      }
    });
  };

  const handleStartEdit = (e: any, id: string, i: number, label: string) => {
    e.stopPropagation(); setEditingMoment({ id, index: i });
    setEditLabel(label);
  };

  const handleCancelEdit = () => setEditingMoment(null);

  const handleSaveEdit = () => {
    if (!editingMoment) return;
    const { id, index } = editingMoment;
    if (editLabel.trim() !== '') {
      const newFavs = { ...favorites };
      newFavs[id].moments[index].label = editLabel.trim();
      setFavorites(newFavs);
      chrome.storage.local.set({ favorites: newFavs });
    }
    setEditingMoment(null);
  };

  const handleDeleteMoment = (id: string, indexToRemove: number) => {
    const newFavs = { ...favorites };
    newFavs[id].moments = newFavs[id].moments.filter((_, i) => i !== indexToRemove);
    if (newFavs[id].moments.length === 0) delete newFavs[id];
    setFavorites(newFavs);
    chrome.storage.local.set({ favorites: newFavs });
  };

    useEffect(() => {
      chrome.storage.local.get(['favorites'], (data) => {
        if (data.favorites) setFavorites(data.favorites);
      });
    }, []);

  return (
    <>
      <div className="flex-between" style={{ marginBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>{t.bookmarks}</h3>
        <button className={`btn-hover btn-success ${!currentSong ? 'btn-disabled' : ''}`} onClick={handleSaveCurrentMoment} disabled={!currentSong} style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '15px' }}>⚡ {t.saveMoment}</button>
      </div>
      {error && <div style={{ color: '#ff453a', fontSize: '12px', marginTop: '-10px', marginBottom: '10px' }}>{error}</div>}
      <div className="input-group">
        <input type="text" placeholder={t.manualTime} value={manualTime} onChange={e => setManualTime(e.target.value)} className="input-default" style={{ width: '30%' }} disabled={!currentSong} />
        <input type="text" placeholder={t.momentLabel} value={manualLabel} onChange={e => setManualLabel(e.target.value)} className="input-default" style={{ width: '55%' }} disabled={!currentSong} />
        <button className={`btn-hover btn-success ${!currentSong ? 'btn-disabled' : ''}`} onClick={handleSaveManualMoment} disabled={!currentSong} style={{ width: '15%', fontSize: '18px' }}>+</button>
      </div>
      <div className="list-container">
        {Object.keys(favorites).length === 0 ? (<div className="list-empty">{t.noBookmarks}</div>) : (Object.entries(favorites).map(([id, favData]) => (favData.moments.map((moment, index) => { const isEditing = editingMoment?.id === id && editingMoment?.index === index; return (<div key={`fav-${id}-${index}`} className={`list-item animated-item ${!isEditing ? 'list-item-clickable' : ''}`} onClick={() => !isEditing && playMoment(id, moment.time)}> <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}> <div className="badge">{Math.floor(moment.time / 60)}:{(moment.time % 60).toString().padStart(2, '0')}</div> <div className="item-content"> {isEditing ? (<input autoFocus type="text" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }} onBlur={handleCancelEdit} className="input-default" style={{ padding: '4px 6px', fontSize: '12px', margin: 0, height: '26px' }} />) : (<> <div style={{ fontSize: '13px', fontWeight: 500, color: '#f5f5f7', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{moment.label}</div> <div style={{ fontSize: '10px', color: '#8e8e93', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{favData.title}</div> </>)} </div> </div> <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}> {isEditing ? (<button className="icon-btn success-text" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }}>✓</button>) : (<button className="icon-btn edit-text" onClick={(e) => handleStartEdit(e, id, index, moment.label)}>✎</button>)} <button className="delete-btn" onMouseDown={(e) => { if (isEditing) e.preventDefault(); }} onClick={(e) => { e.stopPropagation(); if (isEditing) { handleCancelEdit(); } else { handleDeleteMoment(id, index); } }}>✕</button> </div> </div>); }))))}
      </div>
    </>
  )
}
