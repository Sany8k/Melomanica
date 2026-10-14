const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function loader(globals = {}) {
  const cache = new Map()
  function load(filename) {
    const absolute = path.resolve(filename)
    if (cache.has(absolute)) return cache.get(absolute).exports
    const module = { exports: {} }
    cache.set(absolute, module)
    const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    vm.runInNewContext(code, {
      ...globals,
      module,
      exports: module.exports,
      require: (id) => load(path.resolve(path.dirname(absolute), `${id}.ts`)),
    })
    return module.exports
  }
  return load
}

test('preset edits remain drafts across reopen until explicitly saved', () => {
  const load = loader()
  const { readDraft, savePreset } = load('src/metronome/presets.ts')
  let draft = savePreset(readDraft({ getItem: () => null }), 'a')
  assert.equal(draft.name, 'Preset 1')
  draft = { ...draft, name: 'Practice', settings: { ...draft.settings, bpm: 90, beats: 3 } }
  const reopened = readDraft({ getItem: () => JSON.stringify(draft) })
  assert.equal(reopened.settings.bpm, 90)
  assert.equal(reopened.presets[0].settings.bpm, 120)
  assert.equal(reopened.presets[0].name, 'Preset 1')
  const saved = savePreset(reopened, 'unused')
  assert.equal(saved.presets.length, 1)
  assert.equal(saved.presets[0].id, 'a')
  assert.equal(saved.presets[0].settings.bpm, 90)
  assert.equal(saved.presets[0].name, 'Practice')
  saved.settings.bpm = 150
  assert.equal(saved.presets[0].settings.bpm, 90)
  const next = savePreset({ ...saved, selected: null, name: '   ' }, 'b')
  assert.equal(next.name, 'Preset 2')
  const deleted = { ...next, presets: next.presets.filter((p) => p.id !== 'b') }
  assert.equal(readDraft({ getItem: () => JSON.stringify(deleted) }).selected, null)
  assert.equal(savePreset({ ...deleted, selected: null, name: '' }, 'c').name, 'Preset 3')
})

test('corrupt storage and out-of-range settings recover safely', () => {
  const load = loader()
  const { readDraft } = load('src/metronome/presets.ts')
  const { normalizeSettings } = load('src/metronome/settings.ts')
  assert.equal(readDraft({ getItem: () => '{' }).settings.bpm, 120)
  assert.equal(
    readDraft({
      getItem: () => {
        throw Error('storage')
      },
    }).presets.length,
    0,
  )
  const settings = normalizeSettings({ bpm: 999, beats: -1, volume: NaN, note: 0, subdivision: 3 })
  assert.equal(settings.bpm, 300)
  assert.equal(settings.beats, 1)
  assert.equal(settings.volume, 60)
  assert.equal(settings.note, 60)
  assert.equal(settings.subdivision, 1)
})

function audioHarness() {
  let interval
  let context
  const voices = []
  const envelopes = []
  class AudioContext {
    state = 'running'
    currentTime = 0
    destination = {}
    constructor() {
      context = this
    }
    async resume() {}
    createOscillator() {
      const node = {
        frequency: {},
        connect() {},
        disconnect() {},
        start(time) {
          this.startTime = time
        },
        stop(time) {
          this.stopTime = time
          this.stopCalls = (this.stopCalls || 0) + 1
        },
      }
      voices.push(node)
      return node
    }
    createGain() {
      const events = []
      const node = {
        events,
        connect() {},
        disconnect() {},
        gain: {
          setValueAtTime: (v, t) => events.push([v, t]),
          linearRampToValueAtTime: (v, t) => events.push([v, t]),
          exponentialRampToValueAtTime: (v, t) => events.push([v, t]),
        },
      }
      envelopes.push(node)
      return node
    }
  }
  const load = loader({
    AudioContext,
    setInterval: (fn) => {
      interval = fn
      return 1
    },
    clearInterval: () => {
      interval = null
    },
  })
  const { MetronomeEngine } = load('src/metronome/engine.ts')
  return {
    engine: new MetronomeEngine(),
    voices,
    envelopes,
    advance: (time) => {
      context.currentTime = time
      interval?.()
    },
    tick: () => interval,
  }
}

test('audio clock preserves BPM, subdivisions, bar accents and selected pitches without popup', async () => {
  const app = audioHarness()
  await app.engine.start({
    bpm: 120,
    beats: 3,
    volume: 50,
    subdivision: 2,
    note: 69,
    accentNote: 81,
  })
  for (let i = 1; i <= 65; i++) app.advance(i * 0.025)
  assert.equal(app.voices[0].frequency.value, 880)
  assert.equal(app.voices[1].frequency.value, 440)
  assert.ok(Math.abs(app.voices[1].startTime - app.voices[0].startTime - 0.25) < 1e-9)
  assert.equal(app.voices[6].frequency.value, 880)
  assert.equal(app.envelopes[0].events[1][0], 0.25)
  assert.equal(app.engine.status.running, true)
  assert.equal(app.engine.status.beat, 0)
})

test('updates cancel queued clicks, mute is silent, delayed timers avoid bursts, stop cancels audio', async () => {
  const app = audioHarness()
  await app.engine.start({
    bpm: 300,
    beats: 4,
    volume: 60,
    subdivision: 4,
    note: 72,
    accentNote: 79,
  })
  const queued = [...app.voices]
  app.engine.update({ ...app.engine.settings, volume: 0 })
  assert.ok(queued.every((v) => v.stopCalls === 2))
  for (const envelope of app.envelopes.slice(queued.length))
    assert.ok(envelope.events.every((e) => e[0] === 0))
  const before = app.voices.length
  app.advance(10)
  assert.ok(app.voices.length - before <= 2)
  assert.ok(app.voices.slice(before).every((v) => v.startTime >= 10))
  app.engine.stop()
  assert.equal(app.tick(), null)
  assert.equal(app.engine.status.beat, -1)
  assert.equal(app.engine.status.running, false)
})

test('background serializes creation, survives worker restart, and never starts on status requests', async () => {
  let listener
  let documentExists = false
  let creations = 0
  const sent = []
  const chrome = {
    runtime: {
      id: 'extension',
      onMessage: {
        addListener: (fn) => {
          listener = fn
        },
      },
      sendMessage: async (message) => {
        sent.push(message)
        return { running: message.command !== 'stop' }
      },
    },
    offscreen: {
      Reason: { AUDIO_PLAYBACK: 'AUDIO_PLAYBACK' },
      hasDocument: async () => documentExists,
      createDocument: async () => {
        creations++
        documentExists = true
      },
    },
  }
  loader({ chrome })('src/background/index.ts')
  const send = (command) =>
    new Promise((resolve) =>
      listener({ target: 'metronome', command }, { id: 'extension' }, resolve),
    )
  assert.equal((await send('get')).running, false)
  assert.equal(creations, 0)
  await Promise.all([send('start'), send('update'), send('get')])
  assert.equal(creations, 1)
  assert.deepEqual(
    sent.map((m) => m.command),
    ['start', 'update', 'get'],
  )
  loader({ chrome })('src/background/index.ts')
  assert.equal((await send('get')).running, true)
  assert.equal(creations, 1)
  assert.equal(
    listener({ target: 'metronome', command: 'start' }, { id: 'extension', tab: {} }, () => {}),
    undefined,
  )
})
