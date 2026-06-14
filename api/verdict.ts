import { runVerdict } from '../server/geminiCore'

// Fast first-phase endpoint (component + safety verdict only). Production
// serverless function (Vercel); mirrors the dev Vite middleware. Edge runtime —
// native Web handler, fast cold starts, only uses fetch.
export const config = { runtime: 'edge' }

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' })
  let payload: { image?: string; mimeType?: string }
  try {
    payload = (await req.json()) as { image?: string; mimeType?: string }
  } catch {
    return json(400, { error: 'Invalid request body.' })
  }
  if (!payload?.image) return json(400, { error: 'No image provided.' })
  const apiKey = process.env.GEMINI_API_KEY || ''
  const result = await runVerdict(apiKey, payload.image, payload.mimeType || 'image/jpeg')
  return json(result.status, result.body)
}
