import { defineManifest } from '@crxjs/vite-plugin'
import packageData from '../package.json'

//@ts-ignore
const isDev = process.env.NODE_ENV == 'development'

export default defineManifest({
  name: `${packageData.displayName || packageData.name}${isDev ? ` ➡️ Dev` : ''}`,
  description: packageData.description,
  version: packageData.version,
  manifest_version: 3,
  icons: {
    16: 'icons/melomanica_logo16.png',
    32: 'icons/melomanica_logo32.png',
    48: 'icons/melomanica_logo48.png',
    128: 'icons/melomanica_logo128.png',
  },
  action: {
    default_popup: 'popup.html',
    default_icon: 'icons/melomanica_logo48.png',
  },
  content_scripts: [
    {
      "matches": ["*://music.youtube.com/*",
        "*://www.youtube.com/*"],
      js: ['src/contentScript/index.ts'],
    },
  ],
  web_accessible_resources: [
    {
      resources: ['icons/melomanica_logo16.png', 'icons/melomanica_logo32.png', 'icons/melomanica_logo48.png', 'icons/melomanica_logo128.png'],
      matches: [],
    },
  ],
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  host_permissions: [
    "*://music.youtube.com/*",
    "*://www.youtube.com/*",
    "http://localhost:5173/*",
  ],
})
