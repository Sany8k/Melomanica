import { useEffect, useRef, useState } from 'react'
import { useAppContext } from '../utils/AppContext'
import {
  MetronomeCommand,
  MetronomeSettings,
  MetronomeStatus,
  normalizeSettings,
} from '../../metronome/settings'
import { readDraft, savePreset, storageKey, MetronomeDraft } from '../../metronome/presets'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import './Metronome.css'

const notes = Array.from({ length: 25 }, (_, index) => {
  const midi = index + 60
  return {
    midi,
    label: `${['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][midi % 12]}${Math.floor(midi / 12) - 1}`,
  }
})

export default function Metronome() {
  const { t } = useAppContext()
  const [draft, setDraft] = useState(() => readDraft(localStorage))
  const [bpmText, setBpmText] = useState(String(draft.settings.bpm))
  const [running, setRunning] = useState(false)
  const [beat, setBeat] = useState(-1)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<'audio' | 'storage' | null>(null)
  const mounted = useRef(true)
  const selected = draft.presets.find((p) => p.id === draft.selected)
  const dirty =
    selected &&
    (JSON.stringify(selected.settings) !== JSON.stringify(draft.settings) ||
      selected.name !== draft.name.trim())

  useEffect(() => setBpmText(String(draft.settings.bpm)), [draft.settings.bpm])

  const persist = (next: MetronomeDraft) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setDraft(next)
      setError(null)
    } catch {
      setError('storage')
    }
  }
  const command = async (action: MetronomeCommand, settings?: MetronomeSettings) => {
    try {
      const result: MetronomeStatus & { error?: string } = await chrome.runtime.sendMessage({
        target: 'metronome',
        command: action,
        settings,
      })
      if (!result || result.error) throw new Error('audio')
      if (mounted.current) {
        setRunning(result.running)
        setBeat(result.beat)
      }
      return result
    } catch {
      if (mounted.current) setError('audio')
      return null
    }
  }
  useEffect(() => {
    mounted.current = true
    let polling = false
    void command('get').then((result) => {
      if (!mounted.current) return
      if (result?.running) {
        const next = { ...readDraft(localStorage), settings: result.settings }
        persist(next)
      }
      setReady(true)
    })
    const timer = window.setInterval(async () => {
      if (polling) return
      polling = true
      await command('get')
      polling = false
    }, 100)
    // Audio lives in the offscreen document and is intentionally left running.
    return () => {
      mounted.current = false
      window.clearInterval(timer)
    }
  }, [])

  const update = (changes: Partial<MetronomeSettings>) => {
    const settings = normalizeSettings({ ...draft.settings, ...changes })
    persist({ ...draft, settings })
    void command('update', settings)
  }
  const toggle = async () => {
    setBusy(true)
    setError(null)
    await command(running ? 'stop' : 'start', draft.settings)
    if (mounted.current) setBusy(false)
  }

  return (
    <div className="metronome-layout">
      <section className="metronome-panel" aria-label={t.menuMetronome}>
        <h3 className="section-title">{t.menuMetronome}</h3>
        <p className="section-desc">{t.metronomeBackground}</p>
        <div className="metronome-tempo">
          <strong>{draft.settings.bpm}</strong>
          <span>BPM</span>
        </div>
        <div className="metronome-beats" aria-label={t.metronomeBeats}>
          {Array.from({ length: draft.settings.beats }, (_, i) => (
            <span
              key={i}
              className={`${i === 0 ? 'accent' : ''} ${running && beat === i ? 'lit' : ''}`}
            >
              {i + 1}
            </span>
          ))}
        </div>
        <fieldset disabled={!ready || busy} className="metronome-fields">
          <label className="metronome-tempo-input">
            BPM
            <Input
              type="number"
              min={30}
              max={300}
              value={bpmText}
              onChange={(e) => {
                setBpmText(e.target.value)
                const bpm = Number(e.target.value)
                if (bpm >= 30 && bpm <= 300) update({ bpm })
              }}
              onBlur={() => {
                const bpm = bpmText
                  ? normalizeSettings({ bpm: Number(bpmText) }).bpm
                  : draft.settings.bpm
                setBpmText(String(bpm))
                if (bpm !== draft.settings.bpm) update({ bpm })
              }}
            />
          </label>
          <input
            aria-label="BPM"
            type="range"
            min={30}
            max={300}
            value={draft.settings.bpm}
            onChange={(e) => update({ bpm: Number(e.target.value) })}
          />
          <div className="metronome-field-row">
            <label>
              {t.metronomeBeats}
              <select
                value={draft.settings.beats}
                onChange={(e) => update({ beats: Number(e.target.value) })}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1}>{i + 1}</option>
                ))}
              </select>
            </label>
            <label>
              {t.metronomeNotes}
              <select
                value={draft.settings.subdivision}
                onChange={(e) => update({ subdivision: Number(e.target.value) })}
              >
                <option value={1}>♩ · 1/4</option>
                <option value={2}>♫ · 1/8</option>
                <option value={4}>♬ · 1/16</option>
              </select>
            </label>
          </div>
          <div className="metronome-field-row">
            <label>
              {t.metronomeTone}
              <select
                value={draft.settings.note}
                onChange={(e) => update({ note: Number(e.target.value) })}
              >
                {notes.map((n) => (
                  <option key={n.midi} value={n.midi}>
                    {n.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.metronomeAccent}
              <select
                value={draft.settings.accentNote}
                onChange={(e) => update({ accentNote: Number(e.target.value) })}
              >
                {notes.map((n) => (
                  <option key={n.midi} value={n.midi}>
                    {n.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="metronome-volume">
            {t.metronomeVolume}
            <span>{draft.settings.volume}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={draft.settings.volume}
              onChange={(e) => update({ volume: Number(e.target.value) })}
            />
          </label>
          <Button fullWidth onClick={toggle}>
            {running ? t.metronomeStop : t.metronomeStart}
          </Button>
        </fieldset>
        {error && (
          <p className="metronome-error" role="alert">
            {error === 'audio' ? t.metronomeAudioError : t.metronomeStorageError}
          </p>
        )}
      </section>
      <aside className="metronome-presets" aria-label={t.metronomePresets}>
        <div className="flex-between">
          <h3 className="section-title">{t.metronomePresets}</h3>
          <Button
            variant="icon"
            aria-label={t.metronomeNew}
            title={t.metronomeNew}
            disabled={!ready}
            onClick={() => persist({ ...draft, selected: null, name: '' })}
          >
            +
          </Button>
        </div>
        <label className="metronome-name">
          {t.momentLabel}
          <Input
            maxLength={60}
            placeholder={`Preset ${draft.nextNumber}`}
            value={draft.name}
            onChange={(e) => persist({ ...draft, name: e.target.value })}
          />
        </label>
        <Button
          fullWidth
          disabled={!ready || (!!selected && !dirty)}
          onClick={() => persist(savePreset(draft, crypto.randomUUID()))}
        >
          {t.metronomeSave}
        </Button>
        <p className="section-desc metronome-save-hint">
          {dirty ? t.metronomeUnsaved : t.metronomeSaveHint}
        </p>
        <div className="metronome-preset-list">
          {!draft.presets.length && <p className="section-desc">{t.metronomeEmpty}</p>}
          {draft.presets.map((preset) => (
            <div
              className={`metronome-preset ${draft.selected === preset.id ? 'selected' : ''}`}
              key={preset.id}
            >
              <button
                className="metronome-preset-select"
                disabled={!ready || busy}
                aria-pressed={draft.selected === preset.id}
                onClick={() => {
                  persist({
                    ...draft,
                    selected: preset.id,
                    name: preset.name,
                    settings: { ...preset.settings },
                  })
                  void command('update', preset.settings)
                }}
              >
                <strong>{preset.name}</strong>
                <span>
                  {preset.settings.bpm} BPM · {preset.settings.beats} × 1/
                  {4 * preset.settings.subdivision}
                </span>
              </button>
              <Button
                variant="icon"
                className="metronome-delete"
                aria-label={`${t.metronomeDelete}: ${preset.name}`}
                onClick={() =>
                  persist({
                    ...draft,
                    presets: draft.presets.filter((p) => p.id !== preset.id),
                    selected: draft.selected === preset.id ? null : draft.selected,
                    name: draft.selected === preset.id ? '' : draft.name,
                  })
                }
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
