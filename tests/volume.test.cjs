const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function event() {
  const listeners = new Set()
  return {
    addListener: (listener) => listeners.add(listener),
    removeListener: (listener) => listeners.delete(listener),
    emit: (...args) => listeners.forEach((listener) => listener(...args)),
  }
}

function harness(initial = {}, cache = new Map()) {
  const data = structuredClone(initial)
  const pending = []
  const storageChanged = event()
  const connected = event()
  const messages = event()
  const gains = []
  const sources = []
  const compressors = []
  const filters = []
  const chrome = {
    storage: {
      local: {
        get: (keys, callback) =>
          pending.push(() => callback(Object.fromEntries(keys.map((key) => [key, data[key]])))),
        set: (settings) => {
          const changes = {}
          for (const [key, value] of Object.entries(settings)) {
            changes[key] = { oldValue: data[key], newValue: structuredClone(value) }
            data[key] = structuredClone(value)
          }
          storageChanged.emit(changes, 'local')
          return Promise.resolve()
        },
      },
      onChanged: storageChanged,
    },
    runtime: { onConnect: connected, onMessage: messages },
  }
  const node = () => ({
    connections: [],
    connect(target) {
      this.connections.push(target)
    },
    disconnect() {
      this.connections = []
    },
  })
  const media = () => ({
    dataset: {},
    currentTime: 0,
    playbackRate: 1,
    listeners: {},
    addEventListener(name, listener) {
      this.listeners[name] = listener
    },
    play() {},
  })
  let activeMedia = media()
  const window = { location: { search: '?v=track-a' }, setTimeout: () => 1 }
  window.AudioContext = class {
    state = 'running'
    currentTime = 0
    destination = node()
    createGain() {
      const gain = {
        ...node(),
        gain: {
          value: 1,
          setTargetAtTime(value) {
            this.value = value
          },
        },
      }
      gains.push(gain)
      return gain
    }
    createMediaElementSource(element) {
      const source = { ...node(), element }
      sources.push(source)
      return source
    }
    createDynamicsCompressor() {
      const compressor = { ...node(), threshold: {}, knee: {}, ratio: {}, attack: {}, release: {} }
      compressors.push(compressor)
      return compressor
    }
    createBiquadFilter() {
      const filter = { ...node(), frequency: {}, Q: {}, gain: {
        value: 0,
        setTargetAtTime(value) { this.value = value },
      } }
      filters.push(filter)
      return filter
    }
  }
  let mutation
  const globals = {
    chrome,
    window,
    URLSearchParams,
    console,
    localStorage: {
      getItem: (key) => cache.get(key) ?? null,
      setItem: (key, value) => cache.set(key, value),
    },
    document: {
      body: {},
      documentElement: {},
      querySelector: (selector) => (selector === 'video, audio' ? activeMedia : null),
      addEventListener() {},
      removeEventListener() {},
    },
    MutationObserver: class {
      constructor(callback) {
        mutation = callback
      }
      observe() {}
    },
    setTimeout: () => 1,
    clearTimeout() {},
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
  }
  const modules = new Map()
  function load(filename) {
    const absolute = path.resolve(filename)
    if (modules.has(absolute)) return modules.get(absolute).exports
    const module = { exports: {} }
    modules.set(absolute, module)
    const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    vm.runInNewContext(
      code,
      {
        ...globals,
        module,
        exports: module.exports,
        require: (id) =>
          id.startsWith('.') ? load(path.resolve(path.dirname(absolute), `${id}.ts`)) : require(id),
      },
      { filename: absolute },
    )
    return module.exports
  }
  return {
    load,
    chrome,
    data,
    cache,
    sources,
    gains,
    compressors,
    filters,
    flush: () => {
      while (pending.length) pending.shift()()
    },
    level: () => Number((gains[0].gain.value * gains[1].gain.value).toFixed(12)),
    navigate: (id) => {
      window.location.search = id ? `?v=${id}` : ''
      mutation()
    },
    replaceMedia: () => {
      activeMedia = media()
      mutation()
    },
    preview: (id, volume) => {
      const port = { name: 'volume-preview', onMessage: event(), onDisconnect: event() }
      connected.emit(port)
      port.onMessage.emit({ videoId: id, volume })
      return () => port.onDisconnect.emit()
    },
    toggleStudio: () => messages.emit({ action: 'toggle' }, {}, () => {}),
  }
}

