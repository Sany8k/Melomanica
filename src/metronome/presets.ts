import { defaults, MetronomeSettings, normalizeSettings } from './settings'

export interface MetronomePreset {
  id: string
  name: string
  settings: MetronomeSettings
}
export interface MetronomeDraft {
  settings: MetronomeSettings
  name: string
  selected: string | null
  presets: MetronomePreset[]
  nextNumber: number
}
export const storageKey = 'melomanica.metronome.v1'
export function readDraft(storage: Pick<Storage, 'getItem'>): MetronomeDraft {
  const empty = { settings: { ...defaults }, name: '', selected: null, presets: [], nextNumber: 1 }
  try {
    const data = JSON.parse(storage.getItem(storageKey) || 'null')
    if (!data || !Array.isArray(data.presets)) return empty
    const presets: MetronomePreset[] = data.presets
      .filter(
        (p: MetronomePreset) =>
          p && typeof p.id === 'string' && typeof p.name === 'string' && p.settings,
      )
      .map((p: MetronomePreset) => ({
        id: p.id,
        name: p.name,
        settings: normalizeSettings(p.settings),
      }))
    return {
      settings: normalizeSettings(data.settings || {}),
      name: typeof data.name === 'string' ? data.name : '',
      selected: presets.some((p) => p.id === data.selected) ? data.selected : null,
      presets,
      nextNumber:
        Number.isSafeInteger(data.nextNumber) && data.nextNumber > 0 ? data.nextNumber : 1,
    }
  } catch {
    return empty
  }
}
export function savePreset(draft: MetronomeDraft, id: string): MetronomeDraft {
  const existing = draft.presets.find((p) => p.id === draft.selected)
  let number = draft.nextNumber
  while (draft.presets.some((p) => p.name === `Preset ${number}`)) number++
  const name = draft.name.trim() || `Preset ${number}`
  const preset = { id: existing?.id || id, name, settings: { ...draft.settings } }
  return {
    ...draft,
    name,
    selected: preset.id,
    nextNumber: draft.name.trim() ? draft.nextNumber : number + 1,
    presets: existing
      ? draft.presets.map((p) => (p.id === existing.id ? preset : p))
      : [...draft.presets, preset],
  }
}
