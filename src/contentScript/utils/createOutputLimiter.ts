export function createOutputLimiter(context: BaseAudioContext, destination: AudioNode = context.destination) {
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0;
  limiter.release.value = 0.08;

  const output = context.createGain();
  const makeupDb = -limiter.threshold.value * (1 - 1 / limiter.ratio.value) * 0.6;
  output.gain.value = Math.pow(10, -makeupDb / 20);
  limiter.connect(output);
  output.connect(destination);
  return limiter;
}