const rules = { 'track-a': { title: 'Track A', volume: 180, isActive: true } }

test('Ultra Bass is a persistent extra filter after EQ, independent of Studio Sound', () => {
  const bands = [6, 5, 4, 2, 0, 0, 0, 0, 0, 0]
  const app = harness({ eqBands: bands, ultraBassEnabled: true, isFilterOn: false })
  app.load('src/contentScript/index.ts')
  app.flush()
  const bass = app.filters[10]
  assert.equal(bass.type, 'lowshelf')
  assert.equal(bass.gain.value, 18)
  assert.equal(app.filters[9].connections[0], bass)
  assert.equal(bass.connections[0], app.gains[0])
  assert.deepEqual(app.filters.slice(0, 10).map(filter => filter.gain.value), bands)
  app.chrome.storage.local.set({ eqBands: [-12, -12, -12, 0, 0, 0, 0, 0, 0, 0] })
  assert.equal(app.filters[0].gain.value, -12)
  assert.equal(bass.gain.value, 18)
  app.chrome.storage.local.set({ ultraBassEnabled: false })
  assert.equal(bass.gain.value, 0)
  assert.equal(app.filters[0].gain.value, -12)
  app.chrome.storage.local.set({ ultraBassEnabled: true })
  for (let i = 0; i < 4; i++) app.toggleStudio()
  app.replaceMedia()
  app.flush()
  assert.equal(app.filters.length, 11)
  assert.equal(app.filters[9].connections.length, 1)
  assert.equal(bass.connections.length, 1)
  assert.equal(bass.gain.value, 18)
  const reloaded = harness(app.data)
  reloaded.load('src/contentScript/index.ts')
  reloaded.flush()
  assert.equal(reloaded.filters[10].gain.value, 18)
})

test('Ultra Bass toggle leaves EQ bands and presets intact and survives EQ reset', () => {
  const app = harness()
  const { usePlayerStore } = app.load('src/popup/store/usePlayerStore.ts')
  const player = () => usePlayerStore.getState()
  player().applyPreset('Bass Boost')
  const before = [...player().eqBands]
  player().toggleUltraBass()
  assert.equal(app.data.ultraBassEnabled, true)
  assert.equal(player().activePreset, 'Bass Boost')
  assert.deepEqual([...player().eqBands], before)
  player().resetEq()
  assert.equal(player().ultraBassEnabled, true)
  player().toggleUltraBass()
  assert.equal(app.data.ultraBassEnabled, false)
})

test('non-default saved track volume overrides global volume and restores after reload', () => {
  const app = harness({ globalVolume: 40, volumeRules: rules })
  app.load('src/contentScript/index.ts')
  app.flush()
  assert.equal(app.level(), 1.8)
  app.chrome.storage.local.set({ globalVolume: 70 })
  assert.equal(app.level(), 1.8)
  app.navigate('track-b')
  assert.equal(app.level(), 0.7)
  app.navigate('track-a')
  assert.equal(app.level(), 1.8)
  const reloaded = harness(app.data)
  reloaded.load('src/contentScript/index.ts')
  reloaded.flush()
  assert.equal(reloaded.level(), 1.8)
})

