import { runWalkthrough } from '../server/geminiCore.ts'
import { makeNodeHandler } from '../server/nodeHandler.ts'

// Production serverless function (Vercel, Node.js runtime). Mirrors the dev Vite
// middleware in server/geminiProxy.ts — both call the shared core. The
// GEMINI_API_KEY is a Vercel project env var; it never reaches the browser.
export default makeNodeHandler(runWalkthrough)
