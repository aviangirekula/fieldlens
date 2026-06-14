import type { Plugin } from 'vite'
import { loadEnv } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { runWalkthrough, runVerdict, type CoreResult } from './geminiCore.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Vite dev/preview middleware. Thin wrapper around server/geminiCore.ts so the
// dev server and the production serverless function (api/*.ts) share one
// implementation. GEMINI_API_KEY is read here, server-side, never shipped to the
// browser.
// ─────────────────────────────────────────────────────────────────────────────

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage, limit = 12 * 1024 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > limit) {
        reject(new Error('too-large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  apiKey: string,
  run: (key: string, image: string, mimeType: string) => Promise<CoreResult<unknown>>,
  label: string,
) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' })
  let raw: string
  try {
    raw = await readBody(req)
  } catch {
    return send(res, 413, { error: 'Image is too large.' })
  }
  let payload: { image?: string; mimeType?: string }
  try {
    payload = JSON.parse(raw)
  } catch {
    return send(res, 400, { error: 'Invalid request body.' })
  }
  if (!payload.image) return send(res, 400, { error: 'No image provided.' })

  const startedAt = Date.now()
  const result = await run(apiKey, payload.image, payload.mimeType || 'image/jpeg')
  const comp =
    result.status === 200 && result.body && typeof result.body === 'object' && 'component' in result.body
      ? (result.body as { component: string }).component
      : 'error'
  console.log(`[gemini:${label}] ${comp} in ${Date.now() - startedAt}ms`)
  return send(res, result.status, result.body)
}

export function geminiProxy(): Plugin {
  let apiKey = ''
  const install = (use: (path: string, fn: (req: IncomingMessage, res: ServerResponse) => void) => void) => {
    use('/api/generate-walkthrough', (req, res) => void handle(req, res, apiKey, runWalkthrough, 'full'))
    use('/api/verdict', (req, res) => void handle(req, res, apiKey, runVerdict, 'verdict'))
  }
  return {
    name: 'gemini-proxy',
    config(_config, { mode }) {
      // '' prefix loads ALL env vars (incl. process.env), not just VITE_* ones,
      // so GEMINI_API_KEY stays server-only and out of the client bundle.
      const env = loadEnv(mode, process.cwd(), '')
      apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''
    },
    configureServer(server) {
      install((path, fn) => server.middlewares.use(path, fn))
    },
    configurePreviewServer(server) {
      install((path, fn) => server.middlewares.use(path, fn))
    },
  }
}
