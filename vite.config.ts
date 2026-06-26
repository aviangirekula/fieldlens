import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { geminiProxy } from './server/geminiProxy.ts'

// HTTPS is required for camera access on any origin other than localhost
// (e.g. your phone hitting the laptop's LAN IP). basicSsl generates a
// self-signed cert so `vite --host` serves over https on the network too.
//
// geminiProxy adds a server-side /api/generate-walkthrough endpoint that holds
// the GEMINI_API_KEY (never shipped to the browser).
export default defineConfig({
  // FL_NO_SSL=1 serves plain HTTP on localhost (for headless screenshot tooling).
  // Default keeps the self-signed cert so the camera works over the LAN.
  plugins: [react(), ...(process.env.FL_NO_SSL ? [] : [basicSsl()]), geminiProxy()],
  server: {
    host: true, // listen on 0.0.0.0 so phones on the same Wi-Fi can connect
    port: 5173,
  },
})
