const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawn } = require('node:child_process')
const ts = require('typescript')

const browser = process.env.AUDIO_TEST_BROWSER || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((filename) => fs.existsSync(filename))

test('real Web Audio preserves quiet gain and controls boosted peaks', { skip: !browser, timeout: 30000 }, async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'melomanica-audio-'))
  const process = spawn(browser, [
    '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${path.join(directory, 'profile')}`, '--remote-debugging-pipe',
  ], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] })
  const exited = new Promise((resolve) => process.once('exit', resolve))
  let nextId = 0, pendingText = ''
  const pending = new Map()
  process.stdio[4].on('data', (chunk) => {
    pendingText += chunk.toString()
    let end
    while ((end = pendingText.indexOf('\0')) >= 0) {
      const message = JSON.parse(pendingText.slice(0, end))
      pendingText = pendingText.slice(end + 1)
      const request = pending.get(message.id)
      if (request) {
        pending.delete(message.id)
        message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result)
      }
    }
  })
  const command = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)) }, 20000)
    pending.set(id, {
      resolve: (value) => { clearTimeout(timer); resolve(value) },
      reject: (error) => { clearTimeout(timer); reject(error) },
    })
    process.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + '\0')
  })
  try {
    const code = ts.transpileModule(
      fs.readFileSync('src/contentScript/utils/createOutputLimiter.ts', 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText
    const volumeCode = ts.transpileModule(
      fs.readFileSync('src/types/VolumeRules.ts', 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText
    const bassCode = ts.transpileModule(
      fs.readFileSync('src/contentScript/utils/createUltraBassFilter.ts', 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText
    const expression = `(async () => {
      const exports = {};
      ${code}
      ${volumeCode}
      ${bassCode}
      async function render(amplitude, volume, burst = false, masterVolume = 100, trackVolume = 100, bassEnabled = false, eqGain = 0, frequency = 440, studioEnabled = false) {
        const rate = 48000;
        const context = new OfflineAudioContext(2, rate, rate);
        const source = context.createBufferSource();
        source.buffer = context.createBuffer(2, rate, rate);
        for (let channel = 0; channel < 2; channel++) {
          const data = source.buffer.getChannelData(channel);
          for (let i = 0; i < rate; i++) {
            const loud = !burst || (i >= 12000 && i < 18000);
            data[i] = Math.sin(2 * Math.PI * frequency * i / rate) *
              (loud ? amplitude : 0.01) * (channel === 0 ? 1 : 0.5);
          }
        }
        const gain = context.createGain();
        const levels = exports.getVolumeGains(masterVolume, trackVolume);
        gain.gain.value = volume * levels.boost;
        const master = context.createGain();
        master.gain.value = levels.master;
        master.connect(context.destination);
        const eq = context.createBiquadFilter();
        eq.type = 'peaking'; eq.frequency.value = 32; eq.Q.value = 1.41; eq.gain.value = eqGain;
        const bass = exports.createUltraBassFilter(context);
        exports.setUltraBassEnabled(bass, bassEnabled, 0);
        if (studioEnabled) {
          const preGain = context.createGain(); preGain.gain.value = 2;
          const studio = context.createDynamicsCompressor();
          studio.threshold.value = -30; studio.ratio.value = 4;
          source.connect(preGain); preGain.connect(eq); eq.connect(bass);
          bass.connect(studio); studio.connect(gain);
        } else {
          source.connect(eq); eq.connect(bass); bass.connect(gain);
        }
        gain.connect(exports.createOutputLimiter(context, master));
        source.start();
        const audio = await context.startRendering();
        let peak = 0, energy = 0, ratioError = 0;
        const left = audio.getChannelData(0), right = audio.getChannelData(1);
        for (let i = 0; i < rate; i++) {
          peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
          ratioError = Math.max(ratioError, Math.abs(right[i] - left[i] * 0.5));
          if (i >= 24000 && i < 36000) energy += left[i] ** 2;
        }
        return { peak, rms: Math.sqrt(energy / 12000), ratioError };
      }
        const results = [];
        for (const args of [[0.1, 0], [0.1, 0.5], [0.1, 1], [0.1, 3], [1, 3], [1, 3, true], [1, 10, true]]) {
          results.push(await render(...args));
        }
        for (const level of [25, 50, 0]) results.push(await render(1, 3, false, level));
        for (const level of [0, 25, 200]) results.push(await render(0.1, 1, false, level, 50));
        for (const [enabled, eqGain, frequency, amplitude] of [
          [false, 0, 32, 0.001], [true, 0, 32, 0.001], [true, -12, 32, 0.001],
          [true, 0, 1000, 0.001], [true, 12, 32, 1],
        ]) results.push(await render(amplitude, 1, false, 100, 100, enabled, eqGain, frequency));
        const bassVolume = [];
        for (const studio of [false, true]) {
          const levels = [];
          for (const level of [0, 25, 50, 100, 200, 300]) {
            levels.push(await render(1, 1, false, level, 100, true, 12, 32, studio));
          }
          const trackOverride = await render(1, 1, false, 0, 50, true, 12, 32, studio);
          const trackMuted = await render(1, 1, false, 300, 0, true, 12, 32, studio);
          bassVolume.push({ levels, trackOverride, trackMuted });
        }
        return { results, bassVolume };
    })()`
    const { targetId } = await command('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true })
    const evaluated = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId)
    assert.ok(!evaluated.exceptionDetails, JSON.stringify(evaluated.exceptionDetails))
    const { results: result, bassVolume } = evaluated.result.value
    assert.equal(result[0].peak, 0)
    for (const [index, level] of [[1, 0.05], [2, 0.1], [3, 0.3]]) {
      assert.ok(Math.abs(result[index].rms - level / Math.sqrt(2)) < 0.001,
        `quiet RMS ${result[index].rms} at level ${level}`)
    }
    for (const index of [4, 5, 6]) {
      assert.ok(result[index].peak <= 1, `boosted peak: ${result[index].peak}`)
    }
    for (const rendered of result) assert.ok(rendered.ratioError < 1e-6)
    // With a 100% track level, the global slider controls even hot audio.
    assert.ok(Math.abs(result[7].rms / result[4].rms - 0.25) < 0.001)
    assert.ok(Math.abs(result[8].rms / result[4].rms - 0.5) < 0.001)
    assert.equal(result[9].peak, 0)
    // A non-default track level overrides the global slider, including global 0%.
    for (const index of [10, 11, 12]) {
      assert.ok(Math.abs(result[index].rms - 0.05 / Math.sqrt(2)) < 0.001)
    }
    assert.ok(result[14].rms / result[13].rms > 7, 'Ultra Bass adds more than 16 dB at 32 Hz')
    assert.ok(result[15].rms / result[14].rms < 0.27, 'bass still follows the EQ cut')
    assert.ok(Math.abs(result[16].rms - 0.001 / Math.sqrt(2)) < 0.00001, 'mids remain unchanged')
    assert.ok(result[17].peak <= 1, 'combined maximum EQ and Ultra Bass stay protected')
    for (const { levels, trackOverride, trackMuted } of bassVolume) {
      assert.equal(levels[0].peak, 0, 'global 0% mutes boosted bass')
      assert.equal(trackMuted.peak, 0, 'track 0% mutes boosted bass')
      assert.ok(Math.abs(levels[1].rms / levels[3].rms - 0.25) < 0.001, '25% remains proportional with Ultra Bass')
      assert.ok(Math.abs(levels[2].rms / levels[3].rms - 0.5) < 0.001, '50% remains proportional with Ultra Bass')
      assert.ok(Math.abs(trackOverride.rms / levels[3].rms - 0.5) < 0.001, 'saved track volume still overrides global volume')
      for (let i = 1; i < levels.length; i++) {
        assert.ok(levels[i].rms > levels[i - 1].rms, 'raising volume raises output with Ultra Bass')
        assert.ok(levels[i].peak <= 1, 'volume and Ultra Bass combined remain protected')
      }
    }
  } finally {
    try { await command('Browser.close') } catch { process.kill() }
    await exited
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