test('disabling and deleting a track rule immediately restore the global level', () => {
  const app = harness({ globalVolume: 40, volumeRules: rules })
  app.load('src/contentScript/index.ts')
  app.flush()
  app.chrome.storage.local.set({
    volumeRules: { 'track-a': { ...rules['track-a'], isActive: false } },
  })
  assert.equal(app.level(), 0.4)
  app.chrome.storage.local.set({ volumeRules: rules })
  assert.equal(app.level(), 1.8)
  app.chrome.storage.local.set({ volumeRules: {} })
  assert.equal(app.level(), 0.4)
})

test('preview expires when popup closes or track changes and a saved preview persists', () => {
  const app = harness({ globalVolume: 50 })
  app.load('src/contentScript/index.ts')
  app.flush()
  const close = app.preview('track-a', 230)
  assert.equal(app.level(), 2.3)
  close()
  assert.equal(app.level(), 0.5)
  app.preview('track-a', 230)
  app.navigate('track-b')
  assert.equal(app.level(), 0.5)
  app.navigate('track-a')
  const closeSaved = app.preview('track-a', 180)
  app.chrome.storage.local.set({ volumeRules: rules })
  closeSaved()
  assert.equal(app.level(), 1.8)
})

test('volume works with Studio Sound off, silence, and replacement media elements', () => {
  const app = harness({ globalVolume: 200, isFilterOn: false })
  app.load('src/contentScript/index.ts')
  app.flush()
  assert.equal(app.level(), 2)
  app.toggleStudio()
  assert.equal(app.level(), 2)
  app.chrome.storage.local.set({ globalVolume: 0 })
  assert.equal(app.level(), 0)
  app.replaceMedia()
  app.flush()
  assert.equal(app.sources.length, 2)
  assert.equal(app.sources[0].connections.length, 0)
  assert.equal(app.sources[1].connections.length, 1)
  assert.equal(app.level(), 0)
})

test('popup settings persist in localStorage and extension storage across reopening', () => {
  const app = harness()
  const { useVolumeStore, syncVolumeSettings } = app.load('src/popup/store/useVolumeStore.ts')
  const unsubscribe = syncVolumeSettings()
  app.flush()
  useVolumeStore.getState().setGlobalVolume(35)
  useVolumeStore.getState().saveRule('track-a', 'Track A', 180)
  assert.equal(JSON.parse(app.cache.get('globalVolume')), 35)
  assert.equal(JSON.parse(app.cache.get('volumeRules'))['track-a'].volume, 180)
  useVolumeStore.getState().toggleRule('track-a')
  assert.equal(app.data.volumeRules['track-a'].isActive, false)
  unsubscribe()
  const reopened = harness(app.data, app.cache)
  const store = reopened.load('src/popup/store/useVolumeStore.ts')
  store.syncVolumeSettings()
  reopened.flush()
  assert.equal(store.useVolumeStore.getState().globalVolume, 35)
  assert.equal(store.useVolumeStore.getState().volumeRules['track-a'].isActive, false)
  store.useVolumeStore.getState().deleteRule('track-a')
  assert.deepEqual(reopened.data.volumeRules, {})
})

test('editing a saved track applies immediately without changing other track levels', () => {
  const app = harness({ globalVolume: 40, volumeRules: rules })
  app.load('src/contentScript/index.ts')
  const { useVolumeStore, syncVolumeSettings } = app.load('src/popup/store/useVolumeStore.ts')
  syncVolumeSettings()
  app.flush()
  useVolumeStore.getState().updateRuleVolume('track-a', 250)
  assert.equal(app.level(), 2.5)
  assert.equal(app.data.volumeRules['track-a'].title, 'Track A')
  assert.equal(app.data.globalVolume, 40)
  app.navigate('track-b')
  assert.equal(app.level(), 0.4)
})

