import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forwards to server/index.ts — see docs/DATA.md for why the
      // disruptions feed needs a local proxy (secret API keys, tight
      // upstream rate limits) unlike the rest of this app's direct calls.
      "/api": "http://localhost:8787",
    },
  },
})
