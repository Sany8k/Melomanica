import { create } from 'zustand'
import { DEFAULT_VOLUME, normalizeVolume, type VolumeRules } from '../../types/VolumeRules'

interface VolumeState {
  globalVolume: number
  volumeRules: VolumeRules
  ready: boolean
  setGlobalVolume: (volume: number) => void
  saveRule: (id: string, title: string, volume: number) => void
  updateRuleVolume: (id: string, volume: number) => void
  toggleRule: (id: string) => void
  deleteRule: (id: string) => void
}

function readLocalSettings(): Pick<VolumeState, 'globalVolume' | 'volumeRules'> {
  try {
    return {
      globalVolume: normalizeVolume(JSON.parse(localStorage.getItem('globalVolume') ?? '100')),
      volumeRules: JSON.parse(localStorage.getItem('volumeRules') ?? '{}') || {},
    }
  } catch {
    return { globalVolume: DEFAULT_VOLUME, volumeRules: {} }
  }
}

function cacheSettings(settings: Partial<Pick<VolumeState, 'globalVolume' | 'volumeRules'>>) {
  try {
    Object.entries(settings).forEach(([key, value]) =>
      localStorage.setItem(key, JSON.stringify(value)),
    )
  } catch {
    // Extension storage still persists settings if the localStorage cache is unavailable.
  }
}

function persist(settings: Partial<Pick<VolumeState, 'globalVolume' | 'volumeRules'>>) {
  cacheSettings(settings)
  void chrome.storage.local.set(settings)
}

export const useVolumeStore = create<VolumeState>((set, get) => ({
  ...readLocalSettings(),
  ready: false,
  setGlobalVolume: (value) => {
    const globalVolume = normalizeVolume(value)
    set({ globalVolume })
    persist({ globalVolume })
  },
  saveRule: (id, title, volume) => {
    const volumeRules = {
      ...get().volumeRules,
      [id]: { title, volume: normalizeVolume(volume), isActive: true },
    }
    set({ volumeRules })
    persist({ volumeRules })
  },
  toggleRule: (id) => {
    const rule = get().volumeRules[id]
    if (!rule) return
    const volumeRules = { ...get().volumeRules, [id]: { ...rule, isActive: !rule.isActive } }
    set({ volumeRules })
    persist({ volumeRules })
  },
  updateRuleVolume: (id, volume) => {
    const rule = get().volumeRules[id]
    if (!rule) return
    const volumeRules = { ...get().volumeRules, [id]: { ...rule, volume: normalizeVolume(volume) } }
    set({ volumeRules })
    persist({ volumeRules })
  },
  deleteRule: (id) => {
    const volumeRules = { ...get().volumeRules }
    delete volumeRules[id]
    set({ volumeRules })
    persist({ volumeRules })
  },
}))

export function syncVolumeSettings() {
  const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'local') return
    const settings: Partial<Pick<VolumeState, 'globalVolume' | 'volumeRules'>> = {}
    if (changes.globalVolume) settings.globalVolume = normalizeVolume(changes.globalVolume.newValue)
    if (changes.volumeRules) settings.volumeRules = changes.volumeRules.newValue || {}
    useVolumeStore.setState(settings)
    cacheSettings(settings)
  }
  chrome.storage.onChanged.addListener(onChange)
  chrome.storage.local.get(['globalVolume', 'volumeRules'], (data) => {
    const cached = useVolumeStore.getState()
    const settings = {
      globalVolume:
        data.globalVolume === undefined ? cached.globalVolume : normalizeVolume(data.globalVolume),
      volumeRules: data.volumeRules ?? cached.volumeRules,
    }
    useVolumeStore.setState({ ...settings, ready: true })
    persist(settings)
  })
  return () => chrome.storage.onChanged.removeListener(onChange)
}
