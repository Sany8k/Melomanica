export interface MetronomeSettings {
  bpm: number
  beats: number
  volume: number
  subdivision: number
  note: number
  accentNote: number
}
export const defaults: MetronomeSettings = {
  bpm: 120,
  beats: 4,
  volume: 60,
  subdivision: 1,
  note: 72,
  accentNote: 79,
}
export function normalizeSettings(value: Partial<MetronomeSettings> = {}): MetronomeSettings {
  const bounded = (key: keyof MetronomeSettings, min: number, max: number) =>
    Math.round(
      Math.min(max, Math.max(min, Number.isFinite(value[key]) ? value[key]! : defaults[key])),
    )
  return {
    bpm: bounded('bpm', 30, 300),
    beats: bounded('beats', 1, 12),
    volume: bounded('volume', 0, 100),
    subdivision: [1, 2, 4].includes(value.subdivision!) ? value.subdivision! : 1,
    note: bounded('note', 60, 84),
    accentNote: bounded('accentNote', 60, 84),
  }
}
export interface MetronomeStatus {
  settings: MetronomeSettings
  running: boolean
  beat: number
}
export type MetronomeCommand = 'get' | 'start' | 'stop' | 'update'
