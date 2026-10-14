import { useEffect, useRef, useState } from 'react'
import { DEFAULT_VOLUME, MAX_VOLUME, normalizeVolume } from '../../types/VolumeRules'
import { useVolumeStore } from '../store/useVolumeStore'
import { useAppContext } from '../utils/AppContext'
import CurrentTrack from './CurrentTrack'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { SliderReset } from './ui/SliderReset'
import './StudioSound.css'
import './AutoSkip.css'
import './VolumeControls.css'

function VolumeSlider({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  const [inputValue, setInputValue] = useState(String(value))

  useEffect(() => {
    setInputValue(String(value))
  }, [id, value])

  const changeInput = (rawValue: string) => {
    // Keep an empty draft so the user can clear the field before typing a new level.
    if (rawValue === '') {
      setInputValue('')
      return
    }
    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed)) return
    const nextValue = Math.round(normalizeVolume(parsed))
    setInputValue(String(nextValue))
    onChange(nextValue)
  }

  return (
    <div className="volume-slider-control">
      <div className="flex-between volume-slider-header">
        <label htmlFor={id}>{label}</label>
        <div className="volume-slider-actions">
          <div className="volume-number-control">
            <input
              id={`${id}-number`}
              className="volume-number-input"
              type="number"
              min={0}
              max={MAX_VOLUME}
              step={1}
              value={inputValue}
              disabled={disabled}
              aria-label={`${label} (%)`}
              onChange={(event) => changeInput(event.target.value)}
              onBlur={() => setInputValue(String(value))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur()
              }}
            />
            <span className="volume-value" aria-hidden="true">
              %
            </span>
          </div>
          <SliderReset
            label={label}
            disabled={disabled}
            onReset={() => {
              setInputValue(String(DEFAULT_VOLUME))
              onChange(DEFAULT_VOLUME)
            }}
          />
        </div>
      </div>
      <input
        id={id}
        className="volume-slider"
        type="range"
        min={0}
        max={MAX_VOLUME}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const nextValue = Number(event.target.value)
          setInputValue(String(nextValue))
          onChange(nextValue)
        }}
      />
      <div className="volume-scale" aria-hidden="true">
        <span>0%</span>
        <span>100%</span>
        <span>{MAX_VOLUME}%</span>
      </div>
    </div>
  )
}

export function GlobalVolume() {
  const { t } = useAppContext()
  const volume = useVolumeStore((state) => state.globalVolume)
  const ready = useVolumeStore((state) => state.ready)
  const setVolume = useVolumeStore((state) => state.setGlobalVolume)
  return (
    <Card className="volume-card">
      <VolumeSlider
        id="global-volume"
        label={t.globalVolume}
        value={volume}
        disabled={!ready}
        onChange={setVolume}
      />
    </Card>
  )
}

export default function TrackVolume() {
  const { t, currentSong } = useAppContext()
  const { volumeRules, ready, saveRule, updateRuleVolume, toggleRule, deleteRule } =
    useVolumeStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const savedVolume = currentSong ? volumeRules[currentSong.id]?.volume : undefined
  const [volume, setVolume] = useState(savedVolume ?? DEFAULT_VOLUME)
  const previewPort = useRef<chrome.runtime.Port | null>(null)

  useEffect(() => {
    setVolume(savedVolume ?? DEFAULT_VOLUME)
  }, [currentSong?.id, savedVolume])

  useEffect(() => {
    let disposed = false
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (disposed || !tabs[0]?.id || !currentSong) return
      const port = chrome.tabs.connect(tabs[0].id, { name: 'volume-preview' })
      previewPort.current = port
      port.onDisconnect.addListener(() => {
        void chrome.runtime.lastError
        if (previewPort.current === port) previewPort.current = null
      })
    })
    return () => {
      disposed = true
      previewPort.current?.disconnect()
      previewPort.current = null
    }
  }, [currentSong?.id])

  const changeVolume = (value: number) => {
    setVolume(value)
    previewPort.current?.postMessage({ videoId: currentSong?.id, volume: value })
  }

  return (
    <section>
      <h3 className="volume-section-title">{t.trackVolume}</h3>
      <CurrentTrack />
      <div className="volume-editor">
        <VolumeSlider
          id="track-volume"
          label={t.trackVolume}
          value={volume}
          disabled={!ready || !currentSong}
          onChange={changeVolume}
        />
        <Button
          variant="success"
          className="volume-save"
          disabled={!ready || !currentSong}
          title={t.saveVolume}
          aria-label={t.saveVolume}
          onClick={() => {
            if (currentSong) saveRule(currentSong.id, currentSong.title, volume)
          }}
        >
          +
        </Button>
      </div>
      <p className="section-desc volume-description">{t.trackVolumeDesc}</p>
      <div className="list-container">
        {Object.keys(volumeRules).length === 0 ? (
          <div className="list-empty">{t.noVolumeRules}</div>
        ) : (
          Object.entries(volumeRules).map(([id, rule]) => (
            <div
              key={id}
              className={`list-item animated-item auto-skip-item volume-rule ${rule.isActive ? '' : 'auto-skip-item-inactive'}`}
            >
              <div className="volume-rule-summary">
                <div className="auto-skip-details">
                  <div className="auto-skip-track-title" title={rule.title}>
                    {rule.title}
                  </div>
                  <div className="volume-rule-value">{rule.volume}%</div>
                </div>
                <div className="auto-skip-actions">
                  <Button
                    variant="icon"
                    className={editingId === id ? 'volume-edit-active' : ''}
                    aria-label={`${t.editVolume}: ${rule.title}`}
                    title={t.editVolume}
                    aria-expanded={editingId === id}
                    aria-controls={`saved-volume-editor-${id}`}
                    onClick={() => setEditingId(editingId === id ? null : id)}
                  >
                    ✎
                  </Button>
                  <Button
                    variant="icon"
                    className={`toggle-bg auto-skip-toggle ${rule.isActive ? 'on' : 'off'}`}
                    role="switch"
                    aria-checked={rule.isActive}
                    aria-label={`${t.trackVolume}: ${rule.title}`}
                    title={rule.isActive ? t.disableVolume : t.enableVolume}
                    onClick={() => toggleRule(id)}
                  >
                    <span className="toggle-circle" />
                  </Button>
                  <Button
                    variant="danger"
                    aria-label={`${t.deleteVolume}: ${rule.title}`}
                    title={t.deleteVolume}
                    onClick={() => deleteRule(id)}
                  >
                    ✕
                  </Button>
                </div>
              </div>
              {editingId === id && (
                <div id={`saved-volume-editor-${id}`} className="volume-rule-editor">
                  <VolumeSlider
                    id={`saved-volume-${id}`}
                    label={t.trackVolume}
                    value={rule.volume}
                    disabled={!ready}
                    onChange={(value) => updateRuleVolume(id, value)}
                  />
                  <p className="section-desc volume-rule-hint">{t.volumeAutoSaved}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  )
}
