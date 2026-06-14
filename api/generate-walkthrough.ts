import { runWalkthrough } from '../server/geminiCore'

// Production serverless function (Vercel). Mirrors the dev Vite middleware in
// server/geminiProxy.ts — both call the shared core. GEMINI_API_KEY is set as a
// Vercel project environment variable; it is never shipped to the browser.
// Edge runtime: native Web (Request -> Response) handler; our core only uses
// fetch, so it's fully edge-compatible and has fast cold starts.
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
  const result = await runWalkthrough(apiKey, payload.image, payload.mimeType || 'image/jpeg')
  return json(result.status, result.body)
}
