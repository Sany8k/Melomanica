export const formatTime = (secs: number | null, fallbackText: string = 'Not set') => {
  if (secs === null) return fallbackText;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};