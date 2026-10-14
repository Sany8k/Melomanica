// Runs after the EQ so its band cuts and boosts still shape the bass.
export function createUltraBassFilter(context: BaseAudioContext): BiquadFilterNode {
  const filter = context.createBiquadFilter();
  filter.type = 'lowshelf';
  filter.frequency.value = 110;
  filter.gain.value = 0;
  return filter;
}

export function setUltraBassEnabled(filter: BiquadFilterNode, enabled: boolean, time: number) {
  filter.gain.setTargetAtTime(enabled ? 18 : 0, time, 0.03);
}
