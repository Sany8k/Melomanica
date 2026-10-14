import { defaults } from '../metronome/settings'

let commands: Promise<unknown> = Promise.resolve()
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message.target !== 'metronome' || sender.id !== chrome.runtime.id || sender.tab) return
  commands = commands
    .catch(() => {})
    .then(async () => {
      const exists = await chrome.offscreen.hasDocument()
      if (!exists && message.command !== 'start')
        return { settings: defaults, running: false, beat: -1 }
      if (!exists) {
        await chrome.offscreen.createDocument({
          url: 'offscreen.html',
          reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
          justification: 'Play the user-started metronome while the popup is closed.',
        })
      }
      return chrome.runtime.sendMessage({ ...message, target: 'metronome-audio' })
    })
  commands.then(reply, () => reply({ error: 'audio' }))
  return true
})
