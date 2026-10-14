// This safety stage must follow BOTH the EQ/Studio processing and the volume gain.
// Unlike Studio Sound, it only compresses peaks close to the output ceiling.
export function createOutputLimiter(context: BaseAudioContext, destination: AudioNode = context.destination) {
  const limiter = context.createDynamicsCompressor();
  // Leave headroom for transient overshoot when EQ and volume boosts combine.
  limiter.threshold.value = -6;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0;
  limiter.release.value = 0.08;

  // Web Audio compressors add automatic makeup gain. Cancel it so quiet audio
  // keeps the requested volume, rather than being boosted by the safety stage.
  const output = context.createGain();
  const makeupDb = -limiter.threshold.value * (1 - 1 / limiter.ratio.value) * 0.6;
  output.gain.value = Math.pow(10, -makeupDb / 20);
  limiter.connect(output);
  output.connect(destination);
  return limiter;
}
