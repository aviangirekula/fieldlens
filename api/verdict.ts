import { runVerdict } from '../server/geminiCore'
import { makeNodeHandler } from '../server/nodeHandler'

// Fast first-phase endpoint (component + safety verdict only). Production
// serverless function (Vercel, Node.js runtime); mirrors the dev Vite middleware.
export default makeNodeHandler(runVerdict)
