import { runVerdict } from '../server/geminiCore.ts'
import { makeNodeHandler } from '../server/nodeHandler.ts'

// Fast first-phase endpoint (component + safety verdict only). Production
// serverless function (Vercel, Node.js runtime); mirrors the dev Vite middleware.
export default makeNodeHandler(runVerdict)
