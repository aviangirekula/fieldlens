import type { IncomingMessage, ServerResponse } from 'node:http'
import type { CoreResult } from './geminiCore'

// Builds a standard Vercel Node.js serverless handler (req, res) around a core
// runner. Reads GEMINI_API_KEY from process.env (Vercel project env var). Used
// by api/*.ts in production; the dev path uses server/geminiProxy.ts instead.

type Runner = (
  apiKey: string,
  image: string,
  mimeType: string,
) => Promise<CoreResult<unknown>>

function readStream(req: IncomingMessage, limit = 12 * 1024 * 1024): Promise<string> {
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

export function makeNodeHandler(run: Runner) {
  return async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const send = (status: number, body: unknown) => {
      res.statusCode = status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(body))
    }
    if (req.method !== 'POST') return send(405, { error: 'Method not allowed.' })

    // Vercel may have already parsed the JSON body into req.body; otherwise read
    // the raw stream ourselves.
    let payload: { image?: string; mimeType?: string }
    const pre = (req as IncomingMessage & { body?: unknown }).body
    if (pre && typeof pre === 'object') {
      payload = pre as { image?: string; mimeType?: string }
    } else {
      let raw: string
      try {
        raw = typeof pre === 'string' ? pre : await readStream(req)
      } catch {
        return send(413, { error: 'Image is too large.' })
      }
      try {
        payload = JSON.parse(raw)
      } catch {
        return send(400, { error: 'Invalid request body.' })
      }
    }
    if (!payload?.image) return send(400, { error: 'No image provided.' })

    const result = await run(
      process.env.GEMINI_API_KEY || '',
      payload.image,
      payload.mimeType || 'image/jpeg',
    )
    return send(result.status, result.body)
  }
}
