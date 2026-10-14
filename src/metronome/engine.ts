import { defaults, MetronomeSettings, normalizeSettings } from './settings'

export class MetronomeEngine {
  settings = { ...defaults }
  running = false
  private context: AudioContext | null = null
  private timer: ReturnType<typeof setInterval> | undefined
  private nextTime = 0
  private step = 0
  private voices = new Set<OscillatorNode>()
  private scheduled: { time: number; beat: number }[] = []
  private currentBeat = -1

  get status() {
    if (this.context) {
      while (this.scheduled.length && this.scheduled[0].time <= this.context.currentTime) {
        this.currentBeat = this.scheduled.shift()!.beat
      }
    }
    return {
      settings: { ...this.settings },
      running: this.running,
      beat: this.running ? this.currentBeat : -1,
    }
  }
  async start(settings: MetronomeSettings) {
    this.stop()
    this.settings = normalizeSettings(settings)
    this.context ??= new AudioContext()
    await this.context.resume()
    if (this.context.state !== 'running') throw new Error('Audio context is suspended')
    this.running = true
    this.nextTime = this.context.currentTime + 0.03
    this.schedule()
    this.timer = setInterval(() => this.schedule(), 25)
    return this.status
  }
  update(settings: MetronomeSettings) {
    this.settings = normalizeSettings(settings)
    if (this.running && this.context) {
      this.cancelVoices()
      this.step = 0
      this.nextTime = this.context.currentTime + 0.03
      this.schedule()
    }
    return this.status
  }
  stop() {
    clearInterval(this.timer)
    this.running = false
    this.step = 0
    this.cancelVoices()
    return this.status
  }
  private cancelVoices() {
    this.voices.forEach((voice) => {
      voice.stop()
      voice.disconnect()
    })
    this.voices.clear()
    this.scheduled = []
    this.currentBeat = -1
  }
  private schedule() {
    const context = this.context!
    const { bpm, beats, subdivision, note, accentNote, volume } = this.settings
    if (this.nextTime < context.currentTime) this.nextTime = context.currentTime + 0.01
    while (this.nextTime < context.currentTime + 0.1) {
      const beat = Math.floor(this.step / subdivision)
      const accent = this.step === 0
      const oscillator = context.createOscillator()
      const envelope = context.createGain()
      oscillator.frequency.value = 440 * 2 ** (((accent ? accentNote : note) - 69) / 12)
      oscillator.type = 'sine'
      envelope.gain.setValueAtTime(0, this.nextTime)
      envelope.gain.linearRampToValueAtTime(
        (volume / 100) * (accent ? 0.5 : 0.35),
        this.nextTime + 0.003,
      )
      if (volume > 0) envelope.gain.exponentialRampToValueAtTime(0.0001, this.nextTime + 0.065)
      oscillator.connect(envelope)
      envelope.connect(context.destination)
      this.voices.add(oscillator)
      oscillator.onended = () => {
        this.voices.delete(oscillator)
        oscillator.disconnect()
        envelope.disconnect()
      }
      oscillator.start(this.nextTime)
      oscillator.stop(this.nextTime + 0.07)
      this.status
      this.scheduled.push({ time: this.nextTime, beat })
      this.step = (this.step + 1) % (beats * subdivision)
      this.nextTime += 60 / bpm / subdivision
    }
  }
}
