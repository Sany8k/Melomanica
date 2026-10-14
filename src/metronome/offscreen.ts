import { MetronomeEngine } from './engine'
const engine = new MetronomeEngine()
chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  if (message.target !== 'metronome-audio') return
  if (message.command === 'start') {
    engine.start(message.settings).then(reply, () => reply({ error: 'audio' }))
    return true
  }
  if (message.command === 'stop') reply(engine.stop())
  else if (message.command === 'update') reply(engine.update(message.settings))
  else if (message.command === 'get') reply(engine.status)
})