test('editing disabled rules preserves their switch and persists bounded input values', () => {
  const app = harness({ globalVolume: 40, volumeRules: rules })
  const { useVolumeStore, syncVolumeSettings } = app.load('src/popup/store/useVolumeStore.ts')
  syncVolumeSettings()
  app.flush()
  useVolumeStore.getState().toggleRule('track-a')
  useVolumeStore.getState().updateRuleVolume('track-a', -15)
  assert.equal(app.data.volumeRules['track-a'].volume, 0)
  assert.equal(app.data.volumeRules['track-a'].isActive, false)
  useVolumeStore.getState().updateRuleVolume('track-a', 350)
  assert.equal(app.data.volumeRules['track-a'].volume, 300)
  assert.equal(JSON.parse(app.cache.get('volumeRules'))['track-a'].volume, 300)
  assert.equal(app.data.volumeRules['track-a'].isActive, false)
  const reopened = harness(app.data, app.cache)
  const store = reopened.load('src/popup/store/useVolumeStore.ts')
  store.syncVolumeSettings()
  reopened.flush()
  assert.equal(store.useVolumeStore.getState().volumeRules['track-a'].volume, 300)
  assert.equal(store.useVolumeStore.getState().volumeRules['track-a'].isActive, false)
})

test('invalid levels fall back to 100% and out-of-range levels are bounded', () => {
  const app = harness()
  const { normalizeVolume } = app.load('src/types/VolumeRules.ts')
  assert.equal(normalizeVolume(NaN), 100)
  assert.equal(normalizeVolume(Infinity), 100)
  assert.equal(normalizeVolume(-10), 0)
  assert.equal(normalizeVolume(500), 300)
})

test('output protection follows volume with Studio off/on and never duplicates connections', () => {
  const app = harness({ globalVolume: 300, isFilterOn: false })
  app.load('src/contentScript/index.ts')
  app.flush()
  const volume = app.gains[0]
  const limiter = app.compressors[0]
  const master = app.gains[1]
  const output = app.gains[2]
  assert.equal(volume.connections[0], limiter)
  assert.equal(limiter.connections[0], output)
  assert.equal(output.connections[0], master)
  assert.equal(limiter.threshold.value, -6)
  assert.equal(limiter.attack.value, 0)
  for (let i = 0; i < 4; i++) app.toggleStudio()
  app.replaceMedia()
  app.flush()
  assert.equal(volume.connections.length, 1)
  assert.equal(volume.connections[0], limiter)
  assert.equal(limiter.connections.length, 1)
  assert.equal(output.connections.length, 1)
  assert.equal(master.connections.length, 1)
})

test('100% inherits global volume while other saved and preview levels take priority', () => {
  const app = harness({ globalVolume: 100, volumeRules: rules })
  app.load('src/contentScript/index.ts')
  const { useVolumeStore, syncVolumeSettings } = app.load('src/popup/store/useVolumeStore.ts')
  syncVolumeSettings()
  app.flush()
  useVolumeStore.getState().setGlobalVolume(50)
  assert.equal(app.level(), 1.8)
  const close = app.preview('track-a', 250)
  assert.equal(app.level(), 2.5)
  useVolumeStore.getState().setGlobalVolume(25)
  assert.equal(app.level(), 2.5)
  useVolumeStore.getState().setGlobalVolume(0)
  assert.equal(app.level(), 2.5)
  close()
  assert.equal(app.level(), 1.8)
  useVolumeStore.getState().updateRuleVolume('track-a', 100)
  assert.equal(app.level(), 0)
  useVolumeStore.getState().setGlobalVolume(25)
  assert.equal(app.level(), 0.25)
  app.preview('track-a', 50)
  assert.equal(app.level(), 0.5)
  const closeDefault = app.preview('track-a', 100)
  assert.equal(app.level(), 0.25)
  useVolumeStore.getState().setGlobalVolume(100)
  assert.equal(app.level(), 1)
  useVolumeStore.getState().setGlobalVolume(200)
  assert.equal(app.level(), 2)
  closeDefault()
  assert.equal(app.level(), 2)
  useVolumeStore.getState().updateRuleVolume('track-a', 0)
  assert.equal(app.level(), 0)
  useVolumeStore.getState().toggleRule('track-a')
  assert.equal(app.level(), 2)
})
