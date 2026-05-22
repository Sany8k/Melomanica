export const parseTimeToSeconds = (timeStr: string): number | null => {
  if (!timeStr.trim()) return null;
  // Заменяем точку, запятую, точку с запятой и пробел на двоеточие
  const normalized = timeStr.trim().replace(/[.,; ]+/g, ':');
  const parts = normalized.split(':');

  if (parts.length === 1) {
    const val = Number(parts[0]);
    return isNaN(val) ? null : val;
  } else if (parts.length === 2) {
    const m = Number(parts[0]);
    const s = Number(parts[1]);
    if (isNaN(m) || isNaN(s)) return null;
    return m * 60 + s;
  }
  return null;
};