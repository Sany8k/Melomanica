export interface VolumeRule {
  title: string
  volume: number
  isActive: boolean
}

export type VolumeRules = Record<string, VolumeRule>

export const DEFAULT_VOLUME = 100
export const MAX_VOLUME = 300

export function normalizeVolume(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(MAX_VOLUME, Math.max(0, value))
    : DEFAULT_VOLUME
}

// 100% means inherit the global level; other active track levels override it.
export function getEffectiveVolume(
  globalVolume: number,
  rules: VolumeRules,
  videoId: string | null,
): number {
  const rule = videoId ? rules[videoId] : undefined
  return resolveVolume(globalVolume, rule?.isActive ? rule.volume : DEFAULT_VOLUME)
}

function resolveVolume(globalVolume: number, trackVolume: number) {
  const track = normalizeVolume(trackVolume)
  return track === DEFAULT_VOLUME ? normalizeVolume(globalVolume) : track
}

export function getVolumeGains(globalVolume: number, trackVolume: number) {
  const master = resolveVolume(globalVolume, trackVolume) / 100
  return {
    // Boost before protection; attenuate after it so limiting cannot undo it.
    boost: Math.max(1, master),
    master: Math.min(1, master),
  }
}
